# @intelgraph/market-data

Comprehensive market data integration package for the IntelGraph financial intelligence platform.

## Features

- **Multi-Asset Support**: Equities, options, crypto, forex, commodities, bonds, ETFs, indices
- **Real-time Data**: Live quotes, trades, and order book data
- **Historical Data**: OHLCV bars with configurable intervals
- **Multiple Providers**: Alpha Vantage, Polygon.io, IEX Cloud, Yahoo Finance
- **Streaming Support**: WebSocket-based real-time data streams
- **Corporate Actions**: Splits, dividends, mergers, and other corporate events
- **Type Safety**: Full TypeScript support with Zod validation

## Installation

```bash
pnpm add @intelgraph/market-data
```

## Quick Start

```typescript
import {
  ProviderRegistry,
  AlphaVantageProvider,
  PolygonProvider,
  AssetClass,
  TimeInterval
} from '@intelgraph/market-data';

// Create and register providers
const registry = new ProviderRegistry();

const alphaVantage = new AlphaVantageProvider({
  apiKey: process.env.ALPHA_VANTAGE_API_KEY!
});
await alphaVantage.connect();
registry.registerProvider('alpha-vantage', alphaVantage);

const polygon = new PolygonProvider({
  apiKey: process.env.POLYGON_API_KEY!
});
await polygon.connect();
registry.registerProvider('polygon', polygon);

// Get real-time quote
const quote = await alphaVantage.getQuote('AAPL');
console.log(`AAPL: $${quote.last} @ ${quote.timestamp}`);

// Get historical data
const historicalData = await polygon.getHistoricalData({
  symbol: 'AAPL',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  interval: TimeInterval.DAY_1,
  assetClass: AssetClass.EQUITY,
  adjustForSplits: true,
  adjustForDividends: false,
});

// Stream real-time trades
const subscriptionId = await polygon.subscribeTrades(['AAPL', 'GOOGL'], (trade) => {
  console.log(`${trade.symbol}: ${trade.price} x ${trade.size}`);
});
```

## Supported Data Providers

### Alpha Vantage
- Free tier: 5 calls/minute, 500 calls/day
- Assets: Equities, ETFs, Crypto, Forex
- Features: Real-time quotes, historical data, company fundamentals

### Polygon.io
- Free tier: Delayed data
- Premium: Real-time streaming
- Assets: Equities, Options, Crypto, Forex, Indices
- Features: WebSocket streaming, Level 2 data, corporate actions

### IEX Cloud
- Multiple pricing tiers
- Assets: Equities, ETFs
- Features: Real-time quotes, historical data, fast execution

### Yahoo Finance (Fallback)
- Free (no API key required)
- Assets: Equities, ETFs, Indices, Crypto
- Features: Basic quotes and historical data

## Data Types

### OHLCV (Open-High-Low-Close-Volume)
```typescript
interface OHLCV {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number; // Volume-weighted average price
  trades?: number; // Number of trades
  assetClass: AssetClass;
  venue?: MarketVenue;
}
```

### Real-time Quote
```typescript
interface Quote {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  last?: number;
  lastSize?: number;
  volume?: number;
  venue?: MarketVenue;
}
```

### Trade Tick
```typescript
interface Trade {
  symbol: string;
  timestamp: Date;
  price: number;
  size: number;
  venue?: MarketVenue;
  conditions?: string[];
  tapeId?: string;
}
```

### Corporate Actions
```typescript
interface CorporateAction {
  symbol: string;
  actionType: CorporateActionType; // SPLIT, DIVIDEND, MERGER, etc.
  announcementDate: Date;
  exDate: Date;
  paymentDate?: Date;
  recordDate?: Date;
  ratio?: number; // For splits
  amount?: number; // For dividends
  currency: string;
  description?: string;
}
```

## Advanced Usage

### Multiple Providers with Fallback
```typescript
async function getQuoteWithFallback(symbol: string): Promise<Quote> {
  const providers = ['polygon', 'alpha-vantage', 'yahoo'];

  for (const providerName of providers) {
    try {
      const provider = registry.getProvider(providerName);
      if (provider) {
        return await provider.getQuote(symbol);
      }
    } catch (error) {
      console.warn(`Provider ${providerName} failed:`, error);
    }
  }

  throw new Error('All providers failed');
}
```

### Real-time Streaming
```typescript
import { PolygonProvider } from '@intelgraph/market-data';

const polygon = new PolygonProvider({ apiKey: API_KEY });
await polygon.connect();

// Subscribe to quotes
await polygon.subscribeQuotes(['AAPL', 'MSFT', 'GOOGL'], (quote) => {
  console.log(`${quote.symbol}: ${quote.bid} x ${quote.ask}`);
});

// Subscribe to trades
await polygon.subscribeTrades(['AAPL'], (trade) => {
  console.log(`Trade: ${trade.symbol} @ ${trade.price} x ${trade.size}`);
});
```

### Historical Data Analysis
```typescript
async function calculateReturns(symbol: string, days: number): Promise<number> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const data = await provider.getHistoricalData({
    symbol,
    startDate,
    endDate,
    interval: TimeInterval.DAY_1,
    assetClass: AssetClass.EQUITY,
    adjustForSplits: true,
    adjustForDividends: true,
  });

  if (data.length < 2) {
    throw new Error('Insufficient data');
  }

  const startPrice = data[0].close;
  const endPrice = data[data.length - 1].close;

  return ((endPrice - startPrice) / startPrice) * 100;
}
```

## Integration with TimescaleDB

Store market data in TimescaleDB for efficient time-series queries:

```typescript
import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'market_data',
});

await client.connect();

// Create hypertable for OHLCV data
await client.query(`
  CREATE TABLE IF NOT EXISTS ohlcv (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    open DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION NOT NULL,
    low DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    volume BIGINT NOT NULL,
    vwap DOUBLE PRECISION,
    asset_class TEXT NOT NULL
  );

  SELECT create_hypertable('ohlcv', 'time', if_not_exists => TRUE);
  CREATE INDEX IF NOT EXISTS ohlcv_symbol_time_idx ON ohlcv (symbol, time DESC);
`);

// Insert OHLCV data
async function storeOHLCV(data: OHLCV[]): Promise<void> {
  for (const bar of data) {
    await client.query(
      `INSERT INTO ohlcv (time, symbol, open, high, low, close, volume, vwap, asset_class)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [bar.timestamp, bar.symbol, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.vwap, bar.assetClass]
    );
  }
}
```

## License

MIT
