/**
 * Portfolio Optimizer
 * Mean-variance optimization, risk parity, and other allocation strategies
 */

import { Portfolio, Asset, OptimizationConstraints, RebalanceRecommendation, Trade } from './types';

export class PortfolioOptimizer {
  /**
   * Mean-Variance Optimization (Markowitz)
   */
  static meanVarianceOptimization(
    assets: Asset[],
    constraints: OptimizationConstraints = {}
  ): Portfolio {
    const n = assets.length;
    const minWeight = constraints.minWeight || 0;
    const maxWeight = constraints.maxWeight || 1;

    // Simple equal-weight portfolio as baseline
    // In production, use proper quadratic programming
    let weights = new Array(n).fill(1 / n);

    // Apply constraints
    weights = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)));

    // Normalize to sum to 1
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);

    // Calculate portfolio metrics
    const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
    const variance = this.calculatePortfolioVariance(assets, weights);
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility === 0 ? 0 : expectedReturn / volatility;

    return {
      assets: assets.map((asset, i) => ({
        ...asset,
        weight: weights[i],
      })),
      totalValue: 0,
      expectedReturn,
      volatility,
      sharpeRatio,
      diversificationScore: this.calculateDiversification(weights),
      timestamp: new Date(),
    };
  }

  /**
   * Risk Parity Allocation
   */
  static riskParityOptimization(assets: Asset[]): Portfolio {
    const n = assets.length;

    // Inverse volatility weighting (simplified risk parity)
    const invVol = assets.map(a => 1 / (a.volatility || 0.01));
    const sumInvVol = invVol.reduce((a, b) => a + b, 0);
    const weights = invVol.map(v => v / sumInvVol);

    const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
    const variance = this.calculatePortfolioVariance(assets, weights);
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility === 0 ? 0 : expectedReturn / volatility;

    return {
      assets: assets.map((asset, i) => ({
        ...asset,
        weight: weights[i],
      })),
      totalValue: 0,
      expectedReturn,
      volatility,
      sharpeRatio,
      diversificationScore: this.calculateDiversification(weights),
      timestamp: new Date(),
    };
  }

  /**
   * Maximum Sharpe Ratio Portfolio
   */
  static maxSharpeRatio(
    assets: Asset[],
    riskFreeRate: number = 0.02
  ): Portfolio {
    // Simplified: weight by Sharpe ratio
    const sharpes = assets.map(a => (a.expectedReturn - riskFreeRate) / (a.volatility || 0.01));
    const positiveSharpes = sharpes.map(s => Math.max(0, s));
    const sumSharpes = positiveSharpes.reduce((a, b) => a + b, 0);

    const weights = positiveSharpes.map(s => s / (sumSharpes || 1));

    const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
    const variance = this.calculatePortfolioVariance(assets, weights);
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility === 0 ? 0 : (expectedReturn - riskFreeRate) / volatility;

    return {
      assets: assets.map((asset, i) => ({
        ...asset,
        weight: weights[i],
      })),
      totalValue: 0,
      expectedReturn,
      volatility,
      sharpeRatio,
      diversificationScore: this.calculateDiversification(weights),
      timestamp: new Date(),
    };
  }

  /**
   * Minimum Variance Portfolio
   */
  static minVariance(assets: Asset[]): Portfolio {
    // Simplified: inverse variance weighting
    const invVar = assets.map(a => 1 / (Math.pow(a.volatility, 2) || 0.01));
    const sumInvVar = invVar.reduce((a, b) => a + b, 0);
    const weights = invVar.map(v => v / sumInvVar);

    const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
    const variance = this.calculatePortfolioVariance(assets, weights);
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility === 0 ? 0 : expectedReturn / volatility;

    return {
      assets: assets.map((asset, i) => ({
        ...asset,
        weight: weights[i],
      })),
      totalValue: 0,
      expectedReturn,
      volatility,
      sharpeRatio,
      diversificationScore: this.calculateDiversification(weights),
      timestamp: new Date(),
    };
  }

  /**
   * Generate rebalance recommendations
   */
  static generateRebalanceRecommendations(
    currentPortfolio: Portfolio,
    targetPortfolio: Portfolio,
    totalValue: number,
    transactionCost: number = 0.001
  ): RebalanceRecommendation {
    const trades: Trade[] = [];
    let totalCost = 0;

    // Calculate trades needed
    for (let i = 0; i < currentPortfolio.assets.length; i++) {
      const current = currentPortfolio.assets[i];
      const target = targetPortfolio.assets.find(a => a.symbol === current.symbol);

      if (!target) continue;

      const weightChange = target.weight - current.weight;

      if (Math.abs(weightChange) > 0.01) { // 1% threshold
        const action: 'BUY' | 'SELL' = weightChange > 0 ? 'BUY' : 'SELL';
        const value = Math.abs(weightChange) * totalValue;

        trades.push({
          symbol: current.symbol,
          action,
          quantity: value, // Simplified
          currentWeight: current.weight,
          targetWeight: target.weight,
        });

        totalCost += value * transactionCost;
      }
    }

    return {
      currentPortfolio,
      targetPortfolio,
      trades,
      expectedImprovement: {
        returnIncrease: targetPortfolio.expectedReturn - currentPortfolio.expectedReturn,
        volatilityReduction: currentPortfolio.volatility - targetPortfolio.volatility,
        sharpeIncrease: targetPortfolio.sharpeRatio - currentPortfolio.sharpeRatio,
      },
      cost: totalCost,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate portfolio variance (simplified)
   */
  private static calculatePortfolioVariance(assets: Asset[], weights: number[]): number {
    // Simplified: assume zero correlation
    // In production, use full covariance matrix
    let variance = 0;

    for (let i = 0; i < assets.length; i++) {
      variance += Math.pow(weights[i] * assets[i].volatility, 2);
    }

    return variance;
  }

  /**
   * Calculate diversification score
   */
  private static calculateDiversification(weights: number[]): number {
    // Herfindahl index (1 - HHI)
    const hhi = weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);
    return 1 - hhi;
  }

  /**
   * Efficient Frontier
   * Generate portfolios along the efficient frontier
   */
  static efficientFrontier(
    assets: Asset[],
    numPoints: number = 20
  ): Portfolio[] {
    const portfolios: Portfolio[] = [];

    // Generate portfolios with different target returns
    const minReturn = Math.min(...assets.map(a => a.expectedReturn));
    const maxReturn = Math.max(...assets.map(a => a.expectedReturn));
    const step = (maxReturn - minReturn) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const targetReturn = minReturn + i * step;

      const portfolio = this.meanVarianceOptimization(assets, {
        targetReturn,
      });

      portfolios.push(portfolio);
    }

    return portfolios.sort((a, b) => a.volatility - b.volatility);
  }
}
