import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import {
  createAgentVersion,
  getAgentVersions,
  getAgentVersion,
  getLatestVersion,
  rollbackToVersion,
  compareVersions,
  deleteVersion,
  getVersionHistory,
  tagVersion,
  publishVersion,
} from "../services/versioning.js";

// ============================================
// Versioning Routes
// ============================================

export async function versioningRoutes(app: FastifyInstance) {
  // Apply auth middleware to all routes
  app.addHook("preHandler", authMiddleware);

  // ============================================
  // Version Management
  // ============================================

  /**
   * Create a new version of an agent
   */
  app.post<{
    Params: { agentId: string };
    Body: {
      changeLog?: string;
      changeType?: "major" | "minor" | "patch";
      tags?: string[];
    };
  }>("/agents/:agentId/versions", async (request, reply) => {
    try {
      const { agentId } = request.params;
      const userId = request.user!.id;

      const version = await createAgentVersion(agentId, userId, request.body);

      return reply.status(201).send(version);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Get all versions of an agent
   */
  app.get<{
    Params: { agentId: string };
    Querystring: { limit?: string; offset?: string };
  }>("/agents/:agentId/versions", async (request, reply) => {
    try {
      const { agentId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : 20;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;

      const result = await getAgentVersions(agentId, { limit, offset });

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Get version history with diffs
   */
  app.get<{
    Params: { agentId: string };
    Querystring: { limit?: string };
  }>("/agents/:agentId/history", async (request, reply) => {
    try {
      const { agentId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;

      const history = await getVersionHistory(agentId, limit);

      return reply.send(history);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Get a specific version
   */
  app.get<{
    Params: { agentId: string; version: string };
  }>("/agents/:agentId/versions/:version", async (request, reply) => {
    try {
      const { agentId, version } = request.params;

      const versionData = await getAgentVersion(agentId, version);

      if (!versionData) {
        return reply.status(404).send({ error: "Version not found" });
      }

      return reply.send(versionData);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Get the latest version
   */
  app.get<{
    Params: { agentId: string };
  }>("/agents/:agentId/versions/latest", async (request, reply) => {
    try {
      const { agentId } = request.params;

      const versionData = await getLatestVersion(agentId);

      if (!versionData) {
        return reply.status(404).send({ error: "No versions found" });
      }

      return reply.send(versionData);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Compare two versions
   */
  app.get<{
    Params: { agentId: string };
    Querystring: { from: string; to: string };
  }>("/agents/:agentId/compare", async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { from, to } = request.query;

      if (!from || !to) {
        return reply
          .status(400)
          .send({ error: "Both 'from' and 'to' versions are required" });
      }

      const diff = await compareVersions(agentId, from, to);

      return reply.send(diff);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Rollback to a specific version
   */
  app.post<{
    Params: { agentId: string; version: string };
  }>("/agents/:agentId/versions/:version/rollback", async (request, reply) => {
    try {
      const { agentId, version } = request.params;
      const userId = request.user!.id;

      const newVersion = await rollbackToVersion(agentId, version, userId);

      return reply.send(newVersion);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Tag a version
   */
  app.post<{
    Params: { agentId: string; version: string };
    Body: { tags: string[] };
  }>("/agents/:agentId/versions/:version/tag", async (request, reply) => {
    try {
      const { agentId, version } = request.params;
      const { tags } = request.body;

      if (!tags || !Array.isArray(tags)) {
        return reply.status(400).send({ error: "Tags array is required" });
      }

      const versionData = await tagVersion(agentId, version, tags);

      return reply.send(versionData);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Publish a version
   */
  app.post<{
    Params: { agentId: string; version: string };
  }>("/agents/:agentId/versions/:version/publish", async (request, reply) => {
    try {
      const { agentId, version } = request.params;

      const versionData = await publishVersion(agentId, version);

      return reply.send(versionData);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  /**
   * Delete a version
   */
  app.delete<{
    Params: { agentId: string; version: string };
  }>("/agents/:agentId/versions/:version", async (request, reply) => {
    try {
      const { agentId, version } = request.params;

      await deleteVersion(agentId, version);

      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
