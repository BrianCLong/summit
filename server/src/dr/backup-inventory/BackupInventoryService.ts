import { BackupTarget, BackupStoreType, BackupScope, BackupFrequency } from './types.js';
import { RedisService } from '../../cache/redis.js';
import logger from '../../utils/logger.js';

export class BackupInventoryService {
  private static instance: BackupInventoryService;
  private targets: Map<string, BackupTarget> = new Map();
  private redis: RedisService;
  private readonly REDIS_KEY = 'backup:inventory:targets';

  private constructor() {
    this.redis = RedisService.getInstance();
    this.loadFromRedis().catch(err => {
      logger.error('Failed to load backup inventory from Redis', err);
    });
  }

  public static getInstance(): BackupInventoryService {
    if (!BackupInventoryService.instance) {
      BackupInventoryService.instance = new BackupInventoryService();
    }
    return BackupInventoryService.instance;
  }

  private async loadFromRedis() {
    try {
      const data = await this.redis.get(this.REDIS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.targets = new Map(parsed.map((t: any) => [t.id, {
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          lastSuccessAt: t.lastSuccessAt ? new Date(t.lastSuccessAt) : undefined,
          lastFailureAt: t.lastFailureAt ? new Date(t.lastFailureAt) : undefined,
        }]));
      }
    } catch (error: any) {
      logger.error('Error loading backup inventory from Redis', error);
    }
  }

  private async saveToRedis() {
    try {
      const targetsArray = Array.from(this.targets.values());
      await this.redis.set(this.REDIS_KEY, JSON.stringify(targetsArray));
    } catch (error: any) {
      logger.error('Error saving backup inventory to Redis', error);
    }
  }

  public async addTarget(target: Omit<BackupTarget, 'createdAt' | 'updatedAt'>): Promise<BackupTarget> {
    const now = new Date();
    const newTarget: BackupTarget = {
      ...target,
      createdAt: now,
      updatedAt: now,
    };
    this.targets.set(target.id, newTarget);
    await this.saveToRedis();
    return newTarget;
  }

  public async updateTarget(id: string, updates: Partial<Omit<BackupTarget, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BackupTarget | undefined> {
    const existing = this.targets.get(id);
    if (!existing) return undefined;

    const updated: BackupTarget = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.targets.set(id, updated);
    await this.saveToRedis();
    return updated;
  }

  public getTarget(id: string): BackupTarget | undefined {
    return this.targets.get(id);
  }

  public listTargets(): BackupTarget[] {
    return Array.from(this.targets.values());
  }

  public async reportStatus(id: string, success: boolean, timestamp: Date = new Date()): Promise<BackupTarget | undefined> {
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
  public async clear(): Promise<void> {
    this.targets.clear();
    await this.redis.del(this.REDIS_KEY);
  }
}
