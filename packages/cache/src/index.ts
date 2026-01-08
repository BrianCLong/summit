import Redis from "ioredis";
import { Counter, Registry, collectDefaultMetrics, register as defaultRegistry } from "prom-client";

export type CacheClass = "critical_path" | "best_effort" | "static_metadata";
export type Consistency = "stale-OK" | "stale-unacceptable";

const DEFAULT_TTLS: Record<CacheClass, number> = {
  critical_path: 120,
  best_effort: 600,
  static_metadata: 43200,
};

export interface CacheGetOptions {
  namespace?: string;
  cacheClass?: CacheClass;
}

export interface CacheSetOptions extends CacheGetOptions {
  ttlSeconds?: number;
  consistency?: Consistency;
}

export interface CacheClientConfig {
  redisUrl?: string;
  redis?: Redis;
  namespace?: string;
  cacheClass?: CacheClass;
  defaultTTLSeconds?: number;
  disableMetrics?: boolean;
  registry?: Registry;
  disableEnvKey?: string;
  env?: string;
  fallbackToMemory?: boolean;
  devTtlCapSeconds?: number;
  logger?: Pick<typeof console, "warn" | "error" | "debug">;
}

interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
    metadata?: { namespace: string; cacheClass: CacheClass }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  close?(): Promise<void>;
  ping?(): Promise<void>;
  isConnected?(): boolean;
}

interface MemoryEntry {
  value: unknown;
  expiresAt?: number;
  metadata?: { namespace: string; cacheClass: CacheClass };
}

class MemoryCacheBackend implements CacheBackend {
  private store = new Map<string, MemoryEntry>();

  constructor(
    private readonly onEvict?: (metadata?: { namespace: string; cacheClass: CacheClass }) => void
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.onEvict?.(entry.metadata);
      return null;
    }

    return entry.value as T;
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
    metadata?: { namespace: string; cacheClass: CacheClass }
  ): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt, metadata });
  }

  async delete(key: string): Promise<void> {
    const entry = this.store.get(key);
    const deleted = this.store.delete(key);
    if (deleted) {
      this.onEvict?.(entry?.metadata);
    }
  }
}

class RedisCacheBackend implements CacheBackend {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
    _metadata?: { namespace: string; cacheClass: CacheClass }
  ): Promise<void> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, payload);
    } else {
      await this.redis.set(key, payload);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async ping(): Promise<void> {
    await this.redis.ping();
  }

  isConnected(): boolean {
    return this.redis.status === "ready";
  }
}

function getOrCreateCounter(registry: Registry, name: string, help: string): Counter<string> {
  const existing = registry.getSingleMetric(name) as Counter<string> | undefined;
  if (existing) return existing;

  return new Counter({
    name,
    help,
    labelNames: ["namespace", "class"],
    registers: [registry],
  });
}

export class CacheClient {
  private readonly registry: Registry;
  private readonly metricsEnabled: boolean;
  private readonly hitsCounter: Counter<string>;
  private readonly missesCounter: Counter<string>;
  private readonly evictionsCounter: Counter<string>;
  private readonly memoryBackend: MemoryCacheBackend;
  private readonly redisBackend?: RedisCacheBackend;
  private readonly defaultNamespace: string;
  private readonly defaultClass: CacheClass;
  private readonly defaultTTLSeconds?: number;
  private readonly disableEnvKey: string;
  private readonly fallbackToMemory: boolean;
  private readonly devTtlCapSeconds: number;
  private readonly env: string;
  private readonly logger: Pick<typeof console, "warn" | "error" | "debug">;

