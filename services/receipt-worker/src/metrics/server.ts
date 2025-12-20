import http from 'http';
import { Registry } from 'prom-client';

export interface MetricsServerOptions {
  port?: number;
  registry: Registry;
}

export function startMetricsServer({
  port = 9464,
  registry,
}: MetricsServerOptions): http.Server {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      const metrics = await registry.metrics();
      res.setHeader('Content-Type', registry.contentType);
      res.writeHead(200);
      res.end(metrics);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Receipt worker metrics exposed on :${port}/metrics`);
  });

  return server;
}
