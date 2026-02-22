import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import path from 'path';
import { EvidenceEvent, EvidenceWriter } from './types.js';

export interface EvidenceWriterOptions {
  root: string;
  fileName?: string;
}

export function createEvidenceWriter(
  options: EvidenceWriterOptions,
): EvidenceWriter {
  const evidenceDir = path.resolve(options.root, 'evidence', 'context-shell');
  const fileName = options.fileName ?? 'context-shell-events.jsonl';
  const outputPath = path.join(evidenceDir, fileName);

  return {
    async write(event: EvidenceEvent): Promise<void> {
      await fs.mkdir(evidenceDir, { recursive: true });
      const payload = `${JSON.stringify(event)}\n`;
      await fs.appendFile(outputPath, payload, 'utf8');
    },
  };
}

export function hashPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}
