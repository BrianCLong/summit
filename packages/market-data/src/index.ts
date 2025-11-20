/**
 * @intelgraph/market-data
 *
 * Comprehensive market data integration for financial intelligence platform.
 * Supports real-time and historical data for equities, options, crypto, forex,
 * commodities, and fixed income securities.
 */

export * from './types';
export * from './providers';

// Re-export commonly used types for convenience
export type {
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
} from './types';

export {
  AssetClass,
  MarketVenue,
  TimeInterval,
  CorporateActionType,
} from './types';

export type {
  IMarketDataProvider,
  IStreamingProvider,
  IOptionsProvider,
  ICryptoProvider,
  IForexProvider,
  IBondProvider,
  ProviderConfig,
} from './providers';

export {
  BaseMarketDataProvider,
  AlphaVantageProvider,
  PolygonProvider,
  ProviderRegistry,
  globalProviderRegistry,
  ProviderStatus,
} from './providers';
