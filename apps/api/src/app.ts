import express from 'express';
import { ReceiptSigner } from '@intelgraph/receipt-signer';

import {
  InMemoryReceiptRepository,
  type ReceiptRepository,
  createReceiptRouter,
} from './routes/receipts/get.js';

export interface ApiDependencies {
  signer: ReceiptSigner;
  repository?: ReceiptRepository;
}

export function buildApp(deps: ApiDependencies) {
  const app = express();
  const repository =
    deps.repository ?? new InMemoryReceiptRepository([]);

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.use(
    '/receipts',
    createReceiptRouter({
      repository,
      signer: deps.signer,
    }),
  );

  return app;
}
