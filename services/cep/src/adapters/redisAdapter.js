import Redis from 'ioredis';

export class RedisAdapter {
  constructor({ url, ttlSeconds = 3600 }) {
    this.client = new Redis(url);
    this.ttlSeconds = ttlSeconds;
  }

  async remember(key) {
    await this.client.set(key, '1', 'EX', this.ttlSeconds, 'NX');
  }

  async has(key) {
    const exists = await this.client.exists(key);
    return exists === 1;
  }
}
