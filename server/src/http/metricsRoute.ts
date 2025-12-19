// @ts-nocheck
import { registry } from '../metrics';
import '../observability/reliability-metrics';

export const metricsRoute = async (_req: any, res: any) => {
  try {
    const metricsData = await registry.metrics();
    res.set('Content-Type', registry.contentType);
    res.send(metricsData);
  } catch (err) {
    res.status(500).send('Error collecting metrics');
  }
};
