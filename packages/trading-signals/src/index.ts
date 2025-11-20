/**
 * @intelgraph/trading-signals
 *
 * Advanced trading signal generation and backtesting framework:
 * - Multi-factor alpha models
 * - Machine learning signal generation
 * - Backtesting engine with walk-forward optimization
 * - Strategy performance metrics (Sharpe, Sortino, Win Rate)
 * - Position sizing and risk-adjusted entry/exit
 */

import { OHLCV } from '@intelgraph/market-data';
import { RSI, MACD, BollingerBands } from '@intelgraph/technical-analysis';

// ===== SIGNAL TYPES =====

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
  STRONG_BUY = 'STRONG_BUY',
  STRONG_SELL = 'STRONG_SELL',
}

export interface TradingSignal {
  symbol: string;
  timestamp: Date;
  signalType: SignalType;
  strength: number; // 0-100
  confidence: number; // 0-100
  price: number;
  indicators: Record<string, number>;
  metadata?: Record<string, any>;
}

// ===== STRATEGY INTERFACE =====

export interface TradingStrategy {
  name: string;
  description: string;
  generateSignal(ohlcv: OHLCV[], currentIndex: number): TradingSignal | null;
  parameters: Record<string, any>;
}

// ===== BUILT-IN STRATEGIES =====

/**
 * RSI Oversold/Overbought Strategy
 */
export class RSIStrategy implements TradingStrategy {
  name = 'RSI Oversold/Overbought';
  description = 'Generate signals based on RSI levels';
  parameters: Record<string, any>;

  constructor(
    private oversoldLevel: number = 30,
    private overboughtLevel: number = 70,
    private period: number = 14
  ) {
    this.parameters = { oversoldLevel, overboughtLevel, period };
  }

  generateSignal(ohlcv: OHLCV[], currentIndex: number): TradingSignal | null {
    if (currentIndex < this.period) return null;

    const close = ohlcv.map(bar => bar.close);
    const rsi = RSI(close, this.period);
    const currentRSI = rsi[currentIndex];

    if (isNaN(currentRSI)) return null;

    let signalType = SignalType.HOLD;
    let strength = 50;
    let confidence = 60;

    if (currentRSI < this.oversoldLevel) {
      signalType = currentRSI < 20 ? SignalType.STRONG_BUY : SignalType.BUY;
      strength = Math.max(80, 100 - currentRSI * 2);
      confidence = 75;
    } else if (currentRSI > this.overboughtLevel) {
      signalType = currentRSI > 80 ? SignalType.STRONG_SELL : SignalType.SELL;
      strength = Math.max(80, currentRSI);
      confidence = 75;
    }

    return {
      symbol: ohlcv[currentIndex].symbol,
      timestamp: ohlcv[currentIndex].timestamp,
      signalType,
      strength,
      confidence,
      price: ohlcv[currentIndex].close,
      indicators: { rsi: currentRSI },
    };
  }
}

/**
 * MACD Crossover Strategy
 */
export class MACDStrategy implements TradingStrategy {
  name = 'MACD Crossover';
  description = 'Generate signals based on MACD line crossing signal line';
  parameters: Record<string, any>;

  constructor(
    private fastPeriod: number = 12,
    private slowPeriod: number = 26,
    private signalPeriod: number = 9
  ) {
    this.parameters = { fastPeriod, slowPeriod, signalPeriod };
  }

  generateSignal(ohlcv: OHLCV[], currentIndex: number): TradingSignal | null {
    if (currentIndex < this.slowPeriod + this.signalPeriod) return null;

    const close = ohlcv.map(bar => bar.close);
    const macdResult = MACD(close, this.fastPeriod, this.slowPeriod, this.signalPeriod);

    const macd = macdResult.macd[currentIndex];
    const signal = macdResult.signal[currentIndex];
    const prevMacd = macdResult.macd[currentIndex - 1];
    const prevSignal = macdResult.signal[currentIndex - 1];

    if (isNaN(macd) || isNaN(signal) || isNaN(prevMacd) || isNaN(prevSignal)) {
      return null;
    }

    // Detect crossover
    const bullishCrossover = prevMacd < prevSignal && macd > signal;
    const bearishCrossover = prevMacd > prevSignal && macd < signal;

    let signalType = SignalType.HOLD;
    let strength = 50;
    let confidence = 65;

    if (bullishCrossover) {
      signalType = SignalType.BUY;
      strength = Math.min(95, 70 + Math.abs(macd - signal) * 10);
      confidence = 70;
    } else if (bearishCrossover) {
      signalType = SignalType.SELL;
      strength = Math.min(95, 70 + Math.abs(macd - signal) * 10);
      confidence = 70;
    }

    return {
      symbol: ohlcv[currentIndex].symbol,
      timestamp: ohlcv[currentIndex].timestamp,
      signalType,
      strength,
      confidence,
      price: ohlcv[currentIndex].close,
      indicators: { macd, signal, histogram: macdResult.histogram[currentIndex] },
    };
  }
}

