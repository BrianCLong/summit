import Redis, { Cluster, type ClusterNode } from 'ioredis';
import config from '../config/index.js';

type RedisLike = Redis | Cluster;

function parseClusterNodes(nodes: string[]): ClusterNode[] {
  return (nodes || [])
    .map((node) => {
      const [host, port] = node.split(':');
      const parsedPort = Number(port || config.redis.port);
      if (!host) return null;
      return { host, port: Number.isNaN(parsedPort) ? config.redis.port : parsedPort };
    })
    .filter(Boolean) as ClusterNode[];
}

export class RedisService {
  private pub: RedisLike;
  private sub: RedisLike;

  constructor(
    urlOrOpts: string | { url?: string; clusterNodes?: string[] } =
      process.env.REDIS_URL || 'redis://localhost:6379',
  ) {
    const url = typeof urlOrOpts === 'string' ? urlOrOpts : urlOrOpts.url;
    const clusterNodes =
      (typeof urlOrOpts === 'string' ? config.redis.clusterNodes : urlOrOpts.clusterNodes) ||
      [];
    const parsedNodes = parseClusterNodes(clusterNodes);
    const shouldUseCluster =
      (clusterNodes?.length ?? 0) > 0 || config.redis.useCluster;

    if (shouldUseCluster && parsedNodes.length) {
      const redisOptions = {
        redisOptions: {
          tls: config.redis.tls ? {} : undefined,
          lazyConnect: true,
        },
      };
      this.pub = new Cluster(parsedNodes, redisOptions);
      this.sub = new Cluster(parsedNodes, redisOptions);
    } else {
      const resolvedUrl =
        url || `redis://${config.redis.host}:${config.redis.port}`;
      this.pub = new Redis(resolvedUrl);
      this.sub = new Redis(resolvedUrl);
    }
  }

  getClient(): RedisLike {
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
