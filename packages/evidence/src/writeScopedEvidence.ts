import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { generateEvidenceID } from './id.js';
import { ScopedEvidence, EvidenceArtifact } from './types.js';

// Heuristic to detect ISO 8601-like timestamps (e.g. 2025-02-08T...)
// Matches "202" followed by digits, checking for T or : structure
const TIMESTAMP_RE = /20[2-9][0-9]-[0-1][0-9]-[0-3][0-9][T\s][0-2][0-9]:[0-5][0-9]/;

function sanitizeEvidence(obj: any): any {
  if (typeof obj === 'string') {
    if (TIMESTAMP_RE.test(obj)) {
      return '[REDACTED_TIMESTAMP]';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeEvidence);
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Also block keys that imply time
      if (/time|date|created|updated|at$/i.test(key) && typeof value === 'string' && TIMESTAMP_RE.test(value)) {
         newObj[key] = '[REDACTED_TIMESTAMP]';
      } else {
         newObj[key] = sanitizeEvidence(value);
      }
    }
    return newObj;
  }
  return obj;
}

export async function writeScopedEvidence(
  evidence: ScopedEvidence,
  outputDir: string = 'artifacts/evidence'
): Promise<string> {
  // Use 'report' as the primary artifact for directory naming, or generic bundle ID
  const evId = generateEvidenceID(evidence.domain, evidence.scopeId, 'bundle', evidence.version);
  const runDir = path.join(outputDir, evId);
  await fs.promises.mkdir(runDir, { recursive: true });

  // Sanitize inputs
  const cleanReport = sanitizeEvidence(evidence.report);
  const cleanMetrics = sanitizeEvidence(evidence.metrics);

  // 1. Write Report
  const reportPath = path.join(runDir, 'report.json');
  // Sort keys for determinism
  const reportJson = JSON.stringify(cleanReport, Object.keys(cleanReport).sort(), 2);
  await fs.promises.writeFile(reportPath, reportJson);

  // 2. Write Metrics
  const metricsPath = path.join(runDir, 'metrics.json');
  const metricsJson = JSON.stringify(cleanMetrics, Object.keys(cleanMetrics).sort(), 2);
  await fs.promises.writeFile(metricsPath, metricsJson);

  // 3. Compute Stamp (hash of report + metrics)
  const reportHash = crypto.createHash('sha256').update(reportJson).digest('hex');
  const metricsHash = crypto.createHash('sha256').update(metricsJson).digest('hex');

  // Timestamps ARE allowed in stamp.json
  const stamp = {
    reportHash,
    metricsHash,
    version: evidence.version,
    scopeId: evidence.scopeId,
    generatedAt: new Date().toISOString()
  };

  const stampPath = path.join(runDir, 'stamp.json');
  await fs.promises.writeFile(stampPath, JSON.stringify(stamp, null, 2));

  return runDir;
}
