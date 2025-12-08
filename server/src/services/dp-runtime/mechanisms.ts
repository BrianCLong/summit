import { Redis } from 'ioredis';

// Basic interface for DP mechanism
export interface DPMechanism {
  addNoise(value: number, sensitivity: number, epsilon: number, delta?: number): number;
}

export class LaplaceMechanism implements DPMechanism {
  addNoise(value: number, sensitivity: number, epsilon: number, delta?: number): number {
    const scale = sensitivity / epsilon;
    const u = Math.random() - 0.5;
    return value - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

export class GaussianMechanism implements DPMechanism {
  addNoise(value: number, sensitivity: number, epsilon: number, delta: number = 1e-5): number {
    const scale = (sensitivity / epsilon) * Math.sqrt(2 * Math.log(1.25 / delta));
    const u1 = Math.random();
    const u2 = Math.random();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return value + randStdNormal * scale;
  }
}

export class PrivacyBudgetLedger {
  private redis: Redis;
  private readonly defaultEpsilon: number = 10.0; // Total budget per window
  private readonly windowSeconds: number = 86400; // 24 hours

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Atomic check and consume
  async consumeBudgetIfAvailable(userId: string, cost: number): Promise<boolean> {
    const key = `privacy:budget:${userId}`;

    // Use a Lua script to ensure atomicity
    // ARGV[1]: cost
    // ARGV[2]: limit
    // ARGV[3]: ttl
    const script = `
      local current = tonumber(redis.call('get', KEYS[1]) or '0')
      local cost = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])

      if current + cost > limit then
        return 0
      else
        redis.call('incrbyfloat', KEYS[1], cost)
        redis.call('expire', KEYS[1], ARGV[3])
        return 1
      end
    `;

    const result = await this.redis.eval(script, 1, key, cost, this.defaultEpsilon, this.windowSeconds);
    return result === 1;
  }

  async getRemainingBudget(userId: string): Promise<number> {
    const key = `privacy:budget:${userId}`;
    const used = await this.redis.get(key);
    return this.defaultEpsilon - (used ? parseFloat(used) : 0);
  }
}
