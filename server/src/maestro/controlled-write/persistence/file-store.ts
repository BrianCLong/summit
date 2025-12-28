import * as fs from 'fs/promises';
import * as path from 'path';
import { PersistenceStore } from '../interfaces';
import { WriteAction, WriteActionStatus, ApprovalRequest } from '../types';
import * as crypto from 'crypto';

export class FilePersistenceStore implements PersistenceStore {
  private baseDir: string;

  constructor(baseDir: string = 'data/controlled-writes') {
    this.baseDir = baseDir;
  }

  private getActionDir(tenantId: string, actionId: string): string {
    // Tenant isolation
    return path.join(this.baseDir, tenantId || 'default', actionId);
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  // Atomic write helper
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
  }

  async saveAction(action: WriteAction): Promise<void> {
    const dir = this.getActionDir('system', action.id); // Assuming 'system' tenant for now, needs context
    await this.ensureDir(dir);
    await this.atomicWrite(path.join(dir, 'state.json'), JSON.stringify(action, null, 2));
  }

  async getAction(id: string): Promise<WriteAction | null> {
    // In a real system we'd need to know the tenantId to look up.
    // For this MVP, we might need to search or store an index.
    // Let's assume 'system' tenant for simplicity or scan
    // For now, hardcode 'system' tenant as per saveAction
    const dir = this.getActionDir('system', id);
    try {
      const content = await fs.readFile(path.join(dir, 'state.json'), 'utf8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  async updateStatus(id: string, status: WriteActionStatus): Promise<void> {
    const action = await this.getAction(id);
    if (action) {
      action.status = status;
      action.updatedAt = new Date();
      await this.saveAction(action);
    }
  }

  async saveApproval(approval: ApprovalRequest): Promise<void> {
    const dir = this.getActionDir('system', approval.actionId);
    await this.ensureDir(dir);
    await this.atomicWrite(path.join(dir, 'approval.json'), JSON.stringify(approval, null, 2));
  }

  async getApproval(actionId: string): Promise<ApprovalRequest | null> {
    const dir = this.getActionDir('system', actionId);
    try {
      const content = await fs.readFile(path.join(dir, 'approval.json'), 'utf8');
      const approval = JSON.parse(content);
      // Revive dates
      approval.expiration = new Date(approval.expiration);
      approval.requestedAt = new Date(approval.requestedAt);
      if (approval.respondedAt) approval.respondedAt = new Date(approval.respondedAt);
      return approval;
    } catch (e) {
      return null;
    }
  }

  async appendEvent(actionId: string, event: any): Promise<void> {
    const dir = this.getActionDir('system', actionId);
    await this.ensureDir(dir);
    const line = JSON.stringify({ ...event, timestamp: new Date() }) + '\n';
    await fs.appendFile(path.join(dir, 'events.ndjson'), line, 'utf8');
  }

  async acquireLock(actionId: string): Promise<boolean> {
    const dir = this.getActionDir('system', actionId);
    await this.ensureDir(dir);
    const lockFile = path.join(dir, 'lock');
    try {
      // open with O_CREAT | O_EXCL (fail if exists)
      const handle = await fs.open(lockFile, 'wx');
      await handle.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  async releaseLock(actionId: string): Promise<void> {
    const dir = this.getActionDir('system', actionId);
    const lockFile = path.join(dir, 'lock');
    try {
      await fs.unlink(lockFile);
    } catch (e) {
      // Ignore if not exists
    }
  }
}
