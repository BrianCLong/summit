/**
 * Catalog Service API Server
 * REST API for data catalog operations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { catalogRouter } from './routes/catalogRoutes.js';
import { glossaryRouter } from './routes/glossaryRoutes.js';
import { searchRouter } from './routes/searchRoutes.js';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { lineageRouter } from './routes/lineageRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.CATALOG_SERVICE_PORT || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'catalog-service' });
});

// API Routes
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/glossary', glossaryRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/lineage', lineageRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Catalog Service listening on port ${PORT}`);
});

export default app;
