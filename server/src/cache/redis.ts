import Redis from 'ioredis';

export class RedisService {
  private pub: Redis;
  private sub: Redis;

  constructor(
    urlOrOpts: string | { url: string } = process.env.REDIS_URL ||
      'redis://localhost:6379',
  ) {
    const url = typeof urlOrOpts === 'string' ? urlOrOpts : urlOrOpts.url;
    this.pub = new Redis(url);
    this.sub = new Redis(url);
  }

  getClient(): Redis {
    return this.sub;
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.pub.publish(channel, message);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.sub.hgetall(key);
  }

  async hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return this.sub.hincrby(key, field, increment);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.sub.hdel(key, field);
  }

  async get(key: string): Promise<string | null> {
    return this.sub.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.sub.setex(key, seconds, value);
  }

  async ping(): Promise<string> {
    return this.sub.ping();
  }

  async close(): Promise<void> {
    await Promise.all([this.pub.quit(), this.sub.quit()]);
  }

  async del(key: string): Promise<number> {
    return this.sub.del(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (ttlSeconds !== undefined) {
      return this.sub.set(key, value, 'EX', ttlSeconds);
    }
    return this.sub.set(key, value);
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    return this.sub.keys(pattern);
  }
}
