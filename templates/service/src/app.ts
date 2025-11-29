import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import healthRoutes from './routes/health.js';
import metricsRoutes from './routes/metrics.js';

const app = express();

// Request logging with correlation ID
app.use(pinoHttp({ logger }));

app.use(express.json());

// Routes
app.use('/', healthRoutes);
app.use('/', metricsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

export default app;
