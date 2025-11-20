/**
 * Signal Backtester
 * Backtest trading signals on historical data
 */

import { PriceData } from '@intelgraph/market-data';
import { TradingSignal, SignalBacktest, SignalPerformance, SignalType } from '../types';

export interface BacktestConfig {
  initialCapital?: number;
  commission?: number; // percentage
  slippage?: number; // percentage
  maxHoldingPeriod?: number; // hours
}

export class SignalBacktester {
  private config: BacktestConfig;

  constructor(config: BacktestConfig = {}) {
    this.config = {
      initialCapital: config.initialCapital || 10000,
      commission: config.commission || 0.001, // 0.1%
      slippage: config.slippage || 0.0005, // 0.05%
      maxHoldingPeriod: config.maxHoldingPeriod || 72, // 72 hours
      ...config,
    };
  }

  /**
   * Backtest a single signal
   */
  backtestSignal(
    signal: TradingSignal,
    historicalPrices: PriceData[]
  ): SignalBacktest | null {
    // Find entry point
    const entryIndex = historicalPrices.findIndex(
      p => p.timestamp >= signal.timestamp
    );

    if (entryIndex === -1 || entryIndex >= historicalPrices.length - 1) {
      return null;
    }

    const entry = {
      price: this.applySlippage(historicalPrices[entryIndex].close, signal.direction),
      timestamp: historicalPrices[entryIndex].timestamp,
    };

    // Find exit point
    let exitIndex = entryIndex + 1;
    let exitReason: 'TARGET' | 'STOP_LOSS' | 'TIME' | 'END' = 'END';

    for (let i = entryIndex + 1; i < historicalPrices.length; i++) {
      const price = historicalPrices[i];

      // Check time limit
      const hoursHeld = (price.timestamp.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursHeld >= this.config.maxHoldingPeriod!) {
        exitIndex = i;
        exitReason = 'TIME';
        break;
      }

      // Check target price
      if (signal.targetPrice) {
        if (signal.direction === 'BUY' && price.high >= signal.targetPrice) {
          exitIndex = i;
          exitReason = 'TARGET';
          break;
        }
        if (signal.direction === 'SELL' && price.low <= signal.targetPrice) {
          exitIndex = i;
          exitReason = 'TARGET';
          break;
        }
      }

      // Check stop loss
      if (signal.stopLoss) {
        if (signal.direction === 'BUY' && price.low <= signal.stopLoss) {
          exitIndex = i;
          exitReason = 'STOP_LOSS';
          break;
        }
        if (signal.direction === 'SELL' && price.high >= signal.stopLoss) {
          exitIndex = i;
          exitReason = 'STOP_LOSS';
          break;
        }
      }
    }

    const exitPrice = this.getExitPrice(
      historicalPrices[exitIndex],
      signal,
      exitReason
    );

    const exit = {
      price: this.applySlippage(exitPrice, signal.direction === 'BUY' ? 'SELL' : 'BUY'),
      timestamp: historicalPrices[exitIndex].timestamp,
    };

    // Calculate returns
    const rawReturn = signal.direction === 'BUY' ?
      exit.price - entry.price :
      entry.price - exit.price;

    const returnAfterCosts = rawReturn - (entry.price * this.config.commission!) - (exit.price * this.config.commission!);
    const returnPct = returnAfterCosts / entry.price;

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(
      historicalPrices.slice(entryIndex, exitIndex + 1),
      entry.price,
      signal.direction
    );

    return {
      signal,
      entry,
      exit,
      return: returnAfterCosts,
      returnPct,
      duration: exit.timestamp.getTime() - entry.timestamp.getTime(),
      maxDrawdown,
    };
  }

  /**
   * Backtest multiple signals
   */
  backtestSignals(
    signals: TradingSignal[],
    historicalPrices: PriceData[]
  ): SignalBacktest[] {
    const results: SignalBacktest[] = [];

    for (const signal of signals) {
      const result = this.backtestSignal(signal, historicalPrices);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformance(backtests: SignalBacktest[]): SignalPerformance {
    if (backtests.length === 0) {
      return {
        signalType: SignalType.COMPOSITE,
        totalSignals: 0,
        winRate: 0,
        avgReturn: 0,
        avgReturnPct: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        backtests: [],
      };
    }

    const wins = backtests.filter(b => b.return > 0);
    const losses = backtests.filter(b => b.return <= 0);

    const totalReturn = backtests.reduce((sum, b) => sum + b.return, 0);
    const avgReturn = totalReturn / backtests.length;
    const avgReturnPct = backtests.reduce((sum, b) => sum + b.returnPct, 0) / backtests.length;

    const totalGains = wins.reduce((sum, b) => sum + b.return, 0);
    const totalLosses = Math.abs(losses.reduce((sum, b) => sum + b.return, 0));
    const profitFactor = totalLosses === 0 ? (totalGains > 0 ? Infinity : 0) : totalGains / totalLosses;

    const maxDrawdown = Math.max(...backtests.map(b => b.maxDrawdown));

    // Calculate Sharpe ratio (simplified)
    const returns = backtests.map(b => b.returnPct);
    const avgRet = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgRet, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    const sharpeRatio = std === 0 ? 0 : avgRet / std;

    return {
      signalType: backtests[0].signal.type,
      totalSignals: backtests.length,
      winRate: wins.length / backtests.length,
      avgReturn,
      avgReturnPct,
      sharpeRatio,
      maxDrawdown,
      profitFactor,
      backtests,
    };
  }

  /**
   * Apply slippage to price
   */
  private applySlippage(price: number, direction: 'BUY' | 'SELL' | 'HOLD'): number {
    if (direction === 'BUY') {
      return price * (1 + this.config.slippage!);
    } else if (direction === 'SELL') {
      return price * (1 - this.config.slippage!);
    }
    return price;
  }

  /**
   * Get exit price based on exit reason
   */
  private getExitPrice(
    priceData: PriceData,
    signal: TradingSignal,
    exitReason: 'TARGET' | 'STOP_LOSS' | 'TIME' | 'END'
  ): number {
    switch (exitReason) {
      case 'TARGET':
        return signal.targetPrice!;
      case 'STOP_LOSS':
        return signal.stopLoss!;
      case 'TIME':
      case 'END':
      default:
        return priceData.close;
    }
  }

  /**
   * Calculate maximum drawdown during trade
   */
  private calculateMaxDrawdown(
    prices: PriceData[],
    entryPrice: number,
    direction: 'BUY' | 'SELL' | 'HOLD'
  ): number {
    let maxDrawdown = 0;

    for (const price of prices) {
      const drawdown = direction === 'BUY' ?
        (entryPrice - price.low) / entryPrice :
        (price.high - entryPrice) / entryPrice;

      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }
}
