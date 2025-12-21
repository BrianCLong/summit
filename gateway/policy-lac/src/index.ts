import express from 'express';
import { attachMetrics } from '../../../ops/metrics/express-metrics';

const app = express();
attachMetrics(app);

app.get('/health', (_req, res) => {
  res.send('ok');
});

app.listen(4000, () => {
  console.log('[policy-lac] listening on 4000');
});
