/**
 * ML Predictor
 * Machine learning-based price prediction
 */

import { PriceData } from '@intelgraph/market-data';
import { TrendIndicators } from '@intelgraph/technical-analysis';
import { MLPrediction } from '../types';

export interface PredictorConfig {
  modelType?: 'LSTM' | 'TRANSFORMER' | 'LINEAR';
  features?: string[];
  horizon?: number; // hours
  confidenceThreshold?: number;
}

export class MLPredictor {
  private config: PredictorConfig;
  private models: Map<string, any> = new Map();

  constructor(config: PredictorConfig = {}) {
    this.config = {
      modelType: config.modelType || 'LSTM',
      features: config.features || [
        'price',
        'volume',
        'sma_20',
        'sma_50',
        'rsi',
        'macd',
        'volatility',
      ],
      horizon: config.horizon || 24, // 24 hours
      confidenceThreshold: config.confidenceThreshold || 0.6,
      ...config,
    };
  }

  /**
   * Train model on historical data
   */
  async train(symbol: string, historicalData: PriceData[]): Promise<void> {
    console.log(`Training ${this.config.modelType} model for ${symbol}...`);

    // Extract features
    const features = this.extractFeatures(historicalData);

    // In production, this would call actual ML training
    // For now, store a mock model
    const model = {
      symbol,
      trained: new Date(),
      features: this.config.features,
      accuracy: 0.7 + Math.random() * 0.2, // Mock accuracy
    };

    this.models.set(symbol, model);
    console.log(`Model trained for ${symbol} with accuracy: ${model.accuracy.toFixed(2)}`);
  }

  /**
   * Predict future price
   */
  async predict(symbol: string, currentData: PriceData[]): Promise<MLPrediction> {
    const model = this.models.get(symbol);
    if (!model) {
      throw new Error(`No trained model found for ${symbol}`);
    }

    // Extract features from current data
    const features = this.extractFeatures(currentData);
    const latestFeatures = features[features.length - 1];

    // Mock prediction (in production, use actual ML model)
    const currentPrice = currentData[currentData.length - 1].close;
    const volatility = this.calculateVolatility(currentData.slice(-20));

    // Generate prediction with some randomness based on indicators
    const rsiValue = latestFeatures.rsi || 50;
    const macdValue = latestFeatures.macd || 0;

    const trendBias = (rsiValue - 50) / 50; // -1 to 1
    const momentumBias = macdValue / currentPrice;

    const predictedChange = (trendBias * 0.5 + momentumBias * 0.5) * volatility;
    const predictedPrice = currentPrice * (1 + predictedChange);

    const direction: 'UP' | 'DOWN' | 'NEUTRAL' =
      predictedChange > 0.01 ? 'UP' :
      predictedChange < -0.01 ? 'DOWN' :
      'NEUTRAL';

    const confidence = model.accuracy * (1 - Math.abs(predictedChange) * 2);

    return {
      symbol,
      timestamp: new Date(),
      horizon: this.config.horizon!,
      predictedPrice,
      currentPrice,
      confidence: Math.max(0, Math.min(1, confidence)),
      direction,
      probability: 0.5 + Math.abs(predictedChange) / 2,
      features: latestFeatures,
    };
  }

  /**
   * Extract features for ML model
   */
  private extractFeatures(
    prices: PriceData[]
  ): Array<Record<string, number>> {
    const features: Array<Record<string, number>> = [];

    // Calculate indicators
    const sma20 = TrendIndicators.sma(prices, 20);
    const sma50 = TrendIndicators.sma(prices, 50);
    const rsi = TrendIndicators.rsi(prices, 14);
    const macd = TrendIndicators.macd(prices);

    // Combine features
    const startIndex = Math.max(0, prices.length - sma50.length);

    for (let i = 0; i < sma50.length; i++) {
      const priceIndex = startIndex + i;
      const feature: Record<string, number> = {
        price: prices[priceIndex].close,
        volume: prices[priceIndex].volume,
        sma_20: sma20[i]?.value || 0,
        sma_50: sma50[i].value,
        rsi: rsi[i]?.value || 50,
        macd: macd.macd[i]?.value || 0,
        volatility: this.calculateVolatility(prices.slice(Math.max(0, priceIndex - 20), priceIndex + 1)),
      };

      features.push(feature);
    }

    return features;
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(prices: PriceData[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Detect regime (bull/bear/sideways market)
   */
  detectRegime(prices: PriceData[]): {
    regime: 'BULL' | 'BEAR' | 'SIDEWAYS';
    confidence: number;
  } {
    const sma50 = TrendIndicators.sma(prices, 50);
    const sma200 = TrendIndicators.sma(prices, 200);

    if (sma50.length === 0 || sma200.length === 0) {
      return { regime: 'SIDEWAYS', confidence: 0.5 };
    }

    const sma50Current = sma50[sma50.length - 1].value;
    const sma200Current = sma200[sma200.length - 1].value;
    const currentPrice = prices[prices.length - 1].close;

    const diff = (sma50Current - sma200Current) / sma200Current;
    const pricePosition = (currentPrice - sma200Current) / sma200Current;

    if (diff > 0.05 && pricePosition > 0) {
      return {
        regime: 'BULL',
        confidence: Math.min(1, Math.abs(diff) * 10),
      };
    } else if (diff < -0.05 && pricePosition < 0) {
      return {
        regime: 'BEAR',
        confidence: Math.min(1, Math.abs(diff) * 10),
      };
    }

    return {
      regime: 'SIDEWAYS',
      confidence: 0.7,
    };
  }

  /**
   * Detect anomalies in price data
   */
  detectAnomalies(prices: PriceData[]): Array<{
    timestamp: Date;
    price: number;
    anomalyScore: number;
  }> {
    const anomalies: Array<{
      timestamp: Date;
      price: number;
      anomalyScore: number;
    }> = [];

    const mean = prices.reduce((sum, p) => sum + p.close, 0) / prices.length;
    const std = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p.close - mean, 2), 0) / prices.length
    );

    for (const price of prices) {
      const zScore = Math.abs((price.close - mean) / std);
      if (zScore > 2.5) {
        anomalies.push({
          timestamp: price.timestamp,
          price: price.close,
          anomalyScore: zScore,
        });
      }
    }

    return anomalies;
  }
}
