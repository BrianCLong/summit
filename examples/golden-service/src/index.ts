import express from "express";
import { collectDefaultMetrics, register } from "prom-client";
import winston from "winston";

const app = express();
const port = process.env.PORT || 3000;
const SERVICE_NAME = "golden-service";

// Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: SERVICE_NAME },
  transports: [new winston.transports.Console()],
});

// Metrics
collectDefaultMetrics({ labels: { service: SERVICE_NAME } });

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/", (req, res) => {
  logger.info("Root endpoint called");
  res.send(`Hello from ${SERVICE_NAME}`);
});

app.listen(port, () => {
  logger.info(`Service ${SERVICE_NAME} listening on port ${port}`);
});
