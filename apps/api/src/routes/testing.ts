import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import {
  createTestSuite,
  getTestSuites,
  getTestSuite,
  updateTestSuite,
  deleteTestSuite,
  createTestCase,
  getTestCases,
  updateTestCase,
  deleteTestCase,
  toggleTestCase,
  runTestSuite,
  getTestRuns,
  getTestRun,
  cancelTestRun,
  getTestStats,
} from "../services/testing.js";

// ============================================
// Testing Framework Routes
// ============================================

export async function testingRoutes(app: FastifyInstance) {
  // Apply auth middleware to all routes
  app.addHook("preHandler", authMiddleware);

  // ============================================
  // Test Suite Endpoints
  // ============================================

  /**
   * List test suites
   */
  app.get<{
    Querystring: {
      agentId?: string;
      limit?: string;
      offset?: string;
    };
  }>("/suites", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { agentId, limit, offset } = request.query;

      const result = await getTestSuites(orgId, {
        agentId,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Get a test suite
   */
  app.get<{
    Params: { suiteId: string };
  }>("/suites/:suiteId", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId } = request.params;

      const suite = await getTestSuite(orgId, suiteId);

      if (!suite) {
        return reply.status(404).send({ error: "Test suite not found" });
      }

      return reply.send({ success: true, data: suite });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Create a test suite
   */
  app.post<{
    Body: {
      agentId: string;
      name: string;
      description?: string;
      timeout?: number;
      retries?: number;
      parallel?: boolean;
      tags?: string[];
    };
  }>("/suites", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const suite = await createTestSuite(orgId, request.body);

      return reply.status(201).send({ success: true, data: suite });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Update a test suite
   */
  app.patch<{
    Params: { suiteId: string };
    Body: {
      name?: string;
      description?: string;
      timeout?: number;
      retries?: number;
      parallel?: boolean;
      tags?: string[];
    };
  }>("/suites/:suiteId", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId } = request.params;

      const suite = await updateTestSuite(orgId, suiteId, request.body);

      return reply.send({ success: true, data: suite });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Delete a test suite
   */
  app.delete<{
    Params: { suiteId: string };
  }>("/suites/:suiteId", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId } = request.params;

      await deleteTestSuite(orgId, suiteId);

      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // ============================================
  // Test Case Endpoints
  // ============================================

  /**
   * List test cases in a suite
   */
  app.get<{
    Params: { suiteId: string };
  }>("/suites/:suiteId/cases", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId } = request.params;

      const cases = await getTestCases(orgId, suiteId);

      return reply.send({ success: true, data: cases });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Create a test case
   */
  app.post<{
    Params: { suiteId: string };
    Body: {
      name: string;
      description?: string;
      inputType: "message" | "conversation" | "api";
      input: any;
      assertionType: string;
      expected: any;
      tolerance?: number;
      priority?: number;
      tags?: string[];
      customScript?: string;
    };
  }>("/suites/:suiteId/cases", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId } = request.params;

      const testCase = await createTestCase(orgId, suiteId, request.body as any);

      return reply.status(201).send({ success: true, data: testCase });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Update a test case
   */
  app.patch<{
    Params: { suiteId: string; caseId: string };
    Body: {
      name?: string;
      description?: string;
      inputType?: "message" | "conversation" | "api";
      input?: any;
      assertionType?: string;
      expected?: any;
      tolerance?: number;
      priority?: number;
      tags?: string[];
      customScript?: string;
    };
  }>("/suites/:suiteId/cases/:caseId", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId, caseId } = request.params;

      const testCase = await updateTestCase(orgId, suiteId, caseId, request.body as any);

      return reply.send({ success: true, data: testCase });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Delete a test case
   */
  app.delete<{
    Params: { suiteId: string; caseId: string };
  }>("/suites/:suiteId/cases/:caseId", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId, caseId } = request.params;

      await deleteTestCase(orgId, suiteId, caseId);

      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Toggle a test case enabled/disabled
   */
  app.post<{
    Params: { suiteId: string; caseId: string };
    Body: { isEnabled: boolean };
  }>("/suites/:suiteId/cases/:caseId/toggle", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId, caseId } = request.params;
      const { isEnabled } = request.body;

      const testCase = await toggleTestCase(orgId, suiteId, caseId, isEnabled);

      return reply.send({ success: true, data: testCase });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // ============================================
  // Test Run Endpoints
  // ============================================

  /**
   * Run a test suite
   */
  app.post<{
    Params: { suiteId: string };
    Body: {
      deploymentId?: string;
    };
  }>("/suites/:suiteId/run", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const userId = request.user!.id;
      const { suiteId } = request.params;
      const { deploymentId } = request.body;

      const run = await runTestSuite(orgId, suiteId, {
        deploymentId,
        triggeredBy: "manual",
        triggeredById: userId,
      });

      return reply.status(202).send({
        success: true,
        data: run,
        message: "Test run started",
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * List test runs
   */
  app.get<{
    Params: { suiteId: string };
    Querystring: {
      limit?: string;
      offset?: string;
      status?: string;
    };
  }>("/suites/:suiteId/runs", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId } = request.params;
      const { limit, offset, status } = request.query;

      const result = await getTestRuns(orgId, suiteId, {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        status,
      });

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Get a test run
   */
  app.get<{
    Params: { suiteId: string; runId: string };
  }>("/suites/:suiteId/runs/:runId", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId, runId } = request.params;

      const run = await getTestRun(orgId, suiteId, runId);

      if (!run) {
        return reply.status(404).send({ error: "Test run not found" });
      }

      return reply.send({ success: true, data: run });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Cancel a test run
   */
  app.post<{
    Params: { suiteId: string; runId: string };
  }>("/suites/:suiteId/runs/:runId/cancel", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { suiteId, runId } = request.params;

      const run = await cancelTestRun(orgId, suiteId, runId);

      return reply.send({ success: true, data: run, message: "Test run cancelled" });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // ============================================
  // Stats Endpoints
  // ============================================

  /**
   * Get testing stats
   */
  app.get<{
    Querystring: { agentId?: string };
  }>("/stats", async (request, reply) => {
    try {
      const orgId = request.user!.orgId;
      const { agentId } = request.query;

      const stats = await getTestStats(orgId, agentId);

      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
