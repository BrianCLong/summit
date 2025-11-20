import { z } from 'zod';
import Decimal from 'decimal.js';

/**
 * Asset class enumeration
 */
export enum AssetClass {
  EQUITY = 'EQUITY',
  OPTION = 'OPTION',
  FUTURE = 'FUTURE',
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  COMMODITY = 'COMMODITY',
  BOND = 'BOND',
  ETF = 'ETF',
  INDEX = 'INDEX',
  MUTUAL_FUND = 'MUTUAL_FUND'
}

/**
 * Market venue/exchange types
 */
export enum MarketVenue {
  NYSE = 'NYSE',
  NASDAQ = 'NASDAQ',
  ARCA = 'ARCA',
  BATS = 'BATS',
  IEX = 'IEX',
  CBOE = 'CBOE',
  CME = 'CME',
  ICE = 'ICE',
  BINANCE = 'BINANCE',
  COINBASE = 'COINBASE',
  KRAKEN = 'KRAKEN',
  DARK_POOL = 'DARK_POOL',
  OTC = 'OTC'
}

/**
 * OHLCV (Open, High, Low, Close, Volume) bar data
 */
export const OHLCVSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  vwap: z.number().positive().optional(), // Volume-weighted average price
  trades: z.number().int().nonnegative().optional(), // Number of trades
  assetClass: z.nativeEnum(AssetClass),
  venue: z.nativeEnum(MarketVenue).optional(),
});

export type OHLCV = z.infer<typeof OHLCVSchema>;

/**
 * Real-time quote data
 */
export const QuoteSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  bidSize: z.number().int().positive(),
  askSize: z.number().int().positive(),
  last: z.number().positive().optional(),
  lastSize: z.number().int().positive().optional(),
  volume: z.number().nonnegative().optional(),
  venue: z.nativeEnum(MarketVenue).optional(),
});

export type Quote = z.infer<typeof QuoteSchema>;

/**
 * Trade tick data
 */
export const TradeSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  price: z.number().positive(),
  size: z.number().int().positive(),
  venue: z.nativeEnum(MarketVenue).optional(),
  conditions: z.array(z.string()).optional(), // Trade conditions/qualifiers
  tapeId: z.string().optional(), // SIP tape identifier
});

export type Trade = z.infer<typeof TradeSchema>;

/**
 * Level 2 order book data
 */
export const OrderBookLevelSchema = z.object({
  price: z.number().positive(),
  size: z.number().int().positive(),
  orders: z.number().int().positive().optional(), // Number of orders at this level
});

export const OrderBookSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
  venue: z.nativeEnum(MarketVenue).optional(),
});

export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>;
export type OrderBook = z.infer<typeof OrderBookSchema>;

/**
 * Options contract specification
 */
export const OptionContractSchema = z.object({
  symbol: z.string(),
  underlying: z.string(),
  expiration: z.date(),
  strike: z.number().positive(),
  optionType: z.enum(['CALL', 'PUT']),
  style: z.enum(['AMERICAN', 'EUROPEAN']),
  contractSize: z.number().int().positive().default(100),
  currency: z.string().default('USD'),
});

export type OptionContract = z.infer<typeof OptionContractSchema>;

/**
 * Options market data with Greeks
 */
export const OptionQuoteSchema = z.object({
  contract: OptionContractSchema,
  timestamp: z.date(),
  bid: z.number().nonnegative(),
  ask: z.number().positive(),
  last: z.number().positive().optional(),
  volume: z.number().int().nonnegative().optional(),
  openInterest: z.number().int().nonnegative().optional(),
  impliedVolatility: z.number().nonnegative().optional(),
  delta: z.number().optional(),
  gamma: z.number().optional(),
  theta: z.number().optional(),
  vega: z.number().optional(),
  rho: z.number().optional(),
});

export type OptionQuote = z.infer<typeof OptionQuoteSchema>;

/**
 * Cryptocurrency market data
 */
