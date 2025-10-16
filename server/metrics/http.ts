import client from 'prom-client';
const h = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'latency',
  labelNames: ['path', 'method'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
export function record(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const secs = Number(process.hrtime.bigint() - start) / 1e9;
    h.labels(req.route?.path || req.path, req.method).observe(secs);
  });
  next();
}
