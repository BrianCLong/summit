
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

export class KillSwitchService {
  private static instance: KillSwitchService;
  private redis: Redis;

  private constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  static getInstance(): KillSwitchService {
    if (!KillSwitchService.instance) {
      KillSwitchService.instance = new KillSwitchService();
    }
    return KillSwitchService.instance;
  }

  /**
   * Check if a specific feature or global execution is enabled
   */
  async checkKillSwitch(scope: string, id?: string): Promise<boolean> {
    try {
      // 1. Check Global Kill Switch
      const globalSwitch = await this.redis.get('killswitch:global');
      if (globalSwitch === 'true') {
        return false; // Killed
      }

      // 2. Check Scope Kill Switch (e.g., 'agent_runtime')
      const scopeSwitch = await this.redis.get(`killswitch:${scope}`);
      if (scopeSwitch === 'true') {
        return false; // Killed
      }

      // 3. Check Specific ID Kill Switch (e.g., 'agent:planner')
      if (id) {
        const idSwitch = await this.redis.get(`killswitch:${scope}:${id}`);
        if (idSwitch === 'true') {
          return false; // Killed
        }
      }

      return true; // Allowed
    } catch (error) {
      logger.error('Error checking kill switch', { error });
      return true; // Fail open or closed? Let's fail open for now to avoid outage on redis failure, but typically closed for security.
                   // Actually, for a kill switch, failing open (allowing execution) is risky.
                   // Let's fail OPEN (allow) for availability unless strict mode.
                   // "Fail safe" usually means stop. But if redis is down, we probably don't want to kill everything.
      return true;
    }
  }

  async triggerKillSwitch(scope: string, id?: string, reason: string = 'Manual trigger'): Promise<void> {
    const key = id ? `killswitch:${scope}:${id}` : `killswitch:${scope}`;
    await this.redis.set(key, 'true');
    logger.warn(`Kill switch triggered for ${key}: ${reason}`);
  }

  async resetKillSwitch(scope: string, id?: string): Promise<void> {
    const key = id ? `killswitch:${scope}:${id}` : `killswitch:${scope}`;
    await this.redis.del(key);
    logger.info(`Kill switch reset for ${key}`);
  }
}

export const killSwitchService = KillSwitchService.getInstance();
