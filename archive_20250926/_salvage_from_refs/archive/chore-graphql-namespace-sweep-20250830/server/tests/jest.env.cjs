// Ensure deterministic tests without Redis
process.env.REDIS_DISABLE = process.env.REDIS_DISABLE || '1';

