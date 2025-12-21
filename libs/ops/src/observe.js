const promClient = require('prom-client');

promClient.collectDefaultMetrics();

const httpReqDur = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'latency',
  buckets: [50, 100, 250, 500, 1000],
  labelNames: ['service', 'route', 'method'],
});

const metricsMiddleware = (serviceName) => (req, res, next) => {
  const end = httpReqDur.startTimer({ service: serviceName, route: req.path, method: req.method });
  res.on('finish', () => end());
  next();
};

module.exports = { httpReqDur, metricsMiddleware };
