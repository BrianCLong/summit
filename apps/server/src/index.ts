import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import RedisStoreFactory from "connect-redis";
import Redis from "ioredis";
import { readFileSync } from "fs";
import { createRateLimiter } from "./config/rateLimit.js";
import { securityHeaders, extraSecurityHeaders } from "./config/security.js";
import { dropResolvers } from "./graphql/resolvers/drop.js";
import { scoreboardResolvers } from "./graphql/resolvers/scoreboard.js";
import { fetchSecret } from "./security/vault.js";
import { securityLogger } from "./observability/securityLogger.js";

const typeDefs = [
  readFileSync(new URL("./graphql/schemas/drop.graphql", import.meta.url), "utf8"),
  readFileSync(new URL("./graphql/schemas/scoreboard.graphql", import.meta.url), "utf8"),
];

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Query: {
      ...dropResolvers.Query,
      ...scoreboardResolvers.Query,
    },
    Mutation: {
      ...dropResolvers.Mutation,
      ...scoreboardResolvers.Mutation,
    },
    DomainScoreboard: scoreboardResolvers.DomainScoreboard,
    DomainMetrics: scoreboardResolvers.DomainMetrics,
  },
});

const startServer = async () => {
  await server.start();

  const app = express();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((o) => o.trim()),
      credentials: true,
    })
  );

  app.use(securityHeaders());
  app.use(extraSecurityHeaders);
  app.use(createRateLimiter() as any);
  app.use(bodyParser.json({ limit: "2mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "2mb" }));

  const redisUrl = process.env.REDIS_URL;
  const redisClient = redisUrl ? new Redis(redisUrl, { enableReadyCheck: false }) : undefined;
  const RedisStore = RedisStoreFactory(session);
  const sessionSecret =
    (await fetchSecret("session_secret", process.env.SESSION_SECRET || "")) || "change-me";

  if (sessionSecret === "change-me") {
    securityLogger.logEvent("session_warning", {
      level: "warn",
      message: "Session secret fallback in use. Configure Vault or SESSION_SECRET.",
    });
  }

  app.use(
    session({
      store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60, // 1 hour
      },
      name: process.env.SESSION_COOKIE_NAME || "drop.sid",
    })
  );

  app.use("/healthz", (_req, res) => res.json({ status: "ok" }));

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        ip: req.ip,
        sessionId: (req as any).sessionID,
      }),
    })
  );

  const port = Number(process.env.PORT) || 4001;
  app.listen(port, () => {
    console.log(`🚀 Drop Gateway ready at http://localhost:${port}/graphql`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start Drop Gateway server", error);
});
