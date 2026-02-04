import Fastify from 'fastify';
import underPressure from '@fastify/under-pressure';
import { registerApi } from './api';
import { initTelemetry } from './telemetry';
import { registerSse } from './transport/httpSse';
import { startGrpcServer } from './transport/grpc/server';
import { Scheduler } from './scheduler';

async function main() {
  const app = Fastify({ logger: true });
  await initTelemetry('runtime-pooler');

  app.register(underPressure, {
    maxEventLoopDelay: 100,
    maxHeapUsedBytes: 1024 * 1024 * 1024,
    retryAfter: 30,
  });

  const scheduler = new Scheduler();
  registerApi(app, { scheduler });
  registerSse(app);

  const port = Number(process.env.PORT || 8080);
  await app.listen({ port, host: '0.0.0.0' });

  if (process.env.MCP_GRPC_ENABLED === 'true') {
    await startGrpcServer({ scheduler }, grpcConfigFromEnv());
  }
}

function grpcConfigFromEnv() {
  return {
    host: process.env.MCP_GRPC_HOST ?? '0.0.0.0',
    port: Number(process.env.MCP_GRPC_PORT ?? 9090),
    tlsEnabled: process.env.MCP_GRPC_TLS_ENABLED === 'true',
    tlsKeyPath: process.env.MCP_GRPC_TLS_KEY,
    tlsCertPath: process.env.MCP_GRPC_TLS_CERT,
    tlsCaPath: process.env.MCP_GRPC_TLS_CA,
    tlsRequireClientCert:
      process.env.MCP_GRPC_TLS_REQUIRE_CLIENT_CERT === 'true',
    maxInFlight: Number(process.env.MCP_GRPC_MAX_IN_FLIGHT ?? 32),
    defaultDeadlineMs: Number(process.env.MCP_GRPC_DEFAULT_DEADLINE_MS ?? 15000),
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
