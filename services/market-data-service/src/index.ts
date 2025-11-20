/**
 * Market Data Service
 *
 * Real-time market data aggregation and distribution service
 * - Aggregates data from multiple providers (Alpha Vantage, Polygon.io, IEX Cloud)
 * - Stores tick data in TimescaleDB
 * - Streams real-time data via WebSocket
 * - Provides REST API for historical data
 * - Caches frequently accessed data in Redis
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createClient as createRedisClient } from 'redis';
import { Client as PgClient } from 'pg';
import {
  globalProviderRegistry,
  ProviderRegistry,
  OHLCV,
  Quote,
  AssetClass,
  TimeInterval,
} from '@intelgraph/market-data';

const app = express();
const port = process.env.PORT || 3200;

// Middleware
app.use(express.json());

// ===== DATABASE CONNECTIONS =====

// TimescaleDB for time-series market data
const timescaleClient = new PgClient({
  host: process.env.TIMESCALE_HOST || 'localhost',
  port: parseInt(process.env.TIMESCALE_PORT || '5433'),
  database: process.env.TIMESCALE_DB || 'market_data',
  user: process.env.TIMESCALE_USER || 'postgres',
  password: process.env.TIMESCALE_PASSWORD || 'postgres',
});

// Redis for caching
const redisClient = createRedisClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// ===== INITIALIZATION =====

async function initializeDatabase() {
  await timescaleClient.connect();

  // Create hypertables for OHLCV data
  await timescaleClient.query(`
    CREATE TABLE IF NOT EXISTS ohlcv (
      time TIMESTAMPTZ NOT NULL,
      symbol TEXT NOT NULL,
      open DOUBLE PRECISION NOT NULL,
      high DOUBLE PRECISION NOT NULL,
      low DOUBLE PRECISION NOT NULL,
      close DOUBLE PRECISION NOT NULL,
      volume BIGINT NOT NULL,
      vwap DOUBLE PRECISION,
      trades INTEGER,
      asset_class TEXT NOT NULL,
      venue TEXT,
      PRIMARY KEY (time, symbol)
    );

    SELECT create_hypertable('ohlcv', 'time', if_not_exists => TRUE);

    CREATE INDEX IF NOT EXISTS ohlcv_symbol_time_idx ON ohlcv (symbol, time DESC);
    CREATE INDEX IF NOT EXISTS ohlcv_asset_class_idx ON ohlcv (asset_class, time DESC);
  `);

  // Create table for real-time quotes
  await timescaleClient.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      time TIMESTAMPTZ NOT NULL,
      symbol TEXT NOT NULL,
      bid DOUBLE PRECISION NOT NULL,
      ask DOUBLE PRECISION NOT NULL,
      bid_size INTEGER,
      ask_size INTEGER,
      last DOUBLE PRECISION,
      volume BIGINT,
      venue TEXT,
      PRIMARY KEY (time, symbol)
    );

    SELECT create_hypertable('quotes', 'time', if_not_exists => TRUE);

    CREATE INDEX IF NOT EXISTS quotes_symbol_time_idx ON quotes (symbol, time DESC);
  `);

  console.log('✓ TimescaleDB initialized');
}

async function initializeCache() {
  await redisClient.connect();
  console.log('✓ Redis connected');
}

async function initializeProviders() {
  // Initialize data providers based on environment variables
  const providers = [];

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    await globalProviderRegistry.createProvider('alpha-vantage', {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY,
    });
    providers.push('alpha-vantage');
  }

  if (process.env.POLYGON_API_KEY) {
    await globalProviderRegistry.createProvider('polygon', {
      apiKey: process.env.POLYGON_API_KEY,
    });
    providers.push('polygon');
  }

  console.log(`✓ Initialized providers: ${providers.join(', ')}`);
}

// ===== DATA INGESTION =====

/**
 * Store OHLCV data in TimescaleDB
 */
async function storeOHLCV(data: OHLCV[]): Promise<void> {
  for (const bar of data) {
    await timescaleClient.query(
      `INSERT INTO ohlcv (time, symbol, open, high, low, close, volume, vwap, trades, asset_class, venue)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (time, symbol) DO UPDATE SET
         open = EXCLUDED.open,
         high = EXCLUDED.high,
         low = EXCLUDED.low,
         close = EXCLUDED.close,
         volume = EXCLUDED.volume,
         vwap = EXCLUDED.vwap,
         trades = EXCLUDED.trades`,
      [
        bar.timestamp,
        bar.symbol,
        bar.open,
        bar.high,
        bar.low,
        bar.close,
        bar.volume,
        bar.vwap,
        bar.trades,
        bar.assetClass,
        bar.venue,
      ]
    );
  }
}

