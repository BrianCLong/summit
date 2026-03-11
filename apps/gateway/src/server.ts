import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { ApolloGateway, RemoteGraphQLDataSource } from "@apollo/gateway";
import { security } from "./security";
import { policyGuard } from "./middleware/policyGuard";
import searchRouter from "./routes/search";
import { logger } from "./logger";
import yaml from "yaml";
import { readFileSync } from "fs";
import path from "path";

const PORT = process.env.PORT || 8080;

async function startGateway() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(security);
  
  // Routes
  app.use(searchRouter);
  
  // Health
  app.get("/healthz", (_req, res) => res.json({ ok: true, service: "gateway", timestamp: new Date() }));
  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date() }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "api", timestamp: new Date() }));

  // GraphQL Gateway setup
  let subgraphConfig;
  try {
    const configPath = path.join(process.cwd(), "subgraphs.yaml");
    subgraphConfig = yaml.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    logger.warn("No subgraphs.yaml found, using default configuration");
    subgraphConfig = {
      subgraphs: {
        server: { url: process.env.SERVER_URL || "http://server:4000/graphql" },
      }
    };
  }

  const gateway = new ApolloGateway({
    serviceList: Object.entries(subgraphConfig.subgraphs).map(([name, config]: any) => ({
      name,
      url: config.url
    })),
    buildService({ url }) {
      return new RemoteGraphQLDataSource({
        url,
        willSendRequest({ request, context }: any) {
          // Forward headers
          if (context.headers) {
            Object.entries(context.headers).forEach(([key, value]) => {
              if (['authorization', 'x-tenant-id', 'x-request-id'].includes(key.toLowerCase())) {
                request.http?.headers.set(key, value as string);
              }
            });
          }
        }
      });
    }
  });

  const server = new ApolloServer({
    gateway,
    introspection: process.env.NODE_ENV !== "production"
  });

  await server.start();

  app.use(
    "/graphql",
    policyGuard,
    expressMiddleware(server, {
      context: async ({ req }) => ({ headers: req.headers })
    }) as any
  );

  app.listen(PORT, () => {
    logger.info(`Summit Gateway running on port ${PORT}`);
    logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
}

startGateway().catch(err => {
  console.error("Failed to start gateway", err);
  process.exit(1);
});
