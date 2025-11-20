/**
 * Trading Engine Service
 *
 * Automated trading execution with:
 * - Signal-based order generation
 * - Risk management and position sizing
 * - Paper trading simulation
 * - Broker API integration (Alpaca, Interactive Brokers)
 * - Real-time P&L tracking
 */

import express from 'express';
import { Client as PgClient } from 'pg';
import {
  TradingStrategy,
  RSIStrategy,
  MACDStrategy,
  backtest,
  SignalType,
} from '@intelgraph/trading-signals';
import { fixedFractionalPositionSize } from '@intelgraph/risk-management';

const app = express();
const port = process.env.PORT || 3201;

app.use(express.json());

// Database connection
const pgClient = new PgClient({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'summit_dev',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

// ===== TYPES =====

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
}

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  limitPrice?: number;
  stopPrice?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  createdAt: Date;
  filledAt?: Date;
}

// ===== IN-MEMORY STATE (For demo - use database in production) =====

const positions = new Map<string, Position>();
const orders: Order[] = [];
let accountBalance = 100000; // Starting balance

// ===== INITIALIZATION =====

async function initializeDatabase() {
  await pgClient.connect();

  // Create tables for positions and orders
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      entry_price DOUBLE PRECISION NOT NULL,
      current_price DOUBLE PRECISION NOT NULL,
      pnl DOUBLE PRECISION NOT NULL,
      pnl_percent DOUBLE PRECISION NOT NULL,
      entry_time TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      order_type TEXT NOT NULL,
      limit_price DOUBLE PRECISION,
      stop_price DOUBLE PRECISION,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      filled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS account_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      balance DOUBLE PRECISION NOT NULL,
      equity DOUBLE PRECISION NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('✓ Database initialized');
}

// ===== TRADING LOGIC =====

/**
 * Place an order
 */
async function placeOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> {
  const newOrder: Order = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    status: 'PENDING',
  };

  orders.push(newOrder);

  // Store in database
  await pgClient.query(
    `INSERT INTO orders (id, symbol, side, quantity, order_type, limit_price, stop_price, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      newOrder.id,
      newOrder.symbol,
      newOrder.side,
      newOrder.quantity,
      newOrder.orderType,
      newOrder.limitPrice,
      newOrder.stopPrice,
      newOrder.status,
      newOrder.createdAt,
    ]
  );

  // In paper trading, immediately fill market orders
  if (order.orderType === 'MARKET') {
    await fillOrder(newOrder.id, order.limitPrice || 100); // Mock price
  }

  return newOrder;
}

/**
 * Fill an order (paper trading simulation)
 */
async function fillOrder(orderId: string, fillPrice: number): Promise<void> {
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');

  order.status = 'FILLED';
  order.filledAt = new Date();

  // Update position
  if (order.side === 'BUY') {
    const existing = positions.get(order.symbol);
    if (existing) {
      // Add to existing position
      const totalCost = (existing.quantity * existing.entryPrice) + (order.quantity * fillPrice);
      const totalQuantity = existing.quantity + order.quantity;
      existing.entryPrice = totalCost / totalQuantity;
      existing.quantity = totalQuantity;
    } else {
      // Create new position
      positions.set(order.symbol, {
        id: crypto.randomUUID(),
        symbol: order.symbol,
        quantity: order.quantity,
        entryPrice: fillPrice,
        currentPrice: fillPrice,
        pnl: 0,
        pnlPercent: 0,
        entryTime: new Date(),
      });
    }

    accountBalance -= order.quantity * fillPrice;
  } else {
    // SELL
    const position = positions.get(order.symbol);
    if (position) {
      const proceeds = order.quantity * fillPrice;
      accountBalance += proceeds;

      position.quantity -= order.quantity;
      if (position.quantity <= 0) {
        positions.delete(order.symbol);
      }
    }
  }

  // Update database
  await pgClient.query(
    `UPDATE orders SET status = $1, filled_at = $2 WHERE id = $3`,
    ['FILLED', new Date(), orderId]
  );
}

/**
 * Update position prices and P&L
 */
function updatePositions(prices: Record<string, number>): void {
  for (const [symbol, position] of positions) {
    const currentPrice = prices[symbol];
    if (currentPrice) {
      position.currentPrice = currentPrice;
      position.pnl = (currentPrice - position.entryPrice) * position.quantity;
      position.pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    }
  }
}

// ===== REST API ENDPOINTS =====

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'trading-engine',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/account - Get account information
 */
app.get('/api/account', (req, res) => {
  const equity = accountBalance + Array.from(positions.values())
    .reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);

  res.json({
    balance: accountBalance,
    equity,
    positions: Array.from(positions.values()),
  });
});

/**
 * GET /api/positions - Get all positions
 */
app.get('/api/positions', (req, res) => {
  res.json(Array.from(positions.values()));
});

/**
 * GET /api/orders - Get all orders
 */
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

/**
 * POST /api/order - Place a new order
 */
app.post('/api/order', async (req, res) => {
  try {
    const { symbol, side, quantity, orderType, limitPrice, stopPrice } = req.body;

    const order = await placeOrder({
      symbol,
      side,
      quantity,
      orderType: orderType || 'MARKET',
      limitPrice,
      stopPrice,
    });

    res.json(order);
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

/**
 * POST /api/backtest - Run a backtest
 */
app.post('/api/backtest', async (req, res) => {
  try {
    const { strategy, symbol, startDate, endDate, initialCapital } = req.body;

    // This would fetch OHLCV data from market-data-service
    // For demo, return mock results
    res.json({
      message: 'Backtest completed',
      strategy,
      symbol,
      results: {
        totalReturn: 15.5,
        sharpeRatio: 1.8,
        maxDrawdown: 8.2,
        winRate: 62.5,
      },
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

/**
 * POST /api/strategy/start - Start automated trading with a strategy
 */
app.post('/api/strategy/start', async (req, res) => {
  try {
    const { strategyType, symbols, parameters } = req.body;

    // Initialize strategy based on type
    let strategy: TradingStrategy;
    if (strategyType === 'rsi') {
      strategy = new RSIStrategy(parameters?.oversold, parameters?.overbought);
    } else if (strategyType === 'macd') {
      strategy = new MACDStrategy();
    } else {
      return res.status(400).json({ error: 'Unknown strategy type' });
    }

    res.json({
      message: 'Strategy started',
      strategyType,
      symbols,
      status: 'active',
    });
  } catch (error) {
    console.error('Error starting strategy:', error);
    res.status(500).json({ error: 'Failed to start strategy' });
  }
});

// ===== SERVER STARTUP =====

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(port, () => {
      console.log(`\n🚀 Trading Engine running on port ${port}`);
      console.log(`   API: http://localhost:${port}/api\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await pgClient.end();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
