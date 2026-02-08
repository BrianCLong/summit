export type EvidenceId = `EVD-PLTRHIVE-${string}-${string}`;

export interface EvidenceBundlePaths {
  report: string;
  metrics: string;
  stamp: string;
  index: string;
}

export interface EvidenceBundle {
  runId: string;
  evidenceIds: EvidenceId[];
  paths: EvidenceBundlePaths;
}

const timestampKeyPattern = /(?:^|_|-)(time|timestamp|date)(?:$|_|-)/i;
const timestampSuffixPattern = /At$/i;
const isoTimestampPattern =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

interface DeterminismOptions {
  allowTimestampFields?: boolean;
}

export function assertDeterminism(
  value: unknown,
  options: DeterminismOptions = {},
): void {
  const visited = new Set<unknown>();
  const allowTimestampFields = options.allowTimestampFields === true;

  const walk = (node: unknown, path: string[]): void => {
    if (node === null || node === undefined) return;
    if (typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]));
      return;
    }

    for (const [key, entry] of Object.entries(node as Record<string, unknown>)) {
      const nextPath = [...path, key];
      const hasTimestampKey =
        timestampKeyPattern.test(key) || timestampSuffixPattern.test(key);
      if (!allowTimestampFields && hasTimestampKey) {
        throw new Error(
          `Determinism violation: timestamp-like field "${key}" at ${nextPath.join('.')}`,
        );
      }
      if (!allowTimestampFields && typeof entry === 'string') {
        if (isoTimestampPattern.test(entry)) {
          throw new Error(
            `Determinism violation: timestamp-like value at ${nextPath.join('.')}`,
          );
        }
      }
      if (!allowTimestampFields && typeof entry === 'number' && hasTimestampKey) {
        if (entry > 946684800000) {
          throw new Error(
            `Determinism violation: epoch-like value at ${nextPath.join('.')}`,
          );
        }
      }
      walk(entry, nextPath);
    }
  };

  walk(value, []);
}

export function createEvidenceBundle(runId: string): EvidenceBundle {
  return {
    runId,
    evidenceIds: [],
    paths: {
      report: `evidence/${runId}/report.json`,
      metrics: `evidence/${runId}/metrics.json`,
      stamp: `evidence/${runId}/stamp.json`,
      index: 'evidence/index.json',
    },
  };
}
