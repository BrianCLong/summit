import { performance } from 'node:perf_hooks';
import {
  HttpTransportClient,
} from '../../packages/sdk-ts/src/transports/http-client';
import {
  GrpcTransportClient,
} from '../../packages/sdk-ts/src/transports/grpc-client';

const httpUrl = process.env.MCP_HTTP_URL ?? 'http://localhost:8080';
const grpcAddress = process.env.MCP_GRPC_ADDRESS ?? 'localhost:9090';
const token = process.env.MCP_TOKEN ?? 'dev-token';
const iterations = Number(process.env.MCP_BENCH_RUNS ?? 20);

async function run() {
  const httpClient = new HttpTransportClient(httpUrl, token, {
    deadlineMs: 5000,
  });
  const grpcClient = new GrpcTransportClient(grpcAddress, token, {
    deadlineMs: 5000,
  });

  const httpMetrics = await bench('http', () => httpClient.listTools());
  const grpcMetrics = await bench('grpc', () => grpcClient.listTools());

  console.log(JSON.stringify({ http: httpMetrics, grpc: grpcMetrics }, null, 2));
}

async function bench(
  name: string,
  fn: () => Promise<unknown>,
): Promise<{ avgMs: number; p95Ms: number; payloadBytes: number }> {
  const latencies: number[] = [];
  let payloadBytes = 0;
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    latencies.push(end - start);
    if (i === 0) {
      payloadBytes = Buffer.byteLength(JSON.stringify(result));
    }
  }
  latencies.sort((a, b) => a - b);
  const avgMs = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
  const p95Ms = latencies[Math.floor(latencies.length * 0.95)] ?? avgMs;
  return { avgMs, p95Ms, payloadBytes };
}

run().catch((err) => {
  console.error('[bench:transport-compare] failed', err);
  process.exit(1);
});
