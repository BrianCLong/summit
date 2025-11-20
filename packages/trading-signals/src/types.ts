/**
 * Trading Signals Types
 */

export interface TradingSignal {
  id: string;
  symbol: string;
  timestamp: Date;
  type: SignalType;
  direction: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-1
  confidence: number; // 0-1
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  timeHorizon?: 'SHORT' | 'MEDIUM' | 'LONG';
  sources: SignalSource[];
  metadata?: Record<string, any>;
}

export enum SignalType {
  TECHNICAL = 'TECHNICAL',
  FUNDAMENTAL = 'FUNDAMENTAL',
  SENTIMENT = 'SENTIMENT',
  ML_PREDICTION = 'ML_PREDICTION',
  PATTERN = 'PATTERN',
  MOMENTUM = 'MOMENTUM',
  MEAN_REVERSION = 'MEAN_REVERSION',
  BREAKOUT = 'BREAKOUT',
  COMPOSITE = 'COMPOSITE',
}

export interface SignalSource {
  type: SignalType;
  name: string;
  weight: number;
  value: number;
  confidence: number;
}

export interface SentimentData {
  symbol: string;
  timestamp: Date;
  score: number; // -1 to 1
  volume: number;
  sources: {
    twitter?: number;
    reddit?: number;
    news?: number;
    analyst?: number;
  };
  topics: string[];
  entities: string[];
}

export interface MLPrediction {
  symbol: string;
  timestamp: Date;
  horizon: number; // hours
  predictedPrice: number;
  currentPrice: number;
  confidence: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  probability: number;
  features: Record<string, number>;
}

export interface SignalBacktest {
  signal: TradingSignal;
  entry: {
    price: number;
    timestamp: Date;
  };
  exit: {
    price: number;
    timestamp: Date;
  };
  return: number;
  returnPct: number;
  duration: number; // milliseconds
  maxDrawdown: number;
  sharpeRatio?: number;
}

export interface SignalPerformance {
  signalType: SignalType;
  totalSignals: number;
  winRate: number;
  avgReturn: number;
  avgReturnPct: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  backtests: SignalBacktest[];
}
