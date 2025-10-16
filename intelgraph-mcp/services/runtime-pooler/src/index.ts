import Fastify from 'fastify';
import underPressure from '@fastify/under-pressure';
import { registerApi } from './api';
import { initTelemetry } from './telemetry';
import { registerSse } from './transport/httpSse';

async function main() {
  const app = Fastify({ logger: true });
  await initTelemetry('runtime-pooler');

  app.register(underPressure, {
    maxEventLoopDelay: 100,
    maxHeapUsedBytes: 1024 * 1024 * 1024,
    retryAfter: 30,
  });

  registerApi(app);
  registerSse(app);

  const port = Number(process.env.PORT || 8080);
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
