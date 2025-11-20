/**
 * Market Data Types
 * Comprehensive type definitions for market data across all asset classes
 */

export interface Ticker {
  symbol: string;
  exchange: string;
  assetClass: AssetClass;
}

export enum AssetClass {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  FUTURES = 'FUTURES',
  OPTIONS = 'OPTIONS',
  COMMODITY = 'COMMODITY',
}

export interface PriceData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  trades?: number;
}

export interface Quote {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  last: number;
  lastSize: number;
}

export interface Trade {
  symbol: string;
  timestamp: Date;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  conditions?: string[];
}

export interface OrderBook {
  symbol: string;
  timestamp: Date;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

export interface OptionsData {
  symbol: string;
  underlying: string;
  strike: number;
  expiry: Date;
  type: 'CALL' | 'PUT';
  timestamp: Date;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

export interface EconomicIndicator {
  name: string;
  country: string;
  timestamp: Date;
  value: number;
  previousValue?: number;
  forecast?: number;
  unit: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface NewsEvent {
  id: string;
  timestamp: Date;
  source: string;
  headline: string;
  content: string;
  symbols: string[];
  sentiment?: number; // -1 to 1
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  topics: string[];
}

export interface MarketDataConfig {
  symbols: string[];
  assetClass: AssetClass;
  dataTypes: DataType[];
  updateInterval?: number; // milliseconds
  enableCache?: boolean;
  cacheExpiry?: number; // seconds
}

export enum DataType {
  PRICE = 'PRICE',
  QUOTE = 'QUOTE',
  TRADE = 'TRADE',
  ORDER_BOOK = 'ORDER_BOOK',
  OPTIONS = 'OPTIONS',
  NEWS = 'NEWS',
  ECONOMIC = 'ECONOMIC',
}

export interface DataFeed {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[], dataTypes: DataType[]): Promise<void>;
  unsubscribe(symbols: string[], dataTypes: DataType[]): Promise<void>;
  isConnected(): boolean;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}
