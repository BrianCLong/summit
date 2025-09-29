import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { Server as IOServer } from "socket.io";
import { cfg } from "./config";
import { initDeps, closeDeps } from "./runtime/deps";
import { startOtel, isOtelStarted } from './otel';
// import { requestId } from "./middleware/requestId";
// import { mountAssistant } from "./routes/assistant";
import { mountGraphQL } from "./graphql/index.js";
import { reg } from "./telemetry/metrics";

let ready = false;

async function main() {
  console.log('[STARTUP] IntelGraph server starting...');
  // Optional OpenTelemetry startup
  if (process.env.OTEL_ENABLED === '1' || process.env.NODE_ENV === 'production') {
    try { await startOtel(); console.log('[STARTUP] OpenTelemetry initialized'); } catch (e) { console.warn('[STARTUP] OTEL init failed:', e); }
  }
  
  const app = express();
  const server = http.createServer(app);
  const io = new IOServer(server, { 
    cors: { origin: cfg.CORS_ORIGIN, credentials: true } 
  });

  // Basic middleware
  app.use(cors({ origin: cfg.CORS_ORIGIN, credentials: true }));
  app.use(bodyParser.json({ limit: "1mb" }));

  // Health endpoints
  app.get('/healthz', (_req, res) => res.status(200).send('ok'));
  app.get('/readyz', (_req, res) => {
    res.status(ready ? 200 : 503).send(ready ? 'ready' : 'starting');
  });

  // Metrics endpoint
  app.get("/metrics", async (_req, res) => {
    res.type(reg.contentType).send(await reg.metrics());
  });
  // Lightweight OTEL status endpoint for quick checks
  app.get('/tracez', (_req, res) => {
    res.status(200).json({ otelEnabled: isOtelStarted() });
  });

  // Start HTTP server
  await new Promise<void>((resolve) => {
    server.listen(cfg.PORT, () => {
      console.log(`[STARTUP] HTTP server listening on :${cfg.PORT}`);
      resolve();
    });
  });

  try {
    // Initialize dependencies
    await initDeps();
    
    // Mount GraphQL and other services
    await mountGraphQL(app);
    // mountAssistant(app, io);
    
    // Flip readiness flag
    ready = true;
    console.log('[STARTUP] Server ready - all systems operational');
    
  } catch (error) {
    console.error('[STARTUP] Failed to initialize dependencies:', error);
    process.exit(1);
  }

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`[SHUTDOWN] ${signal} received - starting graceful shutdown`);
    ready = false;
    
    try {
      await closeDeps();
      server.close(() => {
        console.log('[SHUTDOWN] Server closed gracefully');
        process.exit(0);
      });
    } catch (error) {
      console.error('[SHUTDOWN] Error during shutdown:', error);
      process.exit(1);
    }
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('[SHUTDOWN] Force exit - shutdown timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[STARTUP] Fatal error:', error);
  process.exit(1);
});
