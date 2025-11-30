/**
 * Federation Service Server
 *
 * Express server for cross-org intel exchange.
 */

import express from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import routes from './api/routes.js';

const logger = pino({ name: 'federation-service' });
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// CORS (in production, configure properly)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Partner-Id, X-Request-Id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.use(routes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 4100;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Federation service started');
});

export default app;
