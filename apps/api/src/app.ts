import express from 'express';

import {
  GetReceiptDependencies,
  createGetReceiptRouter,
} from './routes/receipts/get';

export interface ApiDependencies extends GetReceiptDependencies {}

export function buildApp(dependencies: ApiDependencies) {
  const app = express();
  app.use(express.json());

  app.use('/receipts', createGetReceiptRouter(dependencies));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api' });
  });

  return app;
}
