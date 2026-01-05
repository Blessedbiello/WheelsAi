import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { createLogger } from "../utils/logger.js";
import { prisma } from "@wheelsai/db";
import { PRICING_TIERS, calculateTokenCost } from "@wheelsai/shared";

const logger = createLogger("inference-routes");

// ============================================
// Types
// ============================================

interface NodeInfo {
  id: string;
  url: string;
  healthStatus: string;
  latencyMs: number | null;
}

// ============================================
// Schemas
// ============================================

const chatCompletionSchema = z.object({
  model: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  max_tokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
});

// ============================================
// Routes
// ============================================

export const inferenceRoutes: FastifyPluginAsync = async (app) => {
  /**
   * OpenAI-compatible chat completions endpoint
   * GET/POST /v1/:deploymentSlug/chat/completions
   */
  app.post(
    "/v1/:deploymentSlug/chat/completions",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { deploymentSlug } = z
        .object({ deploymentSlug: z.string() })
        .parse(request.params);
      const body = chatCompletionSchema.parse(request.body);
      const { orgId } = request.auth!;

      // 1. Find deployment
      const deployment = await prisma.deployment.findFirst({
        where: {
          slug: deploymentSlug,
          orgId,
          status: "running",
        },
        include: {
          nodes: {
            where: {
              healthStatus: "healthy",
            },
          },
          model: true,
        },
      });

      if (!deployment) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Deployment '${deploymentSlug}' not found or not running`,
        });
      }

      // 2. Check credit balance
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { orgId },
      });

      const minBalance = 10; // 10 cents minimum
      if (!creditBalance || creditBalance.balanceCents < minBalance) {
        return reply.status(402).send({
          error: "Payment Required",
          message: "Insufficient credits. Please add more credits to continue.",
          balance: creditBalance?.balanceCents ?? 0,
        });
      }

      // 3. Select healthy node
      const node = selectNode(deployment.nodes as NodeInfo[]);
      if (!node) {
        return reply.status(503).send({
          error: "Service Unavailable",
          message: "No healthy nodes available for this deployment",
        });
      }

      // 4. Proxy request to node
      const startTime = Date.now();
      let response: Response;
      let responseBody: any;

      try {
        response = await proxyToNode(node.url, body, request);
        responseBody = await response.json();
      } catch (error) {
        logger.error({ error, nodeUrl: node.url }, "Node request failed");

        // Mark node as unhealthy
        await prisma.deploymentNode.update({
          where: { id: node.id },
          data: { healthStatus: "unhealthy" },
        });

        return reply.status(502).send({
          error: "Bad Gateway",
          message: "Failed to reach inference node",
        });
      }

      const latencyMs = Date.now() - startTime;

      // 5. Calculate and deduct credits
      const usage = responseBody.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
      };

      const costCents = calculateTokenCost(
        usage.prompt_tokens,
        usage.completion_tokens,
        deployment.model.pricingTier as keyof typeof PRICING_TIERS
      );

      // Deduct credits
      await prisma.$transaction([
        prisma.creditBalance.update({
          where: { orgId },
          data: {
            balanceCents: {
              decrement: costCents,
            },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            orgId,
            amountCents: -costCents,
            type: "usage",
            description: `Inference: ${deployment.name}`,
            referenceId: deployment.id,
            balanceAfter: creditBalance.balanceCents - BigInt(costCents),
          },
        }),
      ]);

      // 6. Record usage metrics (async, non-blocking)
      recordUsage(orgId, deployment.id, usage, latencyMs).catch((err) =>
        logger.error({ err }, "Failed to record usage")
      );

      // 7. Return response
      return responseBody;
    }
  );

  /**
   * List models endpoint (OpenAI compatible)
   */
  app.get("/v1/models", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.auth!;

    const deployments = await prisma.deployment.findMany({
      where: {
        orgId,
        status: "running",
      },
      include: {
        model: true,
      },
    });

    const models = deployments.map((d) => ({
      id: d.slug,
      object: "model",
      created: Math.floor(d.createdAt.getTime() / 1000),
      owned_by: "wheelsai",
      permission: [],
      root: d.model.hfId,
      parent: null,
    }));

    return {
      object: "list",
      data: models,
    };
  });
};

// ============================================
// Helper Functions
// ============================================

function selectNode(nodes: NodeInfo[]): NodeInfo | null {
  if (nodes.length === 0) return null;

  // Filter to healthy nodes
  const healthyNodes = nodes.filter((n) => n.healthStatus === "healthy");
  if (healthyNodes.length === 0) return null;

  // Weighted random selection based on latency
  // Lower latency = higher weight
  const maxLatency = Math.max(...healthyNodes.map((n) => n.latencyMs ?? 1000));
  const weights = healthyNodes.map((n) => maxLatency - (n.latencyMs ?? 500) + 100);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let random = Math.random() * totalWeight;
  for (let i = 0; i < healthyNodes.length; i++) {
    random -= weights[i]!;
    if (random <= 0) {
      return healthyNodes[i]!;
    }
  }

  return healthyNodes[0]!;
}

async function proxyToNode(
  nodeUrl: string,
  body: any,
  request: FastifyRequest
): Promise<Response> {
  const targetUrl = `${nodeUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward authorization if present (for nodes that need it)
  const authHeader = request.headers.authorization;
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function recordUsage(
  orgId: string,
  deploymentId: string,
  usage: { prompt_tokens: number; completion_tokens: number },
  latencyMs: number
): Promise<void> {
  // Get current hour boundary
  const now = new Date();
  const periodStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours()
  );
  const periodEnd = new Date(periodStart.getTime() + 60 * 60 * 1000);

  // Upsert usage record
  await prisma.usageRecord.upsert({
    where: {
      orgId_deploymentId_periodStart: {
        orgId,
        deploymentId,
        periodStart,
      },
    },
    create: {
      orgId,
      deploymentId,
      periodStart,
      periodEnd,
      requestCount: 1,
      inputTokens: BigInt(usage.prompt_tokens),
      outputTokens: BigInt(usage.completion_tokens),
      totalLatencyMs: BigInt(latencyMs),
      errorCount: 0,
      costCents: BigInt(0), // Calculated separately
    },
    update: {
      requestCount: { increment: 1 },
      inputTokens: { increment: usage.prompt_tokens },
      outputTokens: { increment: usage.completion_tokens },
      totalLatencyMs: { increment: latencyMs },
    },
  });
}
