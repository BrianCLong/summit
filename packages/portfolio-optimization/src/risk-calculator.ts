/**
 * Risk Calculator
 * Calculate portfolio risk metrics
 */

import { PriceData } from '@intelgraph/market-data';
import { Portfolio, RiskMetrics } from './types';

export class RiskCalculator {
  /**
   * Calculate Value at Risk (VaR)
   */
  static calculateVaR(
    returns: number[],
    confidence: number = 0.95
  ): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return -sorted[index]; // Negative of loss
  }

  /**
   * Calculate Conditional VaR (CVaR/Expected Shortfall)
   */
  static calculateCVaR(
    returns: number[],
    confidence: number = 0.95
  ): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const cutoff = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, cutoff);

    if (tailReturns.length === 0) return 0;

    const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
    return -avgTailReturn;
  }

  /**
   * Calculate Maximum Drawdown
   */
  static calculateMaxDrawdown(prices: PriceData[]): number {
    let maxDrawdown = 0;
    let peak = prices[0].close;

    for (const price of prices) {
      if (price.close > peak) {
        peak = price.close;
      }

      const drawdown = (peak - price.close) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * Calculate Beta (relative to market/benchmark)
   */
  static calculateBeta(
    assetReturns: number[],
    marketReturns: number[]
  ): number {
    if (assetReturns.length !== marketReturns.length || assetReturns.length < 2) {
      return 1; // Default beta
    }

    const n = assetReturns.length;

    // Calculate means
    const assetMean = assetReturns.reduce((sum, r) => sum + r, 0) / n;
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / n;

    // Calculate covariance and market variance
    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < n; i++) {
      covariance += (assetReturns[i] - assetMean) * (marketReturns[i] - marketMean);
      marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
    }

    covariance /= n;
    marketVariance /= n;

    return marketVariance === 0 ? 1 : covariance / marketVariance;
  }

  /**
   * Calculate Alpha (excess return)
   */
  static calculateAlpha(
    assetReturn: number,
    marketReturn: number,
    beta: number,
    riskFreeRate: number = 0.02
  ): number {
    return assetReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate));
  }

  /**
   * Calculate correlation matrix
   */
  static calculateCorrelations(
    returns: Map<string, number[]>
  ): Map<string, Map<string, number>> {
    const correlations = new Map<string, Map<string, number>>();
    const symbols = Array.from(returns.keys());

    for (const symbol1 of symbols) {
      const corr1 = new Map<string, number>();

      for (const symbol2 of symbols) {
        const correlation = this.calculateCorrelation(
          returns.get(symbol1)!,
          returns.get(symbol2)!
        );
        corr1.set(symbol2, correlation);
      }

      correlations.set(symbol1, corr1);
    }

    return correlations;
  }

  /**
   * Calculate correlation between two return series
   */
  private static calculateCorrelation(
    returns1: number[],
    returns2: number[]
  ): number {
    if (returns1.length !== returns2.length || returns1.length < 2) {
      return 0;
    }

    const n = returns1.length;
    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / n;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / n;

    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;

      covariance += diff1 * diff2;
      variance1 += diff1 * diff1;
      variance2 += diff2 * diff2;
    }

    const std1 = Math.sqrt(variance1 / n);
    const std2 = Math.sqrt(variance2 / n);

    return std1 === 0 || std2 === 0 ? 0 : covariance / (n * std1 * std2);
  }

  /**
   * Calculate comprehensive risk metrics for a portfolio
   */
  static calculateRiskMetrics(
    portfolio: Portfolio,
    historicalReturns: Map<string, number[]>,
    marketReturns: number[]
  ): RiskMetrics {
    // Calculate portfolio returns
    const portfolioReturns: number[] = [];
    const numPeriods = marketReturns.length;

    for (let i = 0; i < numPeriods; i++) {
      let portfolioReturn = 0;

      for (const asset of portfolio.assets) {
        const assetReturns = historicalReturns.get(asset.symbol);
        if (assetReturns && assetReturns[i] !== undefined) {
          portfolioReturn += asset.weight * assetReturns[i];
        }
      }

      portfolioReturns.push(portfolioReturn);
    }

    // Calculate risk metrics
    const var95 = this.calculateVaR(portfolioReturns, 0.95);
    const cvar95 = this.calculateCVaR(portfolioReturns, 0.95);
    const beta = this.calculateBeta(portfolioReturns, marketReturns);
    const avgPortfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const avgMarketReturn = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    const alpha = this.calculateAlpha(avgPortfolioReturn, avgMarketReturn, beta);

    // Calculate correlations with individual assets
    const correlation: Record<string, number> = {};
    for (const asset of portfolio.assets) {
      const assetReturns = historicalReturns.get(asset.symbol);
      if (assetReturns) {
        correlation[asset.symbol] = this.calculateCorrelation(portfolioReturns, assetReturns);
      }
    }

    return {
      var95,
      cvar95,
      maxDrawdown: 0, // Would need price data
      beta,
      alpha,
      correlation,
    };
  }
}
