import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import { routerV1 } from "./routes/v1";
import { errorHandler } from "./middleware/error";

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(
  pinoHttp({
    logger,
    redact: { paths: ["req.headers.authorization", "req.headers.cookie"], remove: true }
  })
);

app.use("/v1", routerV1);
app.use(errorHandler);

export default app;