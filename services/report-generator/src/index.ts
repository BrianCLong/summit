/**
 * Report Generator Service
 *
 * REST API for generating intelligence reports and briefings
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { reportRoutes } from './routes/reports.js';
import { templateRoutes } from './routes/templates.js';
import { briefingRoutes } from './routes/briefings.js';

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'report-generator',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/reports', reportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/briefings', briefingRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Report Generator Service listening on port ${PORT}`);
});

export default app;
