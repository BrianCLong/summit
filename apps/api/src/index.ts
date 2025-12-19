import express from 'express';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { createReceiptRouter } from './routes/receipts';
import { ReceiptStore } from './routes/receipts/store';

const logger = pino({ name: 'api' });
const app = express();
app.use(express.json());

const store = new ReceiptStore();

app.use('/receipts', createReceiptRouter(store, logger));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] === currentModulePath) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => logger.info({ port }, 'API listening'));
}

export { app, store };
