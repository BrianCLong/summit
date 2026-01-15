import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export class TranscriptWriter {
  private readonly transcriptPath: string;

  constructor(private readonly sessionDir: string) {
    this.transcriptPath = path.join(this.sessionDir, 'transcript.log');
  }

  async init(): Promise<void> {
    await mkdir(this.sessionDir, { recursive: true });
  }

  async write(line: string): Promise<void> {
    await appendFile(this.transcriptPath, `${line}\n`);
  }

  get path(): string {
    return this.transcriptPath;
  }
}
