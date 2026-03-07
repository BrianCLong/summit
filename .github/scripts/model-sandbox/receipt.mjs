import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generates deterministic receipts for a model run.
 */
export async function generateReceipts(outputDir, runData) {
  const { modelName, modelDigest, inputHash, outputHash, exitCode, egressAttempts } = runData;

  // run.json: Deterministic, no timestamps
  const runReceipt = {
    version: 1,
    model: {
      name: modelName,
      digest: modelDigest,
    },
    inputs: {
      hash: inputHash,
    },
    outputs: {
      hash: outputHash,
      exitCode,
    },
    security: {
      egressAttempts: egressAttempts || [],
    }
  };

  // stamp.json: Temporal metadata allowed
  const stampReceipt = {
    version: 1,
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
    }
  };

  await mkdir(outputDir, { recursive: true });

  await writeFile(
    join(outputDir, 'run.json'),
    JSON.stringify(runReceipt, null, 2),
    'utf-8'
  );

  await writeFile(
    join(outputDir, 'stamp.json'),
    JSON.stringify(stampReceipt, null, 2),
    'utf-8'
  );

  return { runPath: join(outputDir, 'run.json'), stampPath: join(outputDir, 'stamp.json') };
}

if (process.argv[1] === import.meta.url.slice(7)) {
  // CLI usage for testing
  const outputDir = process.argv[2] || './runtime/receipts/test';
  const data = {
    modelName: 'test-model',
    modelDigest: 'sha256:abc',
    inputHash: 'sha256:123',
    outputHash: 'sha256:456',
    exitCode: 0
  };
  generateReceipts(outputDir, data)
    .then((paths) => console.log(`Receipts generated: ${paths.runPath}, ${paths.stampPath}`))
    .catch(console.error);
}
