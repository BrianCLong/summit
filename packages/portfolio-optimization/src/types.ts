/**
 * Portfolio Optimization Types
 */

export interface Asset {
  symbol: string;
  weight: number;
  expectedReturn: number;
  volatility: number;
}

export interface Portfolio {
  assets: Asset[];
  totalValue: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  diversificationScore: number;
  timestamp: Date;
}

export interface OptimizationConstraints {
  minWeight?: number;
  maxWeight?: number;
  targetReturn?: number;
  maxVolatility?: number;
  allowShort?: boolean;
  sectorLimits?: Record<string, number>;
}

export interface RebalanceRecommendation {
  currentPortfolio: Portfolio;
  targetPortfolio: Portfolio;
  trades: Trade[];
  expectedImprovement: {
    returnIncrease: number;
    volatilityReduction: number;
    sharpeIncrease: number;
  };
  cost: number;
  timestamp: Date;
}

export interface Trade {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  currentWeight: number;
  targetWeight: number;
}

export interface RiskMetrics {
  var95: number; // Value at Risk (95%)
  cvar95: number; // Conditional VaR (95%)
  maxDrawdown: number;
  beta: number;
  alpha: number;
  correlation: Record<string, number>;
}

export interface FactorExposure {
  factor: string;
  exposure: number;
  contribution: number;
}
