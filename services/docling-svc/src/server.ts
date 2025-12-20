import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { loadConfig } from './config.js';
import { DoclingHandler } from './handlers/docling-handler.js';
import { provenanceEmitter } from './provenance/ledger.js';

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });

import { Express } from 'express';

export const createApp = (): Express => {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use(
    pinoHttp({
      logger: logger as any,
      customSuccessMessage: () => 'docling-request',
      autoLogging: true,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.bytes',
          'req.body.text',
          'res.body.result',
          'res.body.fallback',
        ],
        censor: '[redacted]',
      },
    }),
  );

  const handler = new DoclingHandler();

  app.post('/v1/parse', handler.parse);
  app.post('/v1/summarize', handler.summarize);
  app.post('/v1/extract', handler.extract);
  app.get('/healthz', (_req, res) => {
    res.json({
      status: 'ok',
      modelId: config.GRANITE_DOCLING_MODEL_ID,
      cacheEntries: handler.cacheSize(),
      timestamp: new Date().toISOString(),
    });
  });
  app.get('/metrics', handler.metrics);

  provenanceEmitter.on('provenance', (event) => {
    logger.debug({ event }, 'provenance-event');
  });

  return app;
};

export const startServer = () => {
  const app = createApp();

  let server: https.Server | http.Server;
  if (config.MTLS_ENABLED === 'true') {
    const options = {
      key: fs.readFileSync(config.MTLS_KEY_PATH || ''),
      cert: fs.readFileSync(config.MTLS_CERT_PATH || ''),
      ca: config.MTLS_CA_PATH
        ? fs.readFileSync(config.MTLS_CA_PATH)
        : undefined,
      requestCert: true,
      rejectUnauthorized: true,
    };
    server = https.createServer(options, app);
  } else {
    server = http.createServer(app);
  }

  server.listen(config.port, config.HOST, () => {
    logger.info({ port: config.port }, 'docling-svc started');
  });

  return server;
};
