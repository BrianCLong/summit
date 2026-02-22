import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../');

function generateReceipt(config, results) {
  // Deterministic run ID based on config and result hashes
  const runId = createHash('sha256')
    .update(JSON.stringify(config))
    .update(results.stdoutHash || '')
    .update(results.stderrHash || '')
    .digest('hex')
    .substring(0, 12);

  const receipt = {
    evidence_id: `MSBX-${runId}`,
    config: config,
    results: {
        exit_code: results.exitCode,
        stdout_sha256: results.stdoutHash,
        stderr_sha256: results.stderrHash
    }
  };

  const stamp = {
    evidence_id: `MSBX-${runId}`,
    timestamp: new Date().toISOString(),
    user: process.env.USER || 'unknown',
    node_version: process.version
  };

  const outputDir = join(REPO_ROOT, 'runtime/receipts');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(join(outputDir, `${runId}.run.json`), JSON.stringify(receipt, null, 2));
  writeFileSync(join(outputDir, `${runId}.stamp.json`), JSON.stringify(stamp, null, 2));

  return runId;
}

if (process.argv[1].endsWith('receipt.mjs')) {
    const [,, configJson, resultsJson] = process.argv;
    if (configJson && resultsJson) {
        try {
            const config = JSON.parse(configJson);
            const results = JSON.parse(resultsJson);
            const runId = generateReceipt(config, results);
            console.log(runId);
        } catch (e) {
            console.error("Failed to parse JSON arguments:", e);
            process.exit(1);
        }
    } else {
        const runId = generateReceipt(
            { model: "example" },
            { exitCode: 0, stdoutHash: "abc", stderrHash: "def" }
        );
        console.log(`Test receipt generated: ${runId}`);
    }
}

export { generateReceipt };
