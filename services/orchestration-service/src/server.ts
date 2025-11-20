/**
 * Orchestration Service - REST API for workflow management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createWorkflowRouter } from './api/workflow-routes.js';
import { createScheduleRouter } from './api/schedule-routes.js';
import { createMonitoringRouter } from './api/monitoring-routes.js';
import { OrchestrationController } from './controllers/OrchestrationController.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Create orchestration controller
const orchestrationController = new OrchestrationController();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// API routes
app.use('/api/workflows', createWorkflowRouter(orchestrationController));
app.use('/api/schedules', createScheduleRouter(orchestrationController));
app.use('/api/monitoring', createMonitoringRouter(orchestrationController));

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Orchestration service listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  orchestrationController.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  orchestrationController.shutdown();
  process.exit(0);
});