  constructor(private readonly config: CacheClientConfig = {}) {
    this.env = config.env ?? process.env.NODE_ENV ?? "development";
    this.disableEnvKey = config.disableEnvKey ?? "CACHE_DISABLED";
    this.defaultNamespace = config.namespace ?? "global";
    this.defaultClass = config.cacheClass ?? "best_effort";
    this.defaultTTLSeconds = config.defaultTTLSeconds;
    this.fallbackToMemory = config.fallbackToMemory ?? true;
    this.devTtlCapSeconds = config.devTtlCapSeconds ?? 300;
    this.logger = config.logger ?? console;

    this.registry = config.registry ?? defaultRegistry;
    this.metricsEnabled = !config.disableMetrics;

    if (this.metricsEnabled) {
      // Collect default metrics once for this registry.
      try {
        collectDefaultMetrics({ register: this.registry });
      } catch {
        // ignore duplicate collectors
      }
    }

    this.hitsCounter = getOrCreateCounter(
      this.registry,
      "cache_hits_total",
      "Total cache hits by namespace and class"
    );
    this.missesCounter = getOrCreateCounter(
      this.registry,
      "cache_misses_total",
      "Total cache misses by namespace and class"
    );
    this.evictionsCounter = getOrCreateCounter(
      this.registry,
      "cache_evictions_total",
      "Total cache evictions by namespace and class"
    );

    this.memoryBackend = new MemoryCacheBackend((metadata) => {
      if (!metadata) return;
      this.evictionsCounter.inc({ namespace: metadata.namespace, class: metadata.cacheClass });
    });

    if (config.redis || config.redisUrl) {
      const redis =
        config.redis ??
        new Redis(config.redisUrl as string, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        });
      this.redisBackend = new RedisCacheBackend(redis);
    }
  }

  private get disabled(): boolean {
    return process.env[this.disableEnvKey] === "true";
  }

  private namespacedKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private resolveTTL(cacheClass: CacheClass, override?: number): number | undefined {
    const baseTtl =
      override ?? this.defaultTTLSeconds ?? DEFAULT_TTLS[cacheClass] ?? DEFAULT_TTLS.best_effort;

    if (this.env !== "production" && baseTtl) {
      return Math.min(baseTtl, this.devTtlCapSeconds);
    }

    return baseTtl;
  }

  private async useBackend<T>(
    backend: CacheBackend,
    operation: (target: CacheBackend) => Promise<T>
  ): Promise<T> {
    if (backend === this.memoryBackend) {
      return operation(backend);
    }

    try {
      return await operation(backend);
    } catch (error) {
      this.logger.warn?.({ error }, "Cache backend failed, using memory fallback");
      if (this.fallbackToMemory) {
        return operation(this.memoryBackend);
      }
      throw error;
    }
  }

  private normalizeOptions(options?: CacheGetOptions | CacheSetOptions): {
    namespace: string;
    cacheClass: CacheClass;
  } {
    return {
      namespace: options?.namespace ?? this.defaultNamespace,
      cacheClass: options?.cacheClass ?? this.defaultClass,
    };
  }

  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    const { namespace, cacheClass } = this.normalizeOptions(options);
    const namespacedKey = this.namespacedKey(namespace, key);

    if (this.disabled) {
      this.missesCounter.inc({ namespace, class: cacheClass });
      return null;
    }

    const backend = this.redisBackend ?? this.memoryBackend;

    const result = await this.useBackend(backend, async (target) => target.get<T>(namespacedKey));

    if (result === null) {
      this.missesCounter.inc({ namespace, class: cacheClass });
    } else {
      this.hitsCounter.inc({ namespace, class: cacheClass });
    }

    return result;
  }

  async set(key: string, value: unknown, options?: CacheSetOptions): Promise<void> {
    const { namespace, cacheClass } = this.normalizeOptions(options);
    const ttlSeconds = this.resolveTTL(cacheClass, options?.ttlSeconds);
    const namespacedKey = this.namespacedKey(namespace, key);

    if (this.disabled) return;

    const backend = this.redisBackend ?? this.memoryBackend;
    await this.useBackend(backend, async (target) =>
      target.set(namespacedKey, value, ttlSeconds, { namespace, cacheClass })
    );
  }

  async delete(key: string, options?: CacheSetOptions): Promise<void> {
    const { namespace, cacheClass } = this.normalizeOptions(options);
    const namespacedKey = this.namespacedKey(namespace, key);
    const backend = this.redisBackend ?? this.memoryBackend;
    let targetBackend: CacheBackend = backend;

    await this.useBackend(backend, async (target) => {
      targetBackend = target;
      return target.delete(namespacedKey);
    });

    if (targetBackend !== this.memoryBackend) {
      this.evictionsCounter.inc({ namespace, class: cacheClass });
    }
  }

  async ping(): Promise<boolean> {
    if (this.disabled || !this.redisBackend) return false;
    try {
      await this.redisBackend.ping?.();
      return true;
    } catch (error) {
      this.logger.warn?.({ error }, "Cache ping failed");
      return false;
    }
  }

  async close(): Promise<void> {
    await this.redisBackend?.close?.();
  }

  isRedisConnected(): boolean {
    return Boolean(this.redisBackend?.isConnected?.());
  }
}

export function createCacheClient(config: CacheClientConfig = {}): CacheClient {
  return new CacheClient(config);
}
