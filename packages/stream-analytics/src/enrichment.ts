import Redis from 'ioredis';
import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'stream-enrichment' });

/**
 * Data enrichment engine for real-time streams
 */
export class EnrichmentEngine {
  private redis: Redis | null = null;
  private cache: Map<string, CachedValue> = new Map();
  private cacheTTL: number = 300000; // 5 minutes

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
  }

  /**
   * Lookup enrichment from cache or external source
   */
  async lookupEnrichment<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number }
  ): Promise<T> {
    const ttl = options?.ttl || this.cacheTTL;

    // Check in-memory cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value as T;
    }

    // Check Redis cache
    if (this.redis) {
      const redisValue = await this.redis.get(`enrichment:${key}`);
      if (redisValue) {
        try {
          const parsed = JSON.parse(redisValue);
          this.cache.set(key, { value: parsed, timestamp: Date.now() });
          return parsed as T;
        } catch (error) {
          logger.warn({ error, key }, 'Failed to parse Redis value');
        }
      }
    }

    // Fetch from source
    const value = await fetcher();

    // Cache the result
    this.cache.set(key, { value, timestamp: Date.now() });

    if (this.redis) {
      await this.redis.setex(
        `enrichment:${key}`,
        Math.floor(ttl / 1000),
        JSON.stringify(value)
      );
    }

    return value;
  }

  /**
   * Enrich with external API call
   */
  async enrichFromAPI<T, R>(
    data: T,
    endpoint: string,
    transform?: (response: any) => R
  ): Promise<R> {
    try {
      const response = await axios.post(endpoint, data, {
        timeout: 5000,
      });

      if (transform) {
        return transform(response.data);
      }

      return response.data as R;
    } catch (error) {
      logger.error({ error, endpoint }, 'API enrichment failed');
      throw error;
    }
  }

  /**
   * Geolocation enrichment
   */
  async enrichGeolocation(ip: string): Promise<GeolocationData | null> {
    const cacheKey = `geo:${ip}`;

    return this.lookupEnrichment(cacheKey, async () => {
      // In production, use a real geolocation API
      // For now, return mock data
      return {
        ip,
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
      };
    });
  }

  /**
   * Entity resolution enrichment
   */
  async enrichEntity(entityId: string): Promise<EntityData | null> {
    const cacheKey = `entity:${entityId}`;

    return this.lookupEnrichment(cacheKey, async () => {
      // Fetch entity data from database or API
      return {
        id: entityId,
        type: 'person',
        attributes: {},
      };
    });
  }

  /**
   * Threat intelligence enrichment
   */
  async enrichThreatIntel(indicator: string): Promise<ThreatData | null> {
    const cacheKey = `threat:${indicator}`;

    return this.lookupEnrichment(
      cacheKey,
      async () => {
        // Query threat intelligence feeds
        return {
          indicator,
          severity: 'medium',
          categories: ['malware'],
          firstSeen: new Date(),
          lastSeen: new Date(),
        };
      },
      { ttl: 600000 } // 10 minutes for threat intel
    );
  }

  /**
   * Historical context enrichment
   */
  async enrichHistoricalContext<T>(
    key: string,
    current: T,
    windowSize: number = 10
  ): Promise<HistoricalContext<T>> {
    const historyKey = `history:${key}`;

    // Get historical values
    let history: T[] = [];

    if (this.redis) {
      const values = await this.redis.lrange(historyKey, 0, windowSize - 1);
      history = values.map((v) => JSON.parse(v));

      // Add current value
      await this.redis.lpush(historyKey, JSON.stringify(current));
      await this.redis.ltrim(historyKey, 0, windowSize - 1);
      await this.redis.expire(historyKey, 3600); // 1 hour
    }

    return {
      current,
      history,
      count: history.length + 1,
    };
  }

  /**
   * Multi-source data fusion
   */
  async enrichMultiSource<T>(
    data: T,
    enrichers: Array<(data: T) => Promise<any>>
  ): Promise<T & Record<string, any>> {
    const enrichments = await Promise.allSettled(
      enrichers.map((enricher) => enricher(data))
    );

    const result: any = { ...data };

    enrichments.forEach((enrichment, index) => {
      if (enrichment.status === 'fulfilled') {
        Object.assign(result, enrichment.value);
      } else {
        logger.warn(
          { error: enrichment.reason, index },
          'Enrichment failed'
        );
      }
    });

    return result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

interface CachedValue {
  value: any;
  timestamp: number;
}

export interface GeolocationData {
  ip: string;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface EntityData {
  id: string;
  type: string;
  attributes: Record<string, any>;
}

export interface ThreatData {
  indicator: string;
  severity: string;
  categories: string[];
  firstSeen: Date;
  lastSeen: Date;
}

export interface HistoricalContext<T> {
  current: T;
  history: T[];
  count: number;
}
