import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KafkaAdapter } from './adapters/kafkaAdapter.js';
import { RedisAdapter } from './adapters/redisAdapter.js';
import { RuleRuntime, dryRun, metadataOnlyEvent } from './core/engine.js';

const app = express();
app.use(express.json());
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/ui', express.static(path.join(__dirname, '../ui')));

const kafka = new KafkaAdapter({ brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','), topic: process.env.KAFKA_TOPIC || 'cep-matches' });
const redis = new RedisAdapter({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const runtime = new RuleRuntime({ adapters: { kafka, redis } });

app.post('/rules', async (req, res) => {
  const { rule } = req.body;
  const result = runtime.registerRule(rule);
  res.json(result);
});

app.get('/runs/:id', (req, res) => {
  const run = runtime.getRun(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'not found' });
  }
  return res.json(run);
});

app.post('/dryrun', async (req, res) => {
  const { rule, events } = req.body;
  const normalized = (events || []).map(metadataOnlyEvent);
  const noopAdapters = {
    kafka: { emit: () => Promise.resolve() },
    redis: { remember: () => Promise.resolve(), has: () => Promise.resolve(false) }
  };
  const result = await dryRun(rule, normalized, noopAdapters);
  res.json(result);
});

export function start(port = process.env.PORT || 4100) {
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`CEP service listening on ${port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
