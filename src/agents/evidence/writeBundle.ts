import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { stableStringify } from './stableStringify';

export type EvidenceReport = {
  evidence_id: string;
  summary: string;
  ops: Array<{
    id: string;
    type: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    sessionId?: string;
    directory?: string;
  }>;
};

export type EvidenceMetrics = {
  event_count: number;
  tool_use_count: number;
  agent_cycles_detected: boolean;
  policy_violations_count: number;
};

export type EvidenceIndex = {
  evidence_id: string;
  files: {
    report: string;
    metrics: string;
    stamp: string;
  };
};

type EvidenceStamp = {
  evidence_id: string;
  generated_at: string;
  hashes: {
    report_sha256: string;
    metrics_sha256: string;
    index_sha256: string;
  };
};

const SECRET_FIELD_REGEX = /(api[_-]?key|authorization|cookie|token|secret|password)/i;
const SECRET_VALUE_REGEX =
  /(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]+)/;

const redactValue = (value: unknown): unknown => {
  if (typeof value === 'string' && SECRET_VALUE_REGEX.test(value)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((acc, [key, entry]) => {
      if (SECRET_FIELD_REGEX.test(key)) {
        acc[key] = '[REDACTED]';
      } else {
        acc[key] = redactValue(entry);
      }
      return acc;
    }, {});
  }
  return value;
};

const assertNoTimestamps = (value: unknown, pathLabel = ''): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoTimestamps(entry, `${pathLabel}[${index}]`),
    );
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(
      ([key, entry]) => {
        const qualifiedKey = pathLabel ? `${pathLabel}.${key}` : key;
        if (/time|timestamp|createdAt|created_at/i.test(key)) {
          throw new Error(`Timestamp field detected in ${qualifiedKey}`);
        }
        assertNoTimestamps(entry, qualifiedKey);
      },
    );
  }
};

const hashContents = (contents: string): string =>
  createHash('sha256').update(contents).digest('hex');

const writeJson = async (filePath: string, data: unknown): Promise<string> => {
  const contents = `${stableStringify(data as never)}\n`;
  await writeFile(filePath, contents);
  return contents;
};

export const writeEvidenceBundle = async ({
  evidenceId,
  report,
  metrics,
  outputRoot = 'artifacts/evidence',
  timestamp = new Date().toISOString(),
}: {
  evidenceId: string;
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  outputRoot?: string;
  timestamp?: string;
}): Promise<{
  bundleDir: string;
  index: EvidenceIndex;
  stamp: EvidenceStamp;
}> => {
  const bundleDir = path.join(outputRoot, evidenceId);
  const evidenceDir = path.join(bundleDir, 'evidence');
  await mkdir(evidenceDir, { recursive: true });

  const redactedReport = redactValue(report) as EvidenceReport;
  const redactedMetrics = redactValue(metrics) as EvidenceMetrics;

  assertNoTimestamps(redactedReport);
  assertNoTimestamps(redactedMetrics);

  const reportPath = path.join(bundleDir, 'report.json');
  const metricsPath = path.join(bundleDir, 'metrics.json');
  const indexPath = path.join(evidenceDir, 'index.json');
  const stampPath = path.join(bundleDir, 'stamp.json');

  const reportContents = await writeJson(reportPath, redactedReport);
  const metricsContents = await writeJson(metricsPath, redactedMetrics);

  const index: EvidenceIndex = {
    evidence_id: evidenceId,
    files: {
      report: 'report.json',
      metrics: 'metrics.json',
      stamp: 'stamp.json',
    },
  };
  const indexContents = await writeJson(indexPath, index);

  const stamp: EvidenceStamp = {
    evidence_id: evidenceId,
    generated_at: timestamp,
    hashes: {
      report_sha256: hashContents(reportContents),
      metrics_sha256: hashContents(metricsContents),
      index_sha256: hashContents(indexContents),
    },
  };
  await writeJson(stampPath, stamp);

  return { bundleDir, index, stamp };
};
