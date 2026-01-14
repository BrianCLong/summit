import fs from 'fs/promises';
import path from 'path';
import { TaskOperation, TaskStoreEvidenceConfig } from './types.js';
import { hashRequest, redact, summarizeResponse } from './utils.js';

export interface EvidenceRecord {
  requestHash: string;
  operation: TaskOperation;
  toolName: string;
  args: Record<string, unknown>;
  responseSummary?: Record<string, unknown>;
  policy: {
    allowed: boolean;
    dryRun: boolean;
    reason?: string;
  };
  timestamps: {
    startedAt: string;
    finishedAt: string;
    durationMs: number;
  };
  idempotencyKey?: string;
  error?: string;
}

export class EvidenceRecorder {
  private readonly config: TaskStoreEvidenceConfig;
  private readonly baseDir: string;

  constructor(config?: TaskStoreEvidenceConfig) {
    this.config = {
      enabled: true,
      artifactsDir: process.env.ARTIFACTS_DIR,
      runId: process.env.SUMMIT_EVIDENCE_RUN_ID,
      redactKeys: [],
      maxResponseBytes: 2048,
      ...config,
    };
    const artifactsRoot = this.config.artifactsDir
      ? path.resolve(this.config.artifactsDir)
      : path.join(process.cwd(), 'artifacts');
    const runId = this.config.runId ?? new Date().toISOString().replace(/[:.]/g, '-');
    this.baseDir = path.join(
      artifactsRoot,
      'evidence',
      `evidence-${runId}`,
      'things3',
    );
  }

  async write(record: EvidenceRecord): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    await fs.mkdir(this.baseDir, { recursive: true });
    const redactedArgs = redact(record.args, this.config.redactKeys) as Record<string, unknown>;
    const payload: EvidenceRecord = {
      ...record,
      args: redactedArgs,
      responseSummary: record.responseSummary,
    };
    const requestHash = record.requestHash ||
      hashRequest({
        operation: record.operation,
        toolName: record.toolName,
        args: redactedArgs,
      });
    const fileName = `${record.operation}-${requestHash}.json`;
    await fs.writeFile(
      path.join(this.baseDir, fileName),
      JSON.stringify(payload, null, 2),
      'utf8',
    );
  }

  summarize(response: unknown): Record<string, unknown> {
    const summary = summarizeResponse(response);
    const serialized = JSON.stringify(summary);
    if (serialized.length > this.config.maxResponseBytes) {
      return {
        truncated: true,
        preview: serialized.slice(0, this.config.maxResponseBytes),
      };
    }
    return summary;
  }
}
