import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { WriteExecutor, ExecutionPlan } from '../interfaces';
import { WriteAction } from '../types';

export class FileSystemExecutor implements WriteExecutor {
  private jailRoot: string;

  constructor(jailRoot: string = 'server/temp/controlled-writes-workspace') {
    this.jailRoot = path.resolve(jailRoot);
  }

  private async ensureRoot() {
      await fs.mkdir(this.jailRoot, { recursive: true });
  }

  private validatePath(target: string): string {
    // Normalize and resolve path
    const resolved = path.resolve(this.jailRoot, target);

    // Check if it's inside jailRoot
    if (!resolved.startsWith(this.jailRoot)) {
      throw new Error(`Path traversal detected: ${target} escapes jail root ${this.jailRoot}`);
    }

    // Check for null bytes
    if (target.indexOf('\0') !== -1) {
        throw new Error('Invalid path: null bytes detected');
    }

    return resolved;
  }

  async plan(action: WriteAction): Promise<ExecutionPlan> {
    const target = this.validatePath(action.payload.target);
    const content = action.payload.content || '';

    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      files: [action.payload.target],
      totalBytes: Buffer.byteLength(content, 'utf8'),
      hash,
      diff: action.payload.diff // If we had previous content, we'd compute diff here
    };
  }

  async execute(action: WriteAction): Promise<void> {
    await this.ensureRoot();
    const target = this.validatePath(action.payload.target);
    const content = action.payload.content || '';

    // Snapshot before write
    await this.createSnapshot(action.id, target);

    if (action.type === 'DRAFT' || action.type === 'ANNOTATE') {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, 'utf8');
    } else {
        throw new Error(`Unsupported action type for FileSystemExecutor: ${action.type}`);
    }
  }

  async rollback(action: WriteAction): Promise<void> {
    const target = this.validatePath(action.payload.target);
    await this.restoreSnapshot(action.id, target);
  }

  private async createSnapshot(actionId: string, filePath: string): Promise<void> {
      const snapshotDir = path.join(this.jailRoot, '.snapshots', actionId);
      await fs.mkdir(snapshotDir, { recursive: true });

      const fileName = path.basename(filePath);
      const snapshotPath = path.join(snapshotDir, fileName);

      try {
          await fs.copyFile(filePath, snapshotPath);
      } catch (e: any) {
          if (e.code === 'ENOENT') {
              // File didn't exist, mark as such (maybe write a marker file)
              await fs.writeFile(snapshotPath + '.deleted', '', 'utf8');
          } else {
              throw e;
          }
      }
  }

  private async restoreSnapshot(actionId: string, filePath: string): Promise<void> {
    const snapshotDir = path.join(this.jailRoot, '.snapshots', actionId);
    const fileName = path.basename(filePath);
    const snapshotPath = path.join(snapshotDir, fileName);

    try {
        // Check if it was non-existent (marked as deleted)
        await fs.access(snapshotPath + '.deleted');
        // If marker exists, we delete the current file to restore "non-existence"
        try {
            await fs.unlink(filePath);
        } catch (e) { /* ignore if already gone */ }
    } catch (e) {
        // Normal restore
        try {
            await fs.copyFile(snapshotPath, filePath);
        } catch (restoreErr: any) {
             if (restoreErr.code === 'ENOENT') {
                 console.warn('Snapshot not found for rollback, cannot restore.');
             } else {
                 throw restoreErr;
             }
        }
    }
  }
}
