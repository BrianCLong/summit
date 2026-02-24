import fs from 'fs';
import path from 'path';

const root = process.cwd();
const evidenceIndexPath = path.join(root, 'evidence', 'index.json');
const requiredEvidenceIds = (process.env.EVIDENCE_IDS || 'EVD-koreai-agentic-EVIDENCE-001')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const bannedKeys = new Set([
  'timestamp',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
]);

const allowedStampKeys = new Set(['created_at', 'git_sha', 'run_id']);

const readJson = (filePath) => {
  const payload = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(payload);
};

const findBannedKeys = (value, currentPath = '$') => {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...findBannedKeys(item, `${currentPath}[${index}]`));
    });
    return hits;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (bannedKeys.has(key)) {
        hits.push(`${currentPath}.${key}`);
      }
      hits.push(...findBannedKeys(nested, `${currentPath}.${key}`));
    }
  }
  return hits;
};

const ensureFileExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing evidence file: ${filePath}`);
  }
};

const evidenceIndex = readJson(evidenceIndexPath);

for (const evidenceId of requiredEvidenceIds) {
  const item = evidenceIndex.items?.find(
    (entry) => entry.evidence_id === evidenceId,
  );
  if (!item) {
    throw new Error(`Evidence ID not found in evidence/index.json: ${evidenceId}`);
  }

  const reportPath = path.join(root, item.files.report);
  const metricsPath = path.join(root, item.files.metrics);
  const stampPath = path.join(root, item.files.stamp);

  [reportPath, metricsPath, stampPath].forEach(ensureFileExists);

  const reportJson = readJson(reportPath);
  const metricsJson = readJson(metricsPath);
  const stampJson = readJson(stampPath);

  const reportHits = findBannedKeys(reportJson);
  const metricsHits = findBannedKeys(metricsJson);

  if (reportHits.length > 0 || metricsHits.length > 0) {
    throw new Error(
      `Determinism violation: timestamps detected outside stamp.json for ${evidenceId}. ` +
        `Report hits: ${reportHits.join(', ')}; Metrics hits: ${metricsHits.join(', ')}`,
    );
  }

  const stampKeys = Object.keys(stampJson);
  const invalidStampKeys = stampKeys.filter((key) => !allowedStampKeys.has(key));
  if (invalidStampKeys.length > 0) {
    throw new Error(
      `Stamp schema violation for ${evidenceId}: unexpected keys ${invalidStampKeys.join(', ')}`,
    );
  }

  const runIndexPath = path.join(path.dirname(reportPath), 'index.json');
  if (fs.existsSync(runIndexPath)) {
    const runIndex = readJson(runIndexPath);
    const runIndexHits = findBannedKeys(runIndex);
    if (runIndexHits.length > 0) {
      throw new Error(
        `Determinism violation: timestamps detected in run index for ${evidenceId}: ${runIndexHits.join(
          ', ',
        )}`,
      );
    }
    if (runIndex.run_id && stampJson.run_id && runIndex.run_id !== stampJson.run_id) {
      throw new Error(
        `Run ID mismatch for ${evidenceId}: index.json has ${runIndex.run_id}, stamp.json has ${stampJson.run_id}`,
      );
    }
    if (runIndex.evidence && !runIndex.evidence[evidenceId]) {
      throw new Error(
        `Run index missing evidence ID ${evidenceId} in ${runIndexPath}`,
      );
    }
  }
}

console.log(`Evidence verification passed for: ${requiredEvidenceIds.join(', ')}`);
