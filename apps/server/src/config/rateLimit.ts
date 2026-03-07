import { RateLimitRequestHandler, rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { securityLogger } from "../observability/securityLogger.js";

const redisUrl = process.env.REDIS_URL;

let redisClient: Redis | undefined;

if (redisUrl) {
  redisClient = new Redis(redisUrl, { enableReadyCheck: false });
  redisClient.on("error", (error) => {
    securityLogger.logEvent("rate_limit_redis_error", {
      message: error.message,
    });
  });
}

export const createRateLimiter = (): RateLimitRequestHandler => {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) =>
      (req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown").toString(),
    handler: (req, res) => {
      securityLogger.logEvent("rate_limit_block", {
        ip: req.ip,
        path: req.originalUrl,
      });
      res.status(429).json({
        error: "Too many requests. Please slow down.",
      });
    },
    store:
      redisClient && redisClient.status !== "end"
        ? new RedisStore({
            sendCommand: (...args: string[]) => {
              const command = args[0];
              if (typeof command !== "string") {
                throw new Error("Redis command must be a string");
              }
              return redisClient!.call(command, ...args.slice(1)) as any;
            },
          })
        : undefined,
  });

  return limiter;
};