export const CryptoQuoteSchema = z.object({
  symbol: z.string(), // e.g., "BTC-USD"
  baseCurrency: z.string(), // e.g., "BTC"
  quoteCurrency: z.string(), // e.g., "USD"
  timestamp: z.date(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  last: z.number().positive().optional(),
  volume24h: z.number().nonnegative().optional(),
  volumeQuote24h: z.number().nonnegative().optional(),
  marketCap: z.number().nonnegative().optional(),
  circulatingSupply: z.number().nonnegative().optional(),
  venue: z.nativeEnum(MarketVenue),
});

export type CryptoQuote = z.infer<typeof CryptoQuoteSchema>;

/**
 * Forex currency pair quote
 */
export const ForexQuoteSchema = z.object({
  pair: z.string(), // e.g., "EUR/USD"
  baseCurrency: z.string(),
  quoteCurrency: z.string(),
  timestamp: z.date(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  mid: z.number().positive().optional(),
  spread: z.number().nonnegative().optional(),
});

export type ForexQuote = z.infer<typeof ForexQuoteSchema>;

/**
 * Bond/fixed income security data
 */
export const BondQuoteSchema = z.object({
  cusip: z.string(),
  isin: z.string().optional(),
  issuer: z.string(),
  timestamp: z.date(),
  price: z.number().positive(), // Clean price
  yield: z.number(), // Yield to maturity
  accruedInterest: z.number().nonnegative().optional(),
  duration: z.number().optional(), // Macaulay duration
  convexity: z.number().optional(),
  maturityDate: z.date(),
  couponRate: z.number().nonnegative(),
  faceValue: z.number().positive().default(1000),
  rating: z.string().optional(), // Credit rating (e.g., "AAA")
});

export type BondQuote = z.infer<typeof BondQuoteSchema>;

/**
 * Corporate action types
 */
export enum CorporateActionType {
  SPLIT = 'SPLIT',
  REVERSE_SPLIT = 'REVERSE_SPLIT',
  DIVIDEND = 'DIVIDEND',
  SPECIAL_DIVIDEND = 'SPECIAL_DIVIDEND',
  SPINOFF = 'SPINOFF',
  MERGER = 'MERGER',
  ACQUISITION = 'ACQUISITION',
  RIGHTS_ISSUE = 'RIGHTS_ISSUE',
  STOCK_DIVIDEND = 'STOCK_DIVIDEND',
  NAME_CHANGE = 'NAME_CHANGE',
  DELISTING = 'DELISTING'
}

/**
 * Corporate action event
 */
export const CorporateActionSchema = z.object({
  symbol: z.string(),
  actionType: z.nativeEnum(CorporateActionType),
  announcementDate: z.date(),
  exDate: z.date(), // Ex-dividend or ex-split date
  paymentDate: z.date().optional(),
  recordDate: z.date().optional(),
  ratio: z.number().positive().optional(), // Split ratio (e.g., 2 for 2-for-1 split)
  amount: z.number().nonnegative().optional(), // Dividend amount per share
  currency: z.string().default('USD'),
  description: z.string().optional(),
});

export type CorporateAction = z.infer<typeof CorporateActionSchema>;

/**
 * Market statistics and summary data
 */
export const MarketStatsSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  previousClose: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().nonnegative(),
  avgVolume: z.number().nonnegative().optional(),
  marketCap: z.number().nonnegative().optional(),
  peRatio: z.number().optional(),
  week52High: z.number().positive().optional(),
  week52Low: z.number().positive().optional(),
  ytdChange: z.number().optional(),
});

export type MarketStats = z.infer<typeof MarketStatsSchema>;

/**
 * Snapshot of multiple securities
 */
export const MarketSnapshotSchema = z.object({
  timestamp: z.date(),
  quotes: z.array(QuoteSchema),
  trades: z.array(TradeSchema).optional(),
  stats: z.array(MarketStatsSchema).optional(),
});

export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

/**
 * Time interval for historical data
 */
export enum TimeInterval {
  TICK = 'TICK',
  SECOND_1 = '1s',
  SECOND_5 = '5s',
  SECOND_15 = '15s',
  SECOND_30 = '30s',
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  MINUTE_30 = '30m',
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1M',
  YEAR_1 = '1y'
}

/**
 * Historical data query parameters
 */
export const HistoricalDataQuerySchema = z.object({
  symbol: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  interval: z.nativeEnum(TimeInterval),
  assetClass: z.nativeEnum(AssetClass),
  adjustForSplits: z.boolean().default(true),
  adjustForDividends: z.boolean().default(false),
});

export type HistoricalDataQuery = z.infer<typeof HistoricalDataQuerySchema>;

/**
 * Dark pool trade data
 */
export const DarkPoolTradeSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  price: z.number().positive(),
  size: z.number().int().positive(),
  venue: z.string(), // Dark pool identifier
  isBlock: z.boolean(), // Block trade indicator
});

export type DarkPoolTrade = z.infer<typeof DarkPoolTradeSchema>;

/**
 * Security master record
 */
export const SecuritySchema = z.object({
  symbol: z.string(),
  name: z.string(),
  assetClass: z.nativeEnum(AssetClass),
  exchange: z.nativeEnum(MarketVenue).optional(),
  currency: z.string().default('USD'),
  cusip: z.string().optional(),
  isin: z.string().optional(),
  sedol: z.string().optional(),
  figi: z.string().optional(), // Financial Instrument Global Identifier
  sector: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  listingDate: z.date().optional(),
  delistingDate: z.date().optional(),
});

export type Security = z.infer<typeof SecuritySchema>;
