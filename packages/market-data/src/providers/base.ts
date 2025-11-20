import {
  OHLCV,
  Quote,
  Trade,
  OrderBook,
  OptionQuote,
  CryptoQuote,
  ForexQuote,
  BondQuote,
  CorporateAction,
  MarketStats,
  Security,
  HistoricalDataQuery,
  TimeInterval,
  AssetClass
} from '../types';

/**
 * Base interface for all market data providers
 */
export interface IMarketDataProvider {
  readonly name: string;
  readonly supportsRealtime: boolean;
  readonly supportsHistorical: boolean;
  readonly supportedAssetClasses: AssetClass[];

  /**
   * Initialize connection to the data provider
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the data provider
   */
  disconnect(): Promise<void>;

  /**
   * Check if the provider is connected
   */
  isConnected(): boolean;

  /**
   * Get real-time quote for a symbol
   */
  getQuote(symbol: string, assetClass?: AssetClass): Promise<Quote>;

  /**
   * Get real-time quotes for multiple symbols
   */
  getQuotes(symbols: string[], assetClass?: AssetClass): Promise<Quote[]>;

  /**
   * Get historical OHLCV data
   */
  getHistoricalData(query: HistoricalDataQuery): Promise<OHLCV[]>;

  /**
   * Get market statistics for a symbol
   */
  getMarketStats(symbol: string): Promise<MarketStats>;

  /**
   * Search for securities by name or symbol
   */
  searchSecurities(query: string): Promise<Security[]>;

  /**
   * Get corporate actions for a symbol
   */
  getCorporateActions(symbol: string, startDate: Date, endDate: Date): Promise<CorporateAction[]>;
}

/**
 * Extended interface for providers supporting real-time streaming
 */
export interface IStreamingProvider extends IMarketDataProvider {
  /**
   * Subscribe to real-time quotes
   */
  subscribeQuotes(symbols: string[], callback: (quote: Quote) => void): Promise<string>;

  /**
   * Subscribe to real-time trades
   */
  subscribeTrades(symbols: string[], callback: (trade: Trade) => void): Promise<string>;

  /**
   * Unsubscribe from a data stream
   */
  unsubscribe(subscriptionId: string): Promise<void>;
}

/**
 * Interface for options data providers
 */
export interface IOptionsProvider extends IMarketDataProvider {
  /**
   * Get options chain for an underlying symbol
   */
  getOptionsChain(
    underlying: string,
    expirationDate?: Date
  ): Promise<OptionQuote[]>;

  /**
   * Get available expiration dates for options on an underlying
   */
  getExpirationDates(underlying: string): Promise<Date[]>;

  /**
   * Get option quote by contract symbol
   */
  getOptionQuote(optionSymbol: string): Promise<OptionQuote>;
}

/**
 * Interface for cryptocurrency data providers
 */
export interface ICryptoProvider extends IMarketDataProvider {
  /**
   * Get cryptocurrency quote
   */
  getCryptoQuote(symbol: string): Promise<CryptoQuote>;

  /**
   * Get order book depth
   */
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  /**
   * Get supported trading pairs
   */
  getTradingPairs(): Promise<string[]>;
}

/**
 * Interface for forex data providers
 */
export interface IForexProvider extends IMarketDataProvider {
  /**
   * Get forex quote
   */
  getForexQuote(pair: string): Promise<ForexQuote>;

  /**
   * Get supported currency pairs
   */
  getCurrencyPairs(): Promise<string[]>;
}

/**
 * Interface for fixed income/bond data providers
 */
export interface IBondProvider extends IMarketDataProvider {
  /**
   * Get bond quote by CUSIP or ISIN
   */
  getBondQuote(identifier: string): Promise<BondQuote>;

  /**
   * Search bonds by criteria
   */
  searchBonds(criteria: {
    issuer?: string;
    rating?: string;
    maturityMin?: Date;
    maturityMax?: Date;
    yieldMin?: number;
    yieldMax?: number;
  }): Promise<BondQuote[]>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
  rateLimit?: {
    maxRequests: number;
    perMilliseconds: number;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * Provider status
 */
export enum ProviderStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

/**
 * Base abstract class for market data providers
 */
export abstract class BaseMarketDataProvider implements IMarketDataProvider {
  abstract readonly name: string;
  abstract readonly supportsRealtime: boolean;
  abstract readonly supportsHistorical: boolean;
  abstract readonly supportedAssetClasses: AssetClass[];

  protected status: ProviderStatus = ProviderStatus.DISCONNECTED;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.status === ProviderStatus.CONNECTED;
  }

  abstract getQuote(symbol: string, assetClass?: AssetClass): Promise<Quote>;
  abstract getQuotes(symbols: string[], assetClass?: AssetClass): Promise<Quote[]>;
  abstract getHistoricalData(query: HistoricalDataQuery): Promise<OHLCV[]>;
  abstract getMarketStats(symbol: string): Promise<MarketStats>;
  abstract searchSecurities(query: string): Promise<Security[]>;
  abstract getCorporateActions(symbol: string, startDate: Date, endDate: Date): Promise<CorporateAction[]>;

  protected getStatus(): ProviderStatus {
    return this.status;
  }

  protected setStatus(status: ProviderStatus): void {
    this.status = status;
  }
}
