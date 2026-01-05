import { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "wheelsai-api",
      version: "0.1.0",
    };
  });

  app.get("/ready", async (request, reply) => {
    // Check database connection
    try {
      // TODO: Add actual DB health check
      // await prisma.$queryRaw`SELECT 1`;

      return {
        status: "ready",
        checks: {
          database: "ok",
          redis: "ok",
        },
      };
    } catch (error) {
      reply.status(503);
      return {
        status: "not_ready",
        error: "Database connection failed",
      };
    }
  });

  app.get("/live", async () => {
    return { status: "alive" };
  });
};
