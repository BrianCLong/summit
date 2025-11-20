/**
 * Market Data Pipeline
 * Orchestrates multiple data feeds and normalizes data
 */

import { EventEmitter } from 'events';
import { DataFeed, DataType, AssetClass } from './types';
import { StockMarketDataFeed } from './feeds/stock-feed';
import { CryptoMarketDataFeed } from './feeds/crypto-feed';

export interface PipelineConfig {
  feeds: FeedConfig[];
  enableCache?: boolean;
  cacheExpiry?: number;
}

export interface FeedConfig {
  type: AssetClass;
  config: any;
}

export class MarketDataPipeline extends EventEmitter {
  private feeds: Map<AssetClass, DataFeed> = new Map();
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    super();
    this.config = config;
    this.initializeFeeds();
  }

  private initializeFeeds(): void {
    for (const feedConfig of this.config.feeds) {
      let feed: DataFeed;

      switch (feedConfig.type) {
        case AssetClass.STOCK:
          feed = new StockMarketDataFeed(feedConfig.config);
          break;
        case AssetClass.CRYPTO:
          feed = new CryptoMarketDataFeed(feedConfig.config);
          break;
        default:
          throw new Error(`Unsupported asset class: ${feedConfig.type}`);
      }

      // Forward all events from feeds
      feed.on('price', (data) => this.emit('price', data));
      feed.on('quote', (data) => this.emit('quote', data));
      feed.on('trade', (data) => this.emit('trade', data));
      feed.on('orderbook', (data) => this.emit('orderbook', data));
      feed.on('error', (error) => this.emit('error', error));

      this.feeds.set(feedConfig.type, feed);
    }
  }

  async connect(): Promise<void> {
    const promises = Array.from(this.feeds.values()).map(feed => feed.connect());
    await Promise.all(promises);
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    const promises = Array.from(this.feeds.values()).map(feed => feed.disconnect());
    await Promise.all(promises);
    this.emit('disconnected');
  }

  async subscribe(
    assetClass: AssetClass,
    symbols: string[],
    dataTypes: DataType[]
  ): Promise<void> {
    const feed = this.feeds.get(assetClass);
    if (!feed) {
      throw new Error(`No feed configured for asset class: ${assetClass}`);
    }

    await feed.subscribe(symbols, dataTypes);
  }

  async unsubscribe(
    assetClass: AssetClass,
    symbols: string[],
    dataTypes: DataType[]
  ): Promise<void> {
    const feed = this.feeds.get(assetClass);
    if (!feed) {
      return;
    }

    await feed.unsubscribe(symbols, dataTypes);
  }

  getFeed(assetClass: AssetClass): DataFeed | undefined {
    return this.feeds.get(assetClass);
  }

  getActiveFeedCount(): number {
    return Array.from(this.feeds.values()).filter(feed => feed.isConnected()).length;
  }
}
