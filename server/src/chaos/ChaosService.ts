import type { Redis } from 'ioredis';
import { getRedisClient } from '../db/redis.js';

export type ChaosToggle = 'SLOW_QUERIES' | 'SHARD_DROPOUT' | 'MESSAGE_BURST';

let redis: Redis | null = null;
try {
  redis = getRedisClient();
} catch (e) {
  // console.error("Failed to get redis client for chaos", e);
}

export class ChaosService {
    static async enable(toggle: ChaosToggle, durationSeconds: number = 300) {
        if (!redis) return;
        // Only allow in stage/dev ideally, handled by caller or config check
        await redis.set(`chaos:${toggle}`, '1', 'EX', durationSeconds);
    }

    static async disable(toggle: ChaosToggle) {
        if (!redis) return;
        await redis.del(`chaos:${toggle}`);
    }

    static async isEnabled(toggle: ChaosToggle): Promise<boolean> {
        if (!redis) return false;
        const val = await redis.get(`chaos:${toggle}`);
        return val === '1';
    }
}
