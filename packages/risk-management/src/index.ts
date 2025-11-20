/**
 * @intelgraph/risk-management
 *
 * Comprehensive risk management and portfolio analytics:
 * - Value at Risk (VaR): Historical, Parametric, Monte Carlo
 * - Stress testing and scenario analysis
 * - Portfolio risk metrics (volatility, beta, correlation)
 * - Drawdown analysis and tail risk
 * - Position sizing and risk limits
 */

import Decimal from 'decimal.js';

// ===== VALUE AT RISK (VAR) =====

/**
 * Calculate Historical VaR
 */
export function historicalVaR(
  returns: number[],
  confidenceLevel: number = 0.95,
  portfolioValue: number = 1000000
): {
  var: number;
  cvar: number; // Conditional VaR (Expected Shortfall)
  percentile: number;
} {
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  const varReturn = sortedReturns[index];

  // CVaR: average of returns beyond VaR
  const tailReturns = sortedReturns.slice(0, index + 1);
  const cvarReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;

  return {
    var: Math.abs(varReturn * portfolioValue),
    cvar: Math.abs(cvarReturn * portfolioValue),
    percentile: (1 - confidenceLevel) * 100,
  };
}

/**
 * Calculate Parametric VaR (Variance-Covariance)
 */
export function parametricVaR(
  mean: number,
  stdDev: number,
  confidenceLevel: number = 0.95,
  portfolioValue: number = 1000000,
  timeHorizon: number = 1 // days
): number {
  // Z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.90: 1.282,
    0.95: 1.645,
    0.99: 2.326,
  };

  const zScore = zScores[confidenceLevel] || 1.645;
  const varReturn = mean - (zScore * stdDev * Math.sqrt(timeHorizon));

  return Math.abs(varReturn * portfolioValue);
}

/**
 * Monte Carlo VaR Simulation
 */
export function monteCarloVaR(
  mean: number,
  stdDev: number,
  simulations: number = 10000,
  confidenceLevel: number = 0.95,
  portfolioValue: number = 1000000,
  timeHorizon: number = 1
): {
  var: number;
  cvar: number;
  simulatedReturns: number[];
} {
  const simulatedReturns: number[] = [];

  // Generate random returns using Box-Muller transform
  for (let i = 0; i < simulations; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const simulatedReturn = mean + (stdDev * z * Math.sqrt(timeHorizon));
    simulatedReturns.push(simulatedReturn);
  }

  // Calculate VaR and CVaR from simulated returns
  const sortedReturns = simulatedReturns.sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  const varReturn = sortedReturns[index];

  const tailReturns = sortedReturns.slice(0, index + 1);
  const cvarReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;

  return {
    var: Math.abs(varReturn * portfolioValue),
    cvar: Math.abs(cvarReturn * portfolioValue),
    simulatedReturns,
  };
}

// ===== RISK METRICS =====

/**
 * Calculate portfolio beta
 */
export function calculateBeta(
  assetReturns: number[],
  marketReturns: number[]
): number {
  const n = Math.min(assetReturns.length, marketReturns.length);

  const meanAsset = assetReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanMarket = marketReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (assetReturns[i] - meanAsset) * (marketReturns[i] - meanMarket);
    marketVariance += Math.pow(marketReturns[i] - meanMarket, 2);
  }

  return covariance / marketVariance;
}

/**
 * Calculate Sharpe Ratio
 */
export function sharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02,
  annualizationFactor: number = 252
): number {
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const excessReturn = (meanReturn * annualizationFactor) - riskFreeRate;
  const annualizedStdDev = stdDev * Math.sqrt(annualizationFactor);

  return excessReturn / annualizedStdDev;
}

/**
 * Calculate Sortino Ratio (uses only downside deviation)
 */
export function sortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.02,
  annualizationFactor: number = 252
): number {
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Calculate downside deviation (only negative returns)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);

  const excessReturn = (meanReturn * annualizationFactor) - riskFreeRate;
  const annualizedDownsideDev = downsideDeviation * Math.sqrt(annualizationFactor);

  return excessReturn / annualizedDownsideDev;
}

/**
 * Calculate Maximum Drawdown
 */
