/**
 * Signal Generator Service
 * Main orchestration service for trading signal generation
 */

import { MarketDataPipeline, AssetClass, DataType, PriceData } from '@intelgraph/market-data';
import { TechnicalAnalysisEngine } from '@intelgraph/technical-analysis';
import { SentimentAnalyzer, MLPredictor, SignalAggregator } from '@intelgraph/trading-signals';
import { PortfolioOptimizer, Asset } from '@intelgraph/portfolio-optimization';
import { EventEmitter } from 'events';
import { createClient, RedisClientType } from 'redis';

export interface SignalGeneratorConfig {
  symbols: string[];
  assetClass: AssetClass;
  updateInterval?: number; // milliseconds
  marketDataConfig?: any;
  sentimentConfig?: any;
  redis?: {
    host?: string;
    port?: number;
  };
}

export class SignalGeneratorService extends EventEmitter {
  private config: SignalGeneratorConfig;
  private marketDataPipeline: MarketDataPipeline;
  private technicalEngine: TechnicalAnalysisEngine;
  private sentimentAnalyzer: SentimentAnalyzer;
  private mlPredictor: MLPredictor;
  private signalAggregator: SignalAggregator;
  private redis: RedisClientType;
  private priceHistory: Map<string, PriceData[]> = new Map();
  private running: boolean = false;

