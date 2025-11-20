/**
 * Base Market Data Feed
 * Abstract base class for all market data feeds
 */

import { EventEmitter } from 'events';
import { DataFeed, DataType } from '../types';

export abstract class BaseMarketDataFeed extends EventEmitter implements DataFeed {
  protected connected: boolean = false;
  protected subscribedSymbols: Set<string> = new Set();
  protected subscribedDataTypes: Set<DataType> = new Set();

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract subscribe(symbols: string[], dataTypes: DataType[]): Promise<void>;
  abstract unsubscribe(symbols: string[], dataTypes: DataType[]): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  protected addSubscriptions(symbols: string[], dataTypes: DataType[]): void {
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    dataTypes.forEach(type => this.subscribedDataTypes.add(type));
  }

  protected removeSubscriptions(symbols: string[], dataTypes: DataType[]): void {
    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));
    dataTypes.forEach(type => this.subscribedDataTypes.delete(type));
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  getSubscribedDataTypes(): DataType[] {
    return Array.from(this.subscribedDataTypes);
  }
}
