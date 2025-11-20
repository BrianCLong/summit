/**
 * Market Data Cache
 * Redis-based caching for market data
 */

import { createClient, RedisClientType } from 'redis';
import { PriceData, Quote, Trade } from './types';

export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  ttl?: number; // Time to live in seconds
}

export class MarketDataCache {
  private client: RedisClientType;
  private config: CacheConfig;
  private connected: boolean = false;

  constructor(config: CacheConfig = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      ttl: config.ttl || 60,
      ...config,
    };

    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
      },
      password: this.config.password,
      database: this.config.db,
    });

    this.client.on('error', (err) => {
      console.error('Redis cache error:', err);
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async cachePrice(symbol: string, data: PriceData): Promise<void> {
    const key = `price:${symbol}`;
    await this.client.setEx(
      key,
      this.config.ttl!,
      JSON.stringify(data)
    );
  }

  async getPrice(symbol: string): Promise<PriceData | null> {
    const key = `price:${symbol}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheQuote(symbol: string, data: Quote): Promise<void> {
    const key = `quote:${symbol}`;
    await this.client.setEx(
      key,
      this.config.ttl!,
      JSON.stringify(data)
    );
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const key = `quote:${symbol}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheTrades(symbol: string, trades: Trade[]): Promise<void> {
    const key = `trades:${symbol}`;
    const pipeline = this.client.multi();

    for (const trade of trades) {
      pipeline.rPush(key, JSON.stringify(trade));
    }

    pipeline.expire(key, this.config.ttl!);
    pipeline.lTrim(key, -1000, -1); // Keep last 1000 trades

    await pipeline.exec();
  }

  async getTrades(symbol: string, limit: number = 100): Promise<Trade[]> {
    const key = `trades:${symbol}`;
    const data = await this.client.lRange(key, -limit, -1);
    return data.map(item => JSON.parse(item));
  }

  async cachePriceHistory(
    symbol: string,
    timeframe: string,
    data: PriceData[]
  ): Promise<void> {
    const key = `history:${symbol}:${timeframe}`;
    await this.client.setEx(
      key,
      this.config.ttl! * 10, // Longer TTL for historical data
      JSON.stringify(data)
    );
  }

  async getPriceHistory(
    symbol: string,
    timeframe: string
  ): Promise<PriceData[] | null> {
    const key = `history:${symbol}:${timeframe}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async flush(): Promise<void> {
    await this.client.flushDb();
  }
}
