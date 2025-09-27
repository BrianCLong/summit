import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { metricsRouter, registerDefaultMetrics } from "./metrics";
import { fetchAndCacheMetrics, metricsCache } from "./metricsFetcher";
import { eventsRouter, opsBus } from "./events";
import { planRoute } from "./routes/plan";
import { execRouter } from "./routes/execute";
import { ragRouter } from "./routes/rag";
import { ghRouter } from "./routes/github";
import { securityMiddleware, cspDirectives } from "./security";
import { loadPolicy, watchPolicy } from "./policy";
import "./otel"; // Import to activate OpenTelemetry instrumentation

const PORT = Number(process.env.PORT || 8787);
const app = express();

app.use(express.json({ limit: "2mb" }));
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
app.use(securityMiddleware);
app.use(cors({
  origin: (origin, cb) => {
    const allow = (process.env.CORS_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173").split(',');
    if (!origin || allow.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked"));
  },
  credentials: false
}));

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives(),
  },
}));

// Health & burndown passthroughs (plug into your existing impls if you already have them)
app.get("/status/health.json", (_req, res) => {
  res.json({
    services: { litellm: true, ollama: true },
    policy_loaded: !!loadPolicy()._loadedAt,
    generated_at: new Date().toISOString(),
  });
});

app.get("/status/burndown.json", (_req, res) => {
  // placeholder window buckets; your existing generator can replace this
  res.json({
    generated_at: new Date().toISOString(),
    windows: { m1: {}, h1: {}, d1: {} },
  });
});

// Feature routers
app.use("/metrics", metricsRouter);
app.use("/events", eventsRouter);
app.use("/route/plan", planRoute);
app.set('policy', loadPolicy());
app.use("/route/execute", execRouter);
app.use("/rag", ragRouter);
app.use("/integrations/github", ghRouter);

registerDefaultMetrics();
fetchAndCacheMetrics();
setInterval(fetchAndCacheMetrics, 60 * 1000); // Every 1 minute
watchPolicy((p) => {
  opsBus.emit({ type: "policy.update", policy_hash: p._hash, at: Date.now() });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Symphony operator kit listening on :${PORT}`);
});
