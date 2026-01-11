import type { FastifyPluginAsync } from "fastify";
import {
  createCustomDomain,
  getCustomDomains,
  getCustomDomain,
  updateCustomDomain,
  deleteCustomDomain,
  verifyDomain,
  toggleDomain,
  getDomainEvents,
  getDomainStats,
  reverifyDomain,
  checkSslStatus,
  renewSsl,
} from "../services/domains.js";

export const domainsRoutes: FastifyPluginAsync = async (app) => {
  // Get domain statistics
  app.get("/stats", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const stats = await getDomainStats(request.user.orgId);
      return { success: true, data: stats };
    },
  });

  // List custom domains
  app.get("/", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const query = request.query as {
        targetType?: string;
        targetId?: string;
        isActive?: string;
        limit?: string;
        offset?: string;
      };

      const result = await getCustomDomains(request.user.orgId, {
        targetType: query.targetType,
        targetId: query.targetId,
        isActive:
          query.isActive === "true" ? true : query.isActive === "false" ? false : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });

      return { success: true, data: result };
    },
  });

  // Create custom domain
  app.post("/", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const body = request.body as {
        domain: string;
        targetType: "agent" | "deployment";
        targetId: string;
        forceHttps?: boolean;
        headers?: Record<string, string>;
      };

      try {
        const domain = await createCustomDomain(request.user.orgId, body);
        return { success: true, data: domain, message: "Domain created successfully" };
      } catch (error) {
        const msg = (error as Error).message;
        if (
          msg === "Invalid domain format" ||
          msg === "Domain already registered" ||
          msg === "Agent not found" ||
          msg === "Deployment not found"
        ) {
          return app.httpErrors.badRequest(msg);
        }
        throw error;
      }
    },
  });

  // Get single domain
  app.get("/:id", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };

      try {
        const domain = await getCustomDomain(id, request.user.orgId);
        return { success: true, data: domain };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });

  // Update domain
  app.patch("/:id", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        forceHttps?: boolean;
        headers?: Record<string, string>;
        isPrimary?: boolean;
      };

      try {
        const domain = await updateCustomDomain(id, request.user.orgId, body);
        return { success: true, data: domain, message: "Domain updated successfully" };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });

  // Delete domain
  app.delete("/:id", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };

      try {
        await deleteCustomDomain(id, request.user.orgId);
        return { success: true, message: "Domain deleted successfully" };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });

  // Verify domain ownership
  app.post("/:id/verify", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };

      try {
        const result = await verifyDomain(id, request.user.orgId);
        return { success: true, data: result };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });

  // Re-verify domain (get new token)
  app.post("/:id/reverify", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };

      try {
        const result = await reverifyDomain(id, request.user.orgId);
        return {
          success: true,
          data: result,
          message: "New verification token generated",
        };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });

  // Toggle domain active status
  app.post("/:id/toggle", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as { isActive: boolean };

      try {
        const domain = await toggleDomain(id, request.user.orgId, body.isActive);
        return {
          success: true,
          data: domain,
          message: body.isActive ? "Domain activated" : "Domain deactivated",
        };
      } catch (error) {
        const msg = (error as Error).message;
        if (msg === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        if (
          msg === "Domain must be verified before activation" ||
          msg === "SSL certificate must be active before activation"
        ) {
          return app.httpErrors.badRequest(msg);
        }
        throw error;
      }
    },
  });

  // Get SSL status
  app.get("/:id/ssl", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };

      try {
        const status = await checkSslStatus(id, request.user.orgId);
        return { success: true, data: status };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });

  // Renew SSL certificate
  app.post("/:id/ssl/renew", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };

      try {
        const result = await renewSsl(id, request.user.orgId);
        return { success: true, data: result };
      } catch (error) {
        const msg = (error as Error).message;
        if (msg === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        if (msg === "Domain must be verified before SSL renewal") {
          return app.httpErrors.badRequest(msg);
        }
        throw error;
      }
    },
  });

  // Get domain events
  app.get("/:id/events", {
    onRequest: [app.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const query = request.query as {
        limit?: string;
        offset?: string;
      };

      try {
        const result = await getDomainEvents(id, request.user.orgId, {
          limit: query.limit ? parseInt(query.limit) : undefined,
          offset: query.offset ? parseInt(query.offset) : undefined,
        });
        return { success: true, data: result };
      } catch (error) {
        if ((error as Error).message === "Domain not found") {
          return app.httpErrors.notFound("Domain not found");
        }
        throw error;
      }
    },
  });
};
