import express from 'express';
import cors from 'cors';
import pino from 'pino';

const logger = pino({ name: 'mock-notify', level: process.env.LOG_LEVEL ?? 'info' });
const port = Number(process.env.PORT ?? 7080);

const app = express();
app.use(cors());
app.use(express.json());

const events = [];

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', events: events.length });
});

app.get('/events', (_req, res) => {
  res.json({ events });
});

app.post('/events', (req, res) => {
  const payload = {
    id: events.length + 1,
    receivedAt: new Date().toISOString(),
    payload: req.body ?? {}
  };
  events.push(payload);
  logger.info({ event: payload }, 'received mock notification');
  res.status(202).json({ status: 'accepted', event: payload });
});

app.post('/status', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/status', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setInterval(() => {
  const synthetic = {
    id: events.length + 1,
    receivedAt: new Date().toISOString(),
    payload: {
      type: 'synthetic',
      message: 'DevKit mock notification heartbeat'
    }
  };
  events.push(synthetic);
  if (events.length > 50) {
    events.shift();
  }
  logger.debug({ event: synthetic }, 'generated synthetic notification');
}, 30000);

app.listen(port, () => {
  logger.info({ port }, 'mock notification service listening');
});
