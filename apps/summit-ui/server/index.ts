/**
 * Summit Code UI – Express server
 *
 * Serves the API under /api/* and static Vite build under /.
 * Port defaults to 3741 (configurable via SUMMIT_UI_PORT env var).
 */
import express, { type Express, type Request, type Response } from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { promptsRouter }   from './routes/prompts.js';
import { artifactsRouter } from './routes/artifacts.js';
import { dashboardRouter } from './routes/dashboard.js';
import { releaseRouter }   from './routes/release.js';
import { metricsMiddleware, renderPrometheus } from './utils/metrics.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(metricsMiddleware);

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api/prompts',   promptsRouter);
  app.use('/api/artifacts', artifactsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/release',   releaseRouter);

  // ── Observability ─────────────────────────────────────────────────────────
  app.get('/metrics', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(renderPrometheus());
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Static files (production) ─────────────────────────────────────────────
  const distDir = join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  // SPA fallback
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(join(distDir, 'index.html'));
  });

  return app;
}

// Start server only when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp();
  app.listen(PORT, () => {
    console.info(`Summit Code UI server running on http://localhost:${PORT}`);
    console.info(`Metrics: http://localhost:${PORT}/metrics`);
    console.info(`Health:  http://localhost:${PORT}/health`);
  });
}
