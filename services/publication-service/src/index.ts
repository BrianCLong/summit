/**
 * Publication Service
 *
 * REST API for workflow management, dissemination, and publication
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { workflowRoutes } from './routes/workflows.js';
import { disseminationRoutes } from './routes/dissemination.js';

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'publication-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/dissemination', disseminationRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Publication Service listening on port ${PORT}`);
});

export default app;
