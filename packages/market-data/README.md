# Market Data Package

Real-time market data ingestion pipeline for stocks, cryptocurrencies, forex, and derivatives.

## Features

- **Multi-Asset Support**: Stocks, crypto, forex, futures, options
- **Real-Time Data**: WebSocket-based streaming data feeds
- **Multiple Data Types**: Prices, quotes, trades, order books, options data
- **Data Normalization**: Consistent data format across all sources
- **Caching**: Redis-based caching for performance
- **Automatic Reconnection**: Robust connection handling with auto-reconnect
- **Exchange Support**: Binance, Coinbase, Kraken, and more

## Installation

```bash
pnpm add @intelgraph/market-data
```

## Usage

### Basic Stock Data Feed

```typescript
import { StockMarketDataFeed, DataType } from '@intelgraph/market-data';

const feed = new StockMarketDataFeed({
  apiKey: 'your-api-key',
});

await feed.connect();

feed.on('price', (data) => {
  console.log('Price update:', data);
});

feed.on('trade', (trade) => {
  console.log('Trade:', trade);
});

await feed.subscribe(['AAPL', 'MSFT', 'GOOGL'], [DataType.PRICE, DataType.TRADE]);
```

### Crypto Data Feed

```typescript
import { CryptoMarketDataFeed, DataType } from '@intelgraph/market-data';

const feed = new CryptoMarketDataFeed({
  exchange: 'binance',
});

await feed.connect();

feed.on('price', (data) => {
  console.log('Crypto price:', data);
});

await feed.subscribe(['BTC/USDT', 'ETH/USDT'], [DataType.PRICE, DataType.ORDER_BOOK]);
```

### Market Data Pipeline

```typescript
import { MarketDataPipeline, AssetClass, DataType } from '@intelgraph/market-data';

const pipeline = new MarketDataPipeline({
  feeds: [
    {
      type: AssetClass.STOCK,
      config: { apiKey: 'stock-api-key' },
    },
    {
      type: AssetClass.CRYPTO,
      config: { exchange: 'binance' },
    },
  ],
});

await pipeline.connect();

pipeline.on('price', (data) => {
  console.log('Price from any feed:', data);
});

await pipeline.subscribe(AssetClass.STOCK, ['AAPL'], [DataType.PRICE]);
await pipeline.subscribe(AssetClass.CRYPTO, ['BTC/USDT'], [DataType.PRICE]);
```

### Historical Data

```typescript
const data = await feed.getHistoricalData(
  'AAPL',
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  '1min'
);

console.log('Historical prices:', data);
```

### Caching

```typescript
import { MarketDataCache } from '@intelgraph/market-data';

const cache = new MarketDataCache({
  host: 'localhost',
  port: 6379,
  ttl: 60,
});

await cache.connect();

// Cache price data
await cache.cachePrice('AAPL', priceData);

// Retrieve cached data
const cachedPrice = await cache.getPrice('AAPL');
```

## API Reference

### Data Types

- `PriceData`: OHLCV candle data
- `Quote`: Bid/ask quotes
- `Trade`: Individual trade executions
- `OrderBook`: Order book snapshots
- `OptionsData`: Options chain data
- `EconomicIndicator`: Economic calendar events
- `NewsEvent`: News and sentiment data

### Events

- `connected`: Connection established
- `disconnected`: Connection lost
- `price`: Price update received
- `quote`: Quote update received
- `trade`: Trade execution received
- `orderbook`: Order book update received
- `error`: Error occurred

## Configuration

### Stock Feed

```typescript
{
  apiKey: string;          // Required: API authentication key
  wsUrl?: string;          // Optional: WebSocket URL
  restUrl?: string;        // Optional: REST API URL
  reconnectDelay?: number; // Optional: Reconnect delay in ms (default: 5000)
}
```

### Crypto Feed

```typescript
{
  exchange: string;        // Required: Exchange name (binance, coinbase, kraken)
  apiKey?: string;         // Optional: API key for authenticated endpoints
  apiSecret?: string;      // Optional: API secret
}
```

## Error Handling

```typescript
feed.on('error', (error) => {
  console.error('Feed error:', error);
});

try {
  await feed.subscribe(['INVALID'], [DataType.PRICE]);
} catch (error) {
  console.error('Subscription failed:', error);
}
```

## License

MIT
