/**
 * NLP Service - REST API
 *
 * Production-ready NLP API with comprehensive text analytics
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createNLPRouter } from './routes/nlp';
import { createEntityRouter } from './routes/entities';
import { createSentimentRouter } from './routes/sentiment';
import { createTopicRouter } from './routes/topics';
import { createSummaryRouter } from './routes/summarization';
import { errorHandler } from './middleware/error-handler';
import { logger } from './middleware/logger';

const app = express();
const PORT = process.env.NLP_SERVICE_PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(logger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'nlp-service', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/nlp', createNLPRouter());
app.use('/api/entities', createEntityRouter());
app.use('/api/sentiment', createSentimentRouter());
app.use('/api/topics', createTopicRouter());
app.use('/api/summarization', createSummaryRouter());

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NLP Service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
});

export default app;
