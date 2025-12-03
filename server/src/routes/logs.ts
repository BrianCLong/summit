import { Router } from 'express';
import { logEventBus } from '../logging/logEventBus.js';
import { alertEngine } from '../logging/structuredLogger.js';

const router = Router();

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 15000);
  heartbeat.unref?.();

  logEventBus.recent(200).forEach((event) => send({ type: 'log', event }));
  alertEngine.getRecentAlerts().forEach((alert) => send({ type: 'alert', alert }));

  const unsubscribeLog = logEventBus.subscribe((event) => send({ type: 'log', event }));
  const onAlert = (alert: unknown) => send({ type: 'alert', alert });
  alertEngine.on('alert', onAlert);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribeLog();
    alertEngine.off('alert', onAlert);
    res.end();
  });
});

router.get('/recent', (req, res) => {
  const limit = Number(req.query.limit ?? '200');
  res.json({ logs: logEventBus.recent(Math.min(limit, 1000)) });
});

router.get('/alerts', (_req, res) => {
  res.json({ rules: alertEngine.getRules(), recent: alertEngine.getRecentAlerts() });
});

export default router;
