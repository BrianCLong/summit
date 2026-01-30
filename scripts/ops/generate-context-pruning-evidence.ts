import fs from 'node:fs/promises';
import path from 'node:path';

interface PruningEvidence {
  version: string;
  generatedAt: string;
  metrics: {
    tokenIn: number;
    tokenOut: number;
    compressionRate: number;
    latencyMs: number;
  };
  notes?: string;
}

async function main() {
  const outputDir = 'evidence-bundles';
  const payload: PruningEvidence = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    metrics: {
      tokenIn: Number(process.env.PRUNE_TOKEN_IN ?? '0'),
      tokenOut: Number(process.env.PRUNE_TOKEN_OUT ?? '0'),
      compressionRate: Number(process.env.PRUNE_COMPRESSION ?? '0'),
      latencyMs: Number(process.env.PRUNE_LATENCY_MS ?? '0'),
    },
    notes: process.env.PRUNE_NOTES,
  };

  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'context-pruning-evidence.json');
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Wrote ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