  constructor(config: SignalGeneratorConfig) {
    super();
    this.config = {
      updateInterval: 60000, // 1 minute default
      ...config,
    };

    // Initialize components
    this.marketDataPipeline = new MarketDataPipeline({
      feeds: [
        {
          type: config.assetClass,
          config: config.marketDataConfig || {},
        },
      ],
    });

    this.technicalEngine = new TechnicalAnalysisEngine();
    this.sentimentAnalyzer = new SentimentAnalyzer(config.sentimentConfig || {});
    this.mlPredictor = new MLPredictor();
    this.signalAggregator = new SignalAggregator();

    // Initialize Redis
    this.redis = createClient({
      socket: {
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
      },
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  /**
   * Start the signal generation service
   */
  async start(): Promise<void> {
    console.log('Starting Signal Generator Service...');

    // Connect to Redis
    await this.redis.connect();
    console.log('Connected to Redis');

    // Connect to market data feeds
    await this.marketDataPipeline.connect();
    console.log('Connected to market data feeds');

    // Subscribe to market data
    await this.marketDataPipeline.subscribe(
      this.config.assetClass,
      this.config.symbols,
      [DataType.PRICE, DataType.TRADE]
    );
    console.log(`Subscribed to ${this.config.symbols.length} symbols`);

    // Set up event listeners
    this.marketDataPipeline.on('price', (data: PriceData) => {
      this.handlePriceUpdate(data);
    });

    // Start periodic signal generation
    this.running = true;
    this.startSignalGeneration();

    console.log('Signal Generator Service started successfully');
    this.emit('started');
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    console.log('Stopping Signal Generator Service...');
    this.running = false;

    await this.marketDataPipeline.disconnect();
    await this.redis.disconnect();

    console.log('Signal Generator Service stopped');
    this.emit('stopped');
  }

  /**
   * Handle price updates
   */
  private handlePriceUpdate(data: PriceData): void {
    // Store in history
    if (!this.priceHistory.has(data.symbol)) {
      this.priceHistory.set(data.symbol, []);
    }

    const history = this.priceHistory.get(data.symbol)!;
    history.push(data);

    // Keep last 500 candles
    if (history.length > 500) {
      history.shift();
    }

    this.emit('price-update', data);
  }

  /**
   * Periodic signal generation
   */
  private startSignalGeneration(): void {
    const generate = async () => {
      if (!this.running) return;

      try {
        for (const symbol of this.config.symbols) {
          await this.generateSignalsForSymbol(symbol);
        }
      } catch (error) {
        console.error('Signal generation error:', error);
        this.emit('error', error);
      }

      if (this.running) {
        setTimeout(generate, this.config.updateInterval);
      }
    };

    generate();
  }

  /**
   * Generate signals for a single symbol
   */
  private async generateSignalsForSymbol(symbol: string): Promise<void> {
    const prices = this.priceHistory.get(symbol);

    if (!prices || prices.length < 100) {
      console.log(`Insufficient price data for ${symbol}`);
      return;
    }

    console.log(`Generating signals for ${symbol}...`);

    // Run technical analysis
    const technicalAnalysis = await this.technicalEngine.analyze(symbol, prices);

    // Get sentiment data
    let sentiment;
    try {
      sentiment = await this.sentimentAnalyzer.analyzeSentiment(symbol);
    } catch (error) {
      console.error(`Sentiment analysis failed for ${symbol}:`, error);
    }

    // Get ML prediction
    let mlPrediction;
    try {
      // Train model if not already trained
      if (!this.mlPredictor['models'].has(symbol)) {
        await this.mlPredictor.train(symbol, prices);
      }
      mlPrediction = await this.mlPredictor.predict(symbol, prices);
    } catch (error) {
      console.error(`ML prediction failed for ${symbol}:`, error);
    }

    // Aggregate signals
    const currentPrice = prices[prices.length - 1].close;
    const signal = this.signalAggregator.aggregate(
      symbol,
      currentPrice,
      technicalAnalysis,
      sentiment,
      mlPrediction
    );

    if (signal) {
      console.log(`Generated signal for ${symbol}:`, {
        direction: signal.direction,
        strength: signal.strength.toFixed(2),
        confidence: signal.confidence.toFixed(2),
      });

      // Store signal in Redis
      await this.redis.set(
        `signal:${symbol}:latest`,
        JSON.stringify(signal),
        { EX: 3600 } // 1 hour expiry
      );

      // Add to signal history
      await this.redis.lPush(
        `signal:${symbol}:history`,
        JSON.stringify(signal)
      );
      await this.redis.lTrim(`signal:${symbol}:history`, 0, 99); // Keep last 100

      this.emit('signal', signal);
    }
  }

  /**
   * Get latest signal for a symbol
   */
  async getLatestSignal(symbol: string): Promise<any | null> {
    const data = await this.redis.get(`signal:${symbol}:latest`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get signal history for a symbol
   */
  async getSignalHistory(symbol: string, limit: number = 20): Promise<any[]> {
    const data = await this.redis.lRange(`signal:${symbol}:history`, 0, limit - 1);
    return data.map(item => JSON.parse(item));
  }

  /**
   * Generate portfolio recommendations
   */
  async generatePortfolioRecommendations(): Promise<any> {
    const assets: Asset[] = [];

    // Collect data for all symbols
    for (const symbol of this.config.symbols) {
      const prices = this.priceHistory.get(symbol);
      if (!prices || prices.length < 50) continue;

      // Calculate expected return (simplified)
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
      }

      const expectedReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce(
        (sum, r) => sum + Math.pow(r - expectedReturn, 2),
        0
      ) / returns.length;
      const volatility = Math.sqrt(variance);

      assets.push({
        symbol,
        weight: 0,
        expectedReturn,
        volatility,
      });
    }

    if (assets.length === 0) {
      return null;
    }

    // Generate different portfolio allocations
    const meanVariance = PortfolioOptimizer.meanVarianceOptimization(assets);
    const riskParity = PortfolioOptimizer.riskParityOptimization(assets);
    const maxSharpe = PortfolioOptimizer.maxSharpeRatio(assets);

    return {
      meanVariance,
      riskParity,
      maxSharpe,
      timestamp: new Date(),
    };
  }
}

// Main execution
if (require.main === module) {
  const service = new SignalGeneratorService({
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN'],
    assetClass: AssetClass.STOCK,
    updateInterval: 60000,
    marketDataConfig: {
      apiKey: process.env.MARKET_DATA_API_KEY || 'demo',
    },
  });

  service.on('signal', (signal) => {
    console.log('New signal:', signal);
  });

  service.on('error', (error) => {
    console.error('Service error:', error);
  });

  service.start().catch((error) => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...');
    await service.stop();
    process.exit(0);
  });
}

export default SignalGeneratorService;
