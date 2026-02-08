import fs from 'node:fs/promises';
import path from 'node:path';
import { hashObject, hashString, stableStringify } from './determinism.js';
import { RunResult, UiFuzzConfig } from './types.js';

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const writeArtifacts = async (config: UiFuzzConfig, result: RunResult) => {
  const outputDir = config.outputDir;
  await ensureDir(outputDir);

  const reportPath = path.join(outputDir, 'report.json');
  const metricsPath = path.join(outputDir, 'metrics.json');
  const tracePath = path.join(outputDir, 'trace.ndjson');
  const stampPath = path.join(outputDir, 'stamp.json');

  const reportPayload = stableStringify(result.report);
  const metricsPayload = stableStringify(result.metrics);
  const tracePayload = result.trace.map((entry) => stableStringify(entry)).join('\n');

  await fs.writeFile(reportPath, `${reportPayload}\n`, 'utf8');
  await fs.writeFile(metricsPath, `${metricsPayload}\n`, 'utf8');
  if (config.traceEnabled) {
    await fs.writeFile(tracePath, `${tracePayload}\n`, 'utf8');
  }

  const traceHash = hashString(tracePayload);
  const reportHash = hashString(reportPayload);
  const configHash = hashObject({
    baseUrl: config.baseUrl,
    allowlist: config.allowlist,
    seed: config.seed,
    maxActions: config.maxActions,
    maxNavigations: config.maxNavigations,
    timeBudgetMs: config.timeBudgetMs,
    idleTimeoutMs: config.idleTimeoutMs,
    exitOnViolation: config.exitOnViolation,
  });

  const stamp = {
    schemaVersion: 1,
    traceHash,
    reportHash,
    configHash,
  };

  await fs.writeFile(stampPath, `${stableStringify(stamp)}\n`, 'utf8');
};
