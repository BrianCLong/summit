import { BackupTarget, BackupStoreType, BackupScope, BackupFrequency } from './types.js';

export class BackupInventoryService {
  private static instance: BackupInventoryService;
  private targets: Map<string, BackupTarget> = new Map();

  private constructor() {}

  public static getInstance(): BackupInventoryService {
    if (!BackupInventoryService.instance) {
      BackupInventoryService.instance = new BackupInventoryService();
    }
    return BackupInventoryService.instance;
  }

  public addTarget(target: Omit<BackupTarget, 'createdAt' | 'updatedAt'>): BackupTarget {
    const now = new Date();
    const newTarget: BackupTarget = {
      ...target,
      createdAt: now,
      updatedAt: now,
    };
    this.targets.set(target.id, newTarget);
    return newTarget;
  }

  public updateTarget(id: string, updates: Partial<Omit<BackupTarget, 'id' | 'createdAt' | 'updatedAt'>>): BackupTarget | undefined {
    const existing = this.targets.get(id);
    if (!existing) return undefined;

    const updated: BackupTarget = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.targets.set(id, updated);
    return updated;
  }

  public getTarget(id: string): BackupTarget | undefined {
    return this.targets.get(id);
  }

  public listTargets(): BackupTarget[] {
    return Array.from(this.targets.values());
  }

  public reportStatus(id: string, success: boolean, timestamp: Date = new Date()): BackupTarget | undefined {
    const target = this.targets.get(id);
    if (!target) return undefined;

    const updates: Partial<BackupTarget> = {};
    if (success) {
      updates.lastSuccessAt = timestamp;
    } else {
      updates.lastFailureAt = timestamp;
    }

    return this.updateTarget(id, updates);
  }

  // For testing
  public clear(): void {
    this.targets.clear();
  }
}
