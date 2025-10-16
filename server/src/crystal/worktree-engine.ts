import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { WorktreeMetadata, JSONRecord } from './types.js';
import { provenanceLedger } from './provenance-ledger.js';

class AsyncQueue {
  private tail: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

function sanitizeCommand(command: string): string {
  return command.replace(/\s+/g, ' ').trim();
}

function ensureWithinRepo(repoPath: string, worktreePath: string) {
  const resolvedRepo = path.resolve(repoPath);
  const resolvedWorktree = path.resolve(worktreePath);
  if (!resolvedWorktree.startsWith(resolvedRepo)) {
    throw new Error(
      `Worktree path ${resolvedWorktree} must reside within repo ${resolvedRepo}`,
    );
  }
}

export interface WorktreeCreateOptions {
  sessionId: string;
  projectPath: string;
  mainBranch?: string;
}

export class WorktreeEngine {
  private queues = new Map<string, AsyncQueue>();
  private worktrees = new Map<string, WorktreeMetadata>();

  constructor(private readonly repoRoot: string = process.cwd()) {}

  private getQueue(projectPath: string): AsyncQueue {
    const key = path.resolve(projectPath);
    if (!this.queues.has(key)) {
      this.queues.set(key, new AsyncQueue());
    }
    return this.queues.get(key)!;
  }

  private registerWorktree(entry: WorktreeMetadata): WorktreeMetadata {
    this.worktrees.set(entry.id, entry);
    return entry;
  }

  async create(options: WorktreeCreateOptions): Promise<WorktreeMetadata> {
    const queue = this.getQueue(options.projectPath);
    return queue.enqueue(async () => {
      const repoPath = path.resolve(this.repoRoot, options.projectPath);
      const branch = `crystal/session/${randomUUID()}`;
      const worktreePath = path.join(
        repoPath,
        '.crystal',
        branch.replace(/\//g, '_'),
      );
      ensureWithinRepo(repoPath, worktreePath);
      await fs.mkdir(worktreePath, { recursive: true });
      const now = new Date().toISOString();
      const metadata: WorktreeMetadata = {
        id: randomUUID(),
        branch,
        repoPath,
        worktreePath,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
      };
      provenanceLedger.record(
        'worktree-engine',
        'create',
        metadata as unknown as JSONRecord,
      );
      return this.registerWorktree(metadata);
    });
  }

  async status(worktreeId: string): Promise<WorktreeMetadata | undefined> {
    return this.worktrees.get(worktreeId);
  }

  async rebaseFromMain(
    worktreeId: string,
    mainBranch = 'main',
  ): Promise<WorktreeMetadata> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree ${worktreeId}`);
    }
    const queue = this.getQueue(worktree.repoPath);
    return queue.enqueue(async () => {
      const now = new Date().toISOString();
      const updated: WorktreeMetadata = {
        ...worktree,
        status: 'rebase',
        lastRebasedAt: now,
        updatedAt: now,
      };
      this.worktrees.set(worktreeId, updated);
      provenanceLedger.record('worktree-engine', 'rebase-from-main', {
        worktreeId,
        mainBranch,
      });
      updated.status = 'ready';
      updated.updatedAt = new Date().toISOString();
      this.worktrees.set(worktreeId, { ...updated });
      return this.worktrees.get(worktreeId)!;
    });
  }

  async squashAndRebaseToMain(
    worktreeId: string,
    message: string,
  ): Promise<WorktreeMetadata> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      throw new Error(`Unknown worktree ${worktreeId}`);
    }
    const queue = this.getQueue(worktree.repoPath);
    return queue.enqueue(async () => {
      const now = new Date().toISOString();
      const updated: WorktreeMetadata = {
        ...worktree,
        status: 'rebase',
        lastSquashedAt: now,
        updatedAt: now,
      };
      this.worktrees.set(worktreeId, updated);
      provenanceLedger.record('worktree-engine', 'squash-and-rebase', {
        worktreeId,
        message,
      });
      updated.status = 'ready';
      updated.updatedAt = new Date().toISOString();
      this.worktrees.set(worktreeId, { ...updated });
      return this.worktrees.get(worktreeId)!;
    });
  }

  async deleteQueued(worktreeId: string): Promise<void> {
    const worktree = this.worktrees.get(worktreeId);
    if (!worktree) {
      return;
    }
    const queue = this.getQueue(worktree.repoPath);
    await queue.enqueue(async () => {
      this.worktrees.set(worktreeId, { ...worktree, status: 'deleting' });
      provenanceLedger.record('worktree-engine', 'queue-delete', {
        worktreeId,
      });
      await fs.rm(worktree.worktreePath, { recursive: true, force: true });
      this.worktrees.delete(worktreeId);
      provenanceLedger.record('worktree-engine', 'deleted', { worktreeId });
    });
  }

  async preview(command: string, args: string[] = []): Promise<string> {
    const sanitized =
      `${sanitizeCommand(command)} ${args.map(sanitizeCommand).join(' ')}`.trim();
    provenanceLedger.record('worktree-engine', 'preview', {
      command: sanitized,
    });
    return sanitized;
  }

  list(): WorktreeMetadata[] {
    return Array.from(this.worktrees.values());
  }
}

export const worktreeEngine = new WorktreeEngine();
