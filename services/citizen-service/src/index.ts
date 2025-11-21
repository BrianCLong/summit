import express from 'express';
import pino from 'pino';
import citizenRoutes from './routes/citizen.js';

const logger = pino({ name: 'citizen-service' });
const app = express();
const PORT = process.env.PORT || 4010;

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'citizen-service' });
});

// API routes
app.use('/api/v1', citizenRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Citizen Service running on port ${PORT}`);
  logger.info('Real-time citizen-centric service automation enabled');
});

export { app };
