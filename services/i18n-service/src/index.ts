import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import type { TranslationServiceConfig } from './types/index.js';
import { getTranslationService } from './lib/translation-service.js';
import apiRoutes from './api/routes.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

/**
 * Create and configure Express app
 */
export function createApp(config: TranslationServiceConfig) {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    next();
  });

  // API routes
  app.use('/api', apiRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'i18n-service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        translate: 'POST /api/translate',
        translateBatch: 'POST /api/translate/batch',
        detect: 'POST /api/detect',
        metrics: 'GET /api/metrics',
        health: 'GET /api/health',
      },
    });
  });

  return app;
}

/**
 * Start the i18n service
 */
export async function startService(
  config?: Partial<TranslationServiceConfig>
) {
  const serviceConfig: TranslationServiceConfig = {
    defaultProvider: (process.env.TRANSLATION_PROVIDER as any) || 'mock',
    googleApiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
    supportedLanguages: [
      'en',
      'fr',
      'de',
      'es',
      'it',
      'pt',
      'nl',
      'da',
      'no',
      'sv',
      'fi',
      'pl',
      'cs',
      'ar',
      'he',
      'zh',
      'ja',
      'ko',
    ],
    enableCache: process.env.ENABLE_CACHE === 'true',
    cacheTTL: parseInt(process.env.CACHE_TTL || '3600', 10),
    maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH || '10000', 10),
    ...config,
  };

  // Initialize translation service
  await getTranslationService(serviceConfig);

  // Create app
  const app = createApp(serviceConfig);

  // Start server
  const port = parseInt(process.env.PORT || '3100', 10);
  const server = app.listen(port, () => {
    logger.info(`i18n-service listening on port ${port}`);
    logger.info(`Provider: ${serviceConfig.defaultProvider}`);
    logger.info(`Cache enabled: ${serviceConfig.enableCache}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  return { app, server };
}

// Export all modules
export * from './types/index.js';
export * from './lib/language-detector.js';
export * from './lib/translation-service.js';
export * from './lib/translation-provider.js';
export * from './lib/metrics.js';
export * from './config/supported-languages.js';
export * from './config/translation-policies.js';

// Start service if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startService().catch((error) => {
    logger.error(error, 'Failed to start service');
    process.exit(1);
  });
}