export function maxDrawdown(
  prices: number[]
): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  peakIndex: number;
  troughIndex: number;
  recoveryIndex: number | null;
} {
  let maxDD = 0;
  let maxDDPercent = 0;
  let peak = prices[0];
  let peakIndex = 0;
  let troughIndex = 0;
  let recoveryIndex: number | null = null;

  for (let i = 0; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
      peakIndex = i;
    }

    const drawdown = peak - prices[i];
    const drawdownPercent = (drawdown / peak) * 100;

    if (drawdown > maxDD) {
      maxDD = drawdown;
      maxDDPercent = drawdownPercent;
      troughIndex = i;
      recoveryIndex = null;
    }

    // Check for recovery
    if (recoveryIndex === null && prices[i] >= peak && i > troughIndex) {
      recoveryIndex = i;
    }
  }

  return {
    maxDrawdown: maxDD,
    maxDrawdownPercent: maxDDPercent,
    peakIndex,
    troughIndex,
    recoveryIndex,
  };
}

/**
 * Calculate Calmar Ratio (return / max drawdown)
 */
export function calmarRatio(
  returns: number[],
  prices: number[],
  annualizationFactor: number = 252
): number {
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedReturn = meanReturn * annualizationFactor;

  const { maxDrawdownPercent } = maxDrawdown(prices);

  return (annualizedReturn * 100) / maxDrawdownPercent;
}

// ===== CORRELATION AND DIVERSIFICATION =====

/**
 * Calculate correlation matrix for multiple assets
 */
export function correlationMatrix(
  returnsMatrix: number[][]
): number[][] {
  const n = returnsMatrix.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        matrix[i][j] = correlation(returnsMatrix[i], returnsMatrix[j]);
      }
    }
  }

  return matrix;
}

function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  return numerator / Math.sqrt(sumX2 * sumY2);
}

/**
 * Calculate portfolio volatility given weights and covariance matrix
 */
export function portfolioVolatility(
  weights: number[],
  covarianceMatrix: number[][]
): number {
  let variance = 0;

  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }

  return Math.sqrt(variance);
}

// ===== STRESS TESTING =====

export interface StressScenario {
  name: string;
  description: string;
  shocks: {
    symbol: string;
    priceChange: number; // Percentage change
  }[];
}

/**
 * Apply stress scenario to portfolio
 */
export function applyStressScenario(
  positions: { symbol: string; quantity: number; price: number }[],
  scenario: StressScenario
): {
  originalValue: number;
  stressedValue: number;
  loss: number;
  lossPercent: number;
  positionImpacts: { symbol: string; impact: number }[];
} {
  const shockMap = new Map(scenario.shocks.map(s => [s.symbol, s.priceChange]));

  let originalValue = 0;
  let stressedValue = 0;
  const positionImpacts: { symbol: string; impact: number }[] = [];

  for (const position of positions) {
    const posValue = position.quantity * position.price;
    originalValue += posValue;

    const shock = shockMap.get(position.symbol) || 0;
    const stressedPrice = position.price * (1 + shock / 100);
    const stressedPosValue = position.quantity * stressedPrice;
    stressedValue += stressedPosValue;

    positionImpacts.push({
      symbol: position.symbol,
      impact: stressedPosValue - posValue,
    });
  }

  return {
    originalValue,
    stressedValue,
    loss: originalValue - stressedValue,
    lossPercent: ((originalValue - stressedValue) / originalValue) * 100,
    positionImpacts,
  };
}

/**
 * Common stress scenarios
 */
export const commonStressScenarios: StressScenario[] = [
  {
    name: '2008 Financial Crisis',
    description: 'Severe market downturn similar to 2008',
    shocks: [
      { symbol: 'SPY', priceChange: -55 },
      { symbol: 'QQQ', priceChange: -42 },
      { symbol: 'IWM', priceChange: -35 },
    ],
  },
  {
    name: 'COVID-19 Crash',
    description: 'Market shock from pandemic',
    shocks: [
      { symbol: 'SPY', priceChange: -34 },
      { symbol: 'QQQ', priceChange: -23 },
      { symbol: 'IWM', priceChange: -42 },
    ],
  },
  {
    name: 'Tech Bubble Burst',
    description: 'Tech sector selloff',
    shocks: [
      { symbol: 'QQQ', priceChange: -78 },
      { symbol: 'SPY', priceChange: -49 },
    ],
  },
];

// ===== POSITION SIZING =====

/**
 * Kelly Criterion for position sizing
 */
export function kellyCriterion(
  winProbability: number,
  winLossRatio: number
): number {
  return (winProbability * winLossRatio - (1 - winProbability)) / winLossRatio;
}

/**
 * Fixed fractional position sizing
 */
export function fixedFractionalPositionSize(
  accountValue: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskAmount = accountValue * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  return Math.floor(riskAmount / riskPerShare);
}

export * from './var';
export * from './stress';
export * from './metrics';
