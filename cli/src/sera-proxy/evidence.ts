import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface SeraProxyEvidenceEntry {
  id: string;
  endpointHost: string;
  requestSha256: string;
  responseSha256: string;
  policyDecisionId: string;
  previousHash: string | null;
  entryHash: string;
}

export interface SeraProxyMetrics {
  schemaVersion: string;
  requests: number;
  blocked: number;
  bytesIn: number;
  bytesOut: number;
}

export interface SeraProxyReport {
  schemaVersion: string;
  endpointHost: string;
  entryCount: number;
  entries: SeraProxyEvidenceEntry[];
}

export interface SeraProxyStamp {
  reportSha256: string;
  metricsSha256: string;
}

export class SeraProxyEvidenceStore {
  private entries: SeraProxyEvidenceEntry[] = [];
  private metrics: SeraProxyMetrics = {
    schemaVersion: '1.0',
    requests: 0,
    blocked: 0,
    bytesIn: 0,
    bytesOut: 0,
  };

  constructor(private artifactDir: string, private endpointHost: string) {
    fs.mkdirSync(this.artifactDir, { recursive: true });
  }

  recordExchange(
    requestBody: string,
    responseBody: string,
    policyDecisionId: string
  ): void {
    const requestSha256 = sha256Hex(requestBody);
    const responseSha256 = sha256Hex(responseBody);
    const previousHash = this.entries.length > 0 ? this.entries[this.entries.length - 1].entryHash : null;
    const id = `EVID-SERA-CLI-${String(this.entries.length + 1).padStart(4, '0')}`;
    const entryPayload = {
      id,
      endpointHost: this.endpointHost,
      requestSha256,
      responseSha256,
      policyDecisionId,
      previousHash,
    };
    const entryHash = sha256Hex(stableStringify(entryPayload));

    this.entries.push({
      ...entryPayload,
      entryHash,
    });

    this.metrics.requests += 1;
    this.metrics.bytesIn += Buffer.byteLength(requestBody);
    this.metrics.bytesOut += Buffer.byteLength(responseBody);

    this.flush();
  }

  recordBlocked(bytesIn: number): void {
    this.metrics.blocked += 1;
    this.metrics.bytesIn += bytesIn;
    this.flush();
  }

  flush(): void {
    const report: SeraProxyReport = {
      schemaVersion: '1.0',
      endpointHost: this.endpointHost,
      entryCount: this.entries.length,
      entries: this.entries,
    };

    const reportJson = stableStringify(report);
    const metricsJson = stableStringify(this.metrics);

    fs.writeFileSync(path.join(this.artifactDir, 'report.json'), reportJson + '\n');
    fs.writeFileSync(path.join(this.artifactDir, 'metrics.json'), metricsJson + '\n');

    const stamp: SeraProxyStamp = {
      reportSha256: sha256Hex(reportJson),
      metricsSha256: sha256Hex(metricsJson),
    };

    fs.writeFileSync(path.join(this.artifactDir, 'stamp.json'), stableStringify(stamp) + '\n');
  }
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      result[key] = sortValue(entryValue);
    }
    return result;
  }
  return value;
}
