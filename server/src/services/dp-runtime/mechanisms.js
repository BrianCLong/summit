"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyBudgetLedger = exports.GaussianMechanism = exports.LaplaceMechanism = void 0;
class LaplaceMechanism {
    addNoise(value, sensitivity, epsilon, delta) {
        const scale = sensitivity / epsilon;
        const u = Math.random() - 0.5;
        return value - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
}
exports.LaplaceMechanism = LaplaceMechanism;
class GaussianMechanism {
    addNoise(value, sensitivity, epsilon, delta = 1e-5) {
        const scale = (sensitivity / epsilon) * Math.sqrt(2 * Math.log(1.25 / delta));
        const u1 = Math.random();
        const u2 = Math.random();
        const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        return value + randStdNormal * scale;
    }
}
exports.GaussianMechanism = GaussianMechanism;
class PrivacyBudgetLedger {
    redis;
    defaultEpsilon = 10.0; // Total budget per window
    windowSeconds = 86400; // 24 hours
    constructor() {
        this.redis = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    // Atomic check and consume
    async consumeBudgetIfAvailable(userId, cost) {
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
    async getRemainingBudget(userId) {
        const key = `privacy:budget:${userId}`;
        const used = await this.redis.get(key);
        return this.defaultEpsilon - (used ? parseFloat(used) : 0);
    }
}
exports.PrivacyBudgetLedger = PrivacyBudgetLedger;
