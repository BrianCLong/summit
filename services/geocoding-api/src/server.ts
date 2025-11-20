/**
 * Geocoding API Server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import geocodingRoutes from './routes/geocoding.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/geocoding', geocodingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'IntelGraph Geocoding API',
    version: '1.0.0',
    endpoints: {
      geocode: 'GET /api/geocoding/geocode?address=<address>',
      reverse: 'GET /api/geocoding/reverse?lat=<lat>&lon=<lon>',
      batch: 'POST /api/geocoding/batch',
      ipLookup: 'GET /api/geocoding/ip/:ip',
      ipBatch: 'POST /api/geocoding/ip/batch',
      health: 'GET /api/geocoding/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌍 Geocoding API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Provider: ${process.env.GEOCODING_PROVIDER || 'nominatim'}`);
});

export default app;
