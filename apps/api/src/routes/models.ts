import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

// Model catalog - in MVP this is seeded data
const MODEL_CATALOG = [
  {
    id: "llama-3.1-8b",
    hfId: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    displayName: "Llama 3.1 8B Instruct",
    description:
      "Meta's latest instruction-tuned model. Excellent for general tasks.",
    parameters: 8_000_000_000,
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 8192,
    license: "llama3.1",
    tags: ["chat", "instruct", "general"],
    pricingTier: "small",
    pricing: {
      inputPer1k: 0.00015,
      outputPer1k: 0.0006,
    },
  },
  {
    id: "llama-3.1-70b",
    hfId: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    displayName: "Llama 3.1 70B Instruct",
    description: "Larger Llama model with superior reasoning and instruction following.",
    parameters: 70_000_000_000,
    minGpuTier: "a100",
    supportedEngines: ["vllm"],
    defaultEngine: "vllm",
    contextLength: 8192,
    license: "llama3.1",
    tags: ["chat", "instruct", "reasoning"],
    pricingTier: "large",
    pricing: {
      inputPer1k: 0.0009,
      outputPer1k: 0.0036,
    },
  },
  {
    id: "mistral-7b",
    hfId: "mistralai/Mistral-7B-Instruct-v0.2",
    displayName: "Mistral 7B Instruct",
    description: "Fast and efficient model from Mistral AI.",
    parameters: 7_000_000_000,
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 8192,
    license: "apache-2.0",
    tags: ["chat", "instruct", "fast"],
    pricingTier: "small",
    pricing: {
      inputPer1k: 0.00015,
      outputPer1k: 0.0006,
    },
  },
  {
    id: "codellama-34b",
    hfId: "codellama/CodeLlama-34b-Instruct-hf",
    displayName: "Code Llama 34B",
    description: "Specialized model for code generation and understanding.",
    parameters: 34_000_000_000,
    minGpuTier: "4090",
    supportedEngines: ["vllm"],
    defaultEngine: "vllm",
    contextLength: 16384,
    license: "llama2",
    tags: ["code", "instruct", "programming"],
    pricingTier: "medium",
    pricing: {
      inputPer1k: 0.0003,
      outputPer1k: 0.0012,
    },
  },
  {
    id: "qwen2-7b",
    hfId: "Qwen/Qwen2-7B-Instruct",
    displayName: "Qwen2 7B Instruct",
    description: "Alibaba's multilingual model with strong performance.",
    parameters: 7_000_000_000,
    minGpuTier: "3060",
    supportedEngines: ["vllm", "ollama"],
    defaultEngine: "vllm",
    contextLength: 32768,
    license: "apache-2.0",
    tags: ["chat", "multilingual", "long-context"],
    pricingTier: "small",
    pricing: {
      inputPer1k: 0.00015,
      outputPer1k: 0.0006,
    },
  },
];

// GPU tiers with availability (mock data for MVP)
const GPU_TIERS = [
  {
    id: "3060",
    name: "RTX 3060",
    vram: 12,
    available: 150,
    pricePerHour: 0.15,
  },
  {
    id: "4070",
    name: "RTX 4070",
    vram: 12,
    available: 80,
    pricePerHour: 0.25,
  },
  {
    id: "4090",
    name: "RTX 4090",
    vram: 24,
    available: 45,
    pricePerHour: 0.45,
  },
  {
    id: "a100",
    name: "A100 40GB",
    vram: 40,
    available: 20,
    pricePerHour: 1.5,
  },
  {
    id: "h100",
    name: "H100 80GB",
    vram: 80,
    available: 5,
    pricePerHour: 3.0,
  },
];

export const modelRoutes: FastifyPluginAsync = async (app) => {
  // List all models
  app.get("/", async (request, reply) => {
    const { tag, minGpu, search } = z
      .object({
        tag: z.string().optional(),
        minGpu: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(request.query);

    let models = [...MODEL_CATALOG];

    if (tag) {
      models = models.filter((m) => m.tags.includes(tag));
    }

    if (search) {
      const q = search.toLowerCase();
      models = models.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    return {
      models,
      gpuTiers: GPU_TIERS,
    };
  });

  // Get single model
  app.get("/:modelId", async (request, reply) => {
    const { modelId } = z
      .object({ modelId: z.string() })
      .parse(request.params);

    const model = MODEL_CATALOG.find((m) => m.id === modelId);

    if (!model) {
      return reply.notFound("Model not found");
    }

    // Find compatible GPU tiers
    const tierOrder = ["3060", "4070", "4090", "a100", "h100"];
    const minIndex = tierOrder.indexOf(model.minGpuTier);
    const compatibleTiers = GPU_TIERS.filter(
      (t) => tierOrder.indexOf(t.id) >= minIndex
    );

    return {
      model,
      compatibleGpuTiers: compatibleTiers,
    };
  });

  // Estimate cost for deployment
  app.post("/:modelId/estimate", async (request, reply) => {
    const { modelId } = z
      .object({ modelId: z.string() })
      .parse(request.params);

    const { gpuTier, replicas, hoursPerMonth } = z
      .object({
        gpuTier: z.string(),
        replicas: z.number().int().min(1).max(10).default(1),
        hoursPerMonth: z.number().default(720), // 24/7
      })
      .parse(request.body);

    const model = MODEL_CATALOG.find((m) => m.id === modelId);
    const gpu = GPU_TIERS.find((t) => t.id === gpuTier);

    if (!model || !gpu) {
      return reply.badRequest("Invalid model or GPU tier");
    }

    const monthlyCompute = gpu.pricePerHour * hoursPerMonth * replicas;

    return {
      modelId,
      gpuTier,
      replicas,
      hoursPerMonth,
      estimate: {
        computePerMonth: monthlyCompute,
        currency: "USD",
        breakdown: {
          gpuHourlyRate: gpu.pricePerHour,
          totalGpuHours: hoursPerMonth * replicas,
        },
        note: "Actual costs may vary based on usage and market conditions",
      },
    };
  });
};