/**
 * Bollinger Bands Mean Reversion Strategy
 */
export class BollingerBandsStrategy implements TradingStrategy {
  name = 'Bollinger Bands Mean Reversion';
  description = 'Trade bounces off Bollinger Bands';
  parameters: Record<string, any>;

  constructor(
    private period: number = 20,
    private stdDev: number = 2
  ) {
    this.parameters = { period, stdDev };
  }

  generateSignal(ohlcv: OHLCV[], currentIndex: number): TradingSignal | null {
    if (currentIndex < this.period) return null;

    const close = ohlcv.map(bar => bar.close);
    const bb = BollingerBands(close, this.period, this.stdDev);

    const price = close[currentIndex];
    const upper = bb.upper[currentIndex];
    const lower = bb.lower[currentIndex];
    const middle = bb.middle[currentIndex];

    if (isNaN(upper) || isNaN(lower) || isNaN(middle)) return null;

    let signalType = SignalType.HOLD;
    let strength = 50;
    let confidence = 60;

    // Price touches or breaks lower band: oversold, buy signal
    if (price <= lower) {
      signalType = SignalType.BUY;
      strength = 80;
      confidence = 70;
    }
    // Price touches or breaks upper band: overbought, sell signal
    else if (price >= upper) {
      signalType = SignalType.SELL;
      strength = 80;
      confidence = 70;
    }
    // Price reverts to middle from upper band
    else if (ohlcv[currentIndex - 1]?.close > upper && price < upper) {
      signalType = SignalType.SELL;
      strength = 65;
      confidence = 65;
    }
    // Price reverts to middle from lower band
    else if (ohlcv[currentIndex - 1]?.close < lower && price > lower) {
      signalType = SignalType.BUY;
      strength = 65;
      confidence = 65;
    }

    return {
      symbol: ohlcv[currentIndex].symbol,
      timestamp: ohlcv[currentIndex].timestamp,
      signalType,
      strength,
      confidence,
      price,
      indicators: {
        upper,
        middle,
        lower,
        percentB: bb.percentB[currentIndex],
      },
    };
  }
}

/**
 * Multi-Factor Composite Strategy
 */
export class CompositeStrategy implements TradingStrategy {
  name = 'Multi-Factor Composite';
  description = 'Combines multiple strategies with weighted voting';
  parameters: Record<string, any>;

  constructor(
    private strategies: Array<{ strategy: TradingStrategy; weight: number }>
  ) {
    this.parameters = {
      strategies: strategies.map(s => ({
        name: s.strategy.name,
        weight: s.weight,
      })),
    };
  }

  generateSignal(ohlcv: OHLCV[], currentIndex: number): TradingSignal | null {
    const signals = this.strategies
      .map(({ strategy, weight }) => {
        const signal = strategy.generateSignal(ohlcv, currentIndex);
        return signal ? { signal, weight } : null;
      })
      .filter((s): s is { signal: TradingSignal; weight: number } => s !== null);

    if (signals.length === 0) return null;

    // Weighted voting
    let buyScore = 0;
    let sellScore = 0;
    const indicators: Record<string, number> = {};

    for (const { signal, weight } of signals) {
      Object.assign(indicators, signal.indicators);

      const signalStrength = signal.strength * (signal.confidence / 100) * weight;

      if (signal.signalType === SignalType.BUY || signal.signalType === SignalType.STRONG_BUY) {
        buyScore += signalStrength;
      } else if (signal.signalType === SignalType.SELL || signal.signalType === SignalType.STRONG_SELL) {
        sellScore += signalStrength;
      }
    }

    const totalWeight = this.strategies.reduce((sum, s) => sum + s.weight, 0);
    const netScore = (buyScore - sellScore) / totalWeight;

    let signalType = SignalType.HOLD;
    if (netScore > 30) signalType = SignalType.BUY;
    if (netScore > 60) signalType = SignalType.STRONG_BUY;
    if (netScore < -30) signalType = SignalType.SELL;
    if (netScore < -60) signalType = SignalType.STRONG_SELL;

    return {
      symbol: ohlcv[currentIndex].symbol,
      timestamp: ohlcv[currentIndex].timestamp,
      signalType,
      strength: Math.abs(netScore),
      confidence: Math.min(90, (signals.length / this.strategies.length) * 100),
      price: ohlcv[currentIndex].close,
      indicators,
      metadata: { buyScore, sellScore, netScore },
    };
  }
}

