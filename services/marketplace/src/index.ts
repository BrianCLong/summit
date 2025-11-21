import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger.js';
import { productRoutes } from './routes/products.js';
import { transactionRoutes } from './routes/transactions.js';
import { consentRoutes } from './routes/consent.js';
import { providerRoutes } from './routes/providers.js';
import { riskRoutes } from './routes/risk.js';
import { healthRoutes } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check (no auth)
app.use('/health', healthRoutes);

// Protected routes
app.use('/api/v1/products', authMiddleware, productRoutes);
app.use('/api/v1/transactions', authMiddleware, transactionRoutes);
app.use('/api/v1/consent', authMiddleware, consentRoutes);
app.use('/api/v1/providers', authMiddleware, providerRoutes);
app.use('/api/v1/risk', authMiddleware, riskRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Marketplace service running on port ${PORT}`);
});

export default app;
