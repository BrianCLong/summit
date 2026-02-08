import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';

/**
 * Calculates SHA256 hash of a file using streams for memory efficiency
 * @param {string} filePath
 * @returns {Promise<string|null>}
 */
async function calculateHash(filePath) {
  try {
    const hash = crypto.createHash('sha256');
    await pipeline(createReadStream(filePath), hash);
    return hash.digest('hex');
  } catch (err) {
    return null;
  }
}

/**
 * Writes the index.json for GA verification artifacts
 * @param {Object} options
 * @param {string} options.outDir - Directory where artifacts are stored
 * @param {string} options.sha - Git commit SHA
 * @param {string} options.status - Overall run status (passed/failed/aborted)
 * @param {string} options.startedAt - ISO timestamp when run started
 * @param {Array} options.steps - List of step results from the runner
 */
export async function writeEvidenceIndex({ outDir, sha, status, startedAt, steps }) {
  const indexPath = path.join(outDir, 'index.json');
  const endedAt = new Date().toISOString();

  // Use GITHUB_RUN_ID if available, otherwise fallback to a random UUID
  const runId = process.env.GITHUB_RUN_ID || `local-${crypto.randomUUID().slice(0, 8)}`;

  const artifacts = [];
  const missingExpected = [];

  // 1. Define expected artifacts based on requirements
  const expectedItems = [
    { name: 'Verification Stamp', path: 'stamp.json', step: 'init' },
    { name: 'SBOM', path: 'sbom.json', step: 'compliance:sbom' },
    { name: 'Provenance', path: 'provenance.json', step: 'compliance:provenance' },
    { name: 'Policy Results', path: 'policy-results.json', step: 'governance:policy' },
    { name: 'Typecheck Log', path: 'logs/typecheck.log', step: 'typecheck' },
    { name: 'Lint Log', path: 'logs/lint.log', step: 'lint' },
    { name: 'Build Log', path: 'logs/build.log', step: 'build' },
    { name: 'Unit Test Log', path: 'logs/server:test:unit.log', step: 'server:test:unit' },
    { name: 'Smoke Test Log', path: 'logs/ga:smoke.log', step: 'ga:smoke' },
  ];

  for (const item of expectedItems) {
    const fullPath = path.join(outDir, item.path);
    try {
      const stats = await fs.stat(fullPath);
      const sha256 = await calculateHash(fullPath);
      if (sha256) {
        artifacts.push({
          name: item.name,
          path: item.path,
          sha256,
          size_bytes: stats.size,
          produced_by_step: item.step,
        });
      } else {
        missingExpected.push(item.name);
      }
    } catch (err) {
      missingExpected.push(item.name);
    }
  }

  // 2. Scan for any other log files in the logs directory that weren't expected
  try {
    const logsDir = path.join(outDir, 'logs');
    const logFiles = await fs.readdir(logsDir);
    for (const file of logFiles) {
      if (file.endsWith('.log') && !file.endsWith('.tail.log')) {
        const relPath = path.join('logs', file);
        if (!artifacts.some(a => a.path === relPath)) {
          const fullPath = path.join(logsDir, file);
          const stats = await fs.stat(fullPath);
          const sha256 = await calculateHash(fullPath);
          if (sha256) {
            artifacts.push({
              name: file,
              path: relPath,
              sha256,
              size_bytes: stats.size,
              produced_by_step: 'unknown',
            });
          }
        }
      }
    }
  } catch (err) {
    // Ignore if logs dir doesn't exist or is inaccessible
  }

  // 3. Construct the index
  const index = {
    commit: sha,
    run_id: runId,
    started_at: startedAt,
    ended_at: endedAt,
    status,
    artifacts,
    missing_expected: missingExpected,
    logs: (steps || []).map(s => ({
      step: s.name,
      status: s.status,
      path: s.logPath,
    }))
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  console.log(`[ga-index] Evidence index written to ${indexPath}`);
  return index;
}