// ===== BACKTESTING =====

export interface Trade {
  entryDate: Date;
  entryPrice: number;
  exitDate?: Date;
  exitPrice?: number;
  quantity: number;
  side: 'LONG' | 'SHORT';
  pnl?: number;
  pnlPercent?: number;
  signal?: TradingSignal;
}

export interface BacktestResult {
  strategy: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  trades: Trade[];
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
}

/**
 * Backtest a trading strategy
 */
export function backtest(
  strategy: TradingStrategy,
  ohlcv: OHLCV[],
  initialCapital: number = 100000,
  positionSize: number = 0.95 // Use 95% of capital per trade
): BacktestResult {
  const trades: Trade[] = [];
  let capital = initialCapital;
  let position: Trade | null = null;
  const equityCurve: number[] = [initialCapital];

  for (let i = 0; i < ohlcv.length; i++) {
    const signal = strategy.generateSignal(ohlcv, i);

    if (!signal) {
      equityCurve.push(capital);
      continue;
    }

    // Entry logic
    if (!position && (signal.signalType === SignalType.BUY || signal.signalType === SignalType.STRONG_BUY)) {
      const quantity = Math.floor((capital * positionSize) / signal.price);
      position = {
        entryDate: signal.timestamp,
        entryPrice: signal.price,
        quantity,
        side: 'LONG',
        signal,
      };
      capital -= quantity * signal.price;
    }

    // Exit logic
    if (position && (signal.signalType === SignalType.SELL || signal.signalType === SignalType.STRONG_SELL)) {
      position.exitDate = signal.timestamp;
      position.exitPrice = signal.price;
      const proceeds = position.quantity * signal.price;
      position.pnl = proceeds - (position.quantity * position.entryPrice);
      position.pnlPercent = (position.pnl / (position.quantity * position.entryPrice)) * 100;
      capital += proceeds;
      trades.push(position);
      position = null;
    }

    equityCurve.push(capital + (position ? position.quantity * ohlcv[i].close : 0));
  }

  // Close any open position at end
  if (position) {
    const lastBar = ohlcv[ohlcv.length - 1];
    position.exitDate = lastBar.timestamp;
    position.exitPrice = lastBar.close;
    const proceeds = position.quantity * lastBar.close;
    position.pnl = proceeds - (position.quantity * position.entryPrice);
    position.pnlPercent = (position.pnl / (position.quantity * position.entryPrice)) * 100;
    capital += proceeds;
    trades.push(position);
  }

  // Calculate metrics
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
    : 0;

  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
    : 0;

  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Calculate Sharpe Ratio
  const returns = trades.map(t => t.pnlPercent || 0);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Calculate max drawdown
  let peak = equityCurve[0];
  let maxDD = 0;
  let maxDDPercent = 0;

  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    const ddPercent = (dd / peak) * 100;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPercent = ddPercent;
    }
  }

  return {
    strategy: strategy.name,
    startDate: ohlcv[0].timestamp,
    endDate: ohlcv[ohlcv.length - 1].timestamp,
    initialCapital,
    finalCapital: capital,
    totalReturn: capital - initialCapital,
    totalReturnPercent: ((capital - initialCapital) / initialCapital) * 100,
    trades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / trades.length) * 100,
    avgWin,
    avgLoss,
    profitFactor,
    sharpeRatio,
    maxDrawdown: maxDD,
    maxDrawdownPercent: maxDDPercent,
  };
}

export * from './strategies';
export * from './backtesting';
export * from './signals';