/**
 * Store real-time quote in TimescaleDB
 */
async function storeQuote(quote: Quote): Promise<void> {
  await timescaleClient.query(
    `INSERT INTO quotes (time, symbol, bid, ask, bid_size, ask_size, last, volume, venue)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (time, symbol) DO NOTHING`,
    [
      quote.timestamp,
      quote.symbol,
      quote.bid,
      quote.ask,
      quote.bidSize,
      quote.askSize,
      quote.last,
      quote.volume,
      quote.venue,
    ]
  );

  // Cache latest quote in Redis
  await redisClient.setEx(
    `quote:${quote.symbol}`,
    60, // 60 second TTL
    JSON.stringify(quote)
  );
}

// ===== REST API ENDPOINTS =====

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'market-data-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/quote/:symbol - Get latest quote for symbol
 */
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    // Check cache first
    const cached = await redisClient.get(`quote:${symbol}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Fetch from provider
    const provider = globalProviderRegistry.getProvider();
    if (!provider) {
      return res.status(503).json({ error: 'No providers available' });
    }

    const quote = await provider.getQuote(symbol);
    await storeQuote(quote);

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

/**
 * GET /api/historical/:symbol - Get historical OHLCV data
 */
app.get('/api/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const {
      start,
      end,
      interval = '1d',
    } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }

    // Query from TimescaleDB
    const result = await timescaleClient.query(
      `SELECT time, symbol, open, high, low, close, volume, vwap, trades, asset_class
       FROM ohlcv
       WHERE symbol = $1 AND time >= $2 AND time <= $3
       ORDER BY time ASC`,
      [symbol, new Date(start as string), new Date(end as string)]
    );

    const data: OHLCV[] = result.rows.map(row => ({
      symbol: row.symbol,
      timestamp: row.time,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      volume: parseInt(row.volume),
      vwap: row.vwap ? parseFloat(row.vwap) : undefined,
      trades: row.trades,
      assetClass: row.asset_class as AssetClass,
    }));

    res.json(data);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

/**
 * POST /api/ingest - Ingest historical data for a symbol
 */
app.post('/api/ingest', async (req, res) => {
  try {
    const {
      symbol,
      startDate,
      endDate,
      interval = TimeInterval.DAY_1,
      provider: providerName,
    } = req.body;

    const provider = providerName
      ? globalProviderRegistry.getProvider(providerName)
      : globalProviderRegistry.getProvider();

    if (!provider) {
      return res.status(503).json({ error: 'No providers available' });
    }

    const data = await provider.getHistoricalData({
      symbol,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      interval,
      assetClass: AssetClass.EQUITY,
      adjustForSplits: true,
      adjustForDividends: false,
    });

    await storeOHLCV(data);

    res.json({
      message: 'Data ingested successfully',
      symbol,
      barsIngested: data.length,
    });
  } catch (error) {
    console.error('Error ingesting data:', error);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
});

/**
 * GET /api/search - Search for securities
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter q required' });
    }

    const provider = globalProviderRegistry.getProvider();
    if (!provider) {
      return res.status(503).json({ error: 'No providers available' });
    }

    const results = await provider.searchSecurities(q as string);
    res.json(results);
  } catch (error) {
    console.error('Error searching securities:', error);
    res.status(500).json({ error: 'Failed to search securities' });
  }
});

// ===== WEBSOCKET SERVER =====

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.action === 'subscribe') {
        // Subscribe to real-time quotes for symbols
        const symbols = data.symbols as string[];
        console.log(`Client subscribing to: ${symbols.join(', ')}`);

        // This is a simplified implementation
        // In production, you would use provider's streaming API
        for (const symbol of symbols) {
          const provider = globalProviderRegistry.getProvider();
          if (provider) {
            const quote = await provider.getQuote(symbol);
            ws.send(JSON.stringify({ type: 'quote', data: quote }));
          }
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// ===== SERVER STARTUP =====

async function startServer() {
  try {
    await initializeDatabase();
    await initializeCache();
    await initializeProviders();

    const server = app.listen(port, () => {
      console.log(`\n🚀 Market Data Service running on port ${port}`);
      console.log(`   REST API: http://localhost:${port}/api`);
      console.log(`   WebSocket: ws://localhost:${port}/ws\n`);
    });

    // Upgrade HTTP to WebSocket
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await globalProviderRegistry.disconnectAll();
      await timescaleClient.end();
      await redisClient.quit();
      server.close();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
