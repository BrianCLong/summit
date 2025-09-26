import { vectorSearchBridge } from '../src/services/vectorSearchBridge';

function buildRandomVector(dimension: number): number[] {
  return Array.from({ length: dimension }, () => Math.random());
}

async function main() {
  if (!vectorSearchBridge.isEnabled()) {
    console.error('Vector search bridge is not configured. Set MILVUS_HOST or VECTOR_DB_ENABLED=true.');
    process.exitCode = 1;
    return;
  }

  const dimension = Number(process.env.EMBEDDING_DIMENSION || '1536');
  const vector = buildRandomVector(dimension);
  const warmup = Number(process.env.VECTOR_BENCH_WARMUP || '3');
  const runs = Number(process.env.VECTOR_BENCH_RUNS || '10');

  try {
    const metrics = await vectorSearchBridge.benchmark(vector, warmup, runs);
    console.log('Vector similarity search latency (ms):', metrics);
  } catch (error) {
    console.error('Failed to benchmark vector search:', error);
    process.exitCode = 1;
  }
}

main();
