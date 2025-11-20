# Trading Signal Generation System

## Overview

The Trading Signal Generation System is an institutional-grade platform that combines market data ingestion, technical analysis, sentiment analysis, machine learning predictions, and portfolio optimization to generate actionable trading signals.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Signal Generator Service                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Market Data  │  │ Technical    │  │  Sentiment   │     │
│  │  Pipeline    │─▶│  Analysis    │  │  Analyzer    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            ▼                                │
│                   ┌────────────────┐                       │
│                   │  ML Predictor  │                       │
│                   └────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌────────────────┐                       │
│                   │    Signal      │                       │
│                   │  Aggregator    │                       │
│                   └────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌────────────────┐                       │
│                   │  Portfolio     │                       │
│                   │ Optimization   │                       │
│                   └────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Market Data Pipeline

**Package**: `@intelgraph/market-data`

Real-time market data ingestion supporting multiple asset classes and data sources.

**Features**:
- Multi-asset support (stocks, crypto, forex, derivatives)
- WebSocket-based real-time streaming
- Historical data retrieval
- Redis-based caching
- Automatic reconnection
- Exchange support: Binance, Coinbase, Kraken, and more

**Usage**:
```typescript
import { MarketDataPipeline, AssetClass, DataType } from '@intelgraph/market-data';

const pipeline = new MarketDataPipeline({
  feeds: [
    { type: AssetClass.STOCK, config: { apiKey: 'YOUR_KEY' } },
    { type: AssetClass.CRYPTO, config: { exchange: 'binance' } }
  ]
});

await pipeline.connect();
pipeline.on('price', (data) => console.log('Price update:', data));
await pipeline.subscribe(AssetClass.STOCK, ['AAPL', 'MSFT'], [DataType.PRICE]);
```

### 2. Technical Analysis Engine

**Package**: `@intelgraph/technical-analysis`

Comprehensive technical analysis with 20+ indicators and pattern recognition.

**Features**:
- **Trend Indicators**: SMA, EMA, MACD, RSI, Bollinger Bands, ADX
- **Volume Indicators**: OBV, CMF, VWAP, MFI, Volume Profile
- **Pattern Recognition**: Head & Shoulders, Double Top/Bottom, Triangles
- **Support/Resistance Detection**: Automatic level identification
- **Trend Analysis**: Market regime detection

**Usage**:
```typescript
import { TechnicalAnalysisEngine } from '@intelgraph/technical-analysis';

const engine = new TechnicalAnalysisEngine({
  indicators: {
    sma: [20, 50, 200],
    rsi: true,
    macd: true,
  },
  patterns: {
    headAndShoulders: true,
    triangles: true,
  }
});

const analysis = await engine.analyze('AAPL', priceData);
console.log('RSI:', analysis.indicators.rsi);
console.log('Patterns:', analysis.patterns);
console.log('Trend:', analysis.trendAnalysis);
```

### 3. Trading Signals Package

**Package**: `@intelgraph/trading-signals`

Advanced signal generation with ML predictions and sentiment analysis.

**Features**:
- **Sentiment Analysis**: Twitter, Reddit, news sentiment
- **ML Predictions**: LSTM/Transformer-based price forecasting
- **Signal Aggregation**: Multi-factor signal combination
- **Backtesting**: Historical performance analysis
- **Risk-Adjusted Returns**: Sharpe ratio, win rate, profit factor

**Usage**:
```typescript
import { SentimentAnalyzer, MLPredictor, SignalAggregator } from '@intelgraph/trading-signals';

// Sentiment analysis
const sentimentAnalyzer = new SentimentAnalyzer({
  twitterApiKey: 'YOUR_KEY',
  redditApiKey: 'YOUR_KEY'
});
const sentiment = await sentimentAnalyzer.analyzeSentiment('AAPL');

// ML prediction
const mlPredictor = new MLPredictor({ modelType: 'LSTM' });
await mlPredictor.train('AAPL', historicalData);
const prediction = await mlPredictor.predict('AAPL', currentData);

// Signal aggregation
const aggregator = new SignalAggregator({
  weights: { technical: 0.3, sentiment: 0.2, ml: 0.3, pattern: 0.2 }
});
const signal = aggregator.aggregate('AAPL', currentPrice, technical, sentiment, prediction);
```

### 4. Portfolio Optimization

**Package**: `@intelgraph/portfolio-optimization`

Modern portfolio theory implementation with multiple optimization strategies.

**Features**:
- **Mean-Variance Optimization**: Markowitz portfolio optimization
- **Risk Parity**: Equal risk contribution allocation
- **Maximum Sharpe Ratio**: Risk-adjusted return maximization
- **Efficient Frontier**: Portfolio performance visualization
- **Risk Metrics**: VaR, CVaR, Beta, Alpha, correlations
- **Rebalancing**: Automated rebalancing recommendations

**Usage**:
```typescript
import { PortfolioOptimizer, RiskCalculator } from '@intelgraph/portfolio-optimization';

// Optimize portfolio
const portfolio = PortfolioOptimizer.meanVarianceOptimization(assets, constraints);
console.log('Expected Return:', portfolio.expectedReturn);
console.log('Volatility:', portfolio.volatility);
console.log('Sharpe Ratio:', portfolio.sharpeRatio);

// Calculate risk metrics
const riskMetrics = RiskCalculator.calculateRiskMetrics(portfolio, historicalReturns, marketReturns);
console.log('VaR (95%):', riskMetrics.var95);
console.log('Beta:', riskMetrics.beta);

// Generate rebalancing recommendations
const rebalance = PortfolioOptimizer.generateRebalanceRecommendations(
  currentPortfolio,
  targetPortfolio,
  totalValue
);
```

### 5. Signal Generator Service

**Service**: `@intelgraph/signal-generator`

Main orchestration service that coordinates all components.

**Features**:
- Real-time signal generation
- Multi-symbol monitoring
- Redis-based signal storage
- Portfolio recommendations
- Event-driven architecture

**Usage**:
```typescript
import SignalGeneratorService from '@intelgraph/signal-generator';

const service = new SignalGeneratorService({
  symbols: ['AAPL', 'MSFT', 'GOOGL'],
  assetClass: AssetClass.STOCK,
  updateInterval: 60000,
  marketDataConfig: { apiKey: process.env.API_KEY }
});

service.on('signal', (signal) => {
  console.log('New signal:', signal);
});

await service.start();
```

## Signal Types

### 1. Technical Signals
- Based on technical indicators (RSI, MACD, trend)
- High frequency, short to medium-term
- Confidence: 0.6-0.8

### 2. Sentiment Signals
- Social media and news sentiment
- Short-term, event-driven
- Confidence: 0.5-0.7

### 3. ML Prediction Signals
- Machine learning price forecasts
- Medium to long-term
- Confidence: 0.6-0.9

### 4. Pattern Signals
- Chart pattern recognition
- Medium-term
- Confidence: 0.7-0.9

### 5. Composite Signals
- Aggregation of all signal types
- Weighted combination
- Confidence: 0.7-0.95

## Signal Attributes

```typescript
{
  id: string;
  symbol: string;
  timestamp: Date;
  type: SignalType;
  direction: 'BUY' | 'SELL' | 'HOLD';
  strength: number;        // 0-1
  confidence: number;      // 0-1
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
  sources: SignalSource[];
}
```

## Backtesting

Evaluate signal performance on historical data:

```typescript
import { SignalBacktester } from '@intelgraph/trading-signals';

const backtester = new SignalBacktester({
  initialCapital: 10000,
  commission: 0.001,
  maxHoldingPeriod: 72
});

const backtests = backtester.backtestSignals(signals, historicalPrices);
const performance = backtester.calculatePerformance(backtests);

console.log('Win Rate:', performance.winRate);
console.log('Sharpe Ratio:', performance.sharpeRatio);
console.log('Profit Factor:', performance.profitFactor);
```

## Configuration

### Environment Variables

```bash
# Market Data
MARKET_DATA_API_KEY=your_api_key_here

# Sentiment Analysis
TWITTER_API_KEY=your_twitter_key
REDDIT_API_KEY=your_reddit_key
NEWS_API_KEY=your_news_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Service
UPDATE_INTERVAL=60000
SYMBOLS=AAPL,MSFT,GOOGL,AMZN
```

### Service Configuration

```typescript
const config = {
  symbols: ['AAPL', 'MSFT', 'GOOGL'],
  assetClass: AssetClass.STOCK,
  updateInterval: 60000,

  marketDataConfig: {
    apiKey: process.env.MARKET_DATA_API_KEY,
    wsUrl: 'wss://stream.example.com',
  },

  sentimentConfig: {
    twitterApiKey: process.env.TWITTER_API_KEY,
    redditApiKey: process.env.REDDIT_API_KEY,
    updateInterval: 300000,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
};
```

## API Endpoints

When deployed as a service, the following endpoints are available:

### GET /signals/:symbol/latest
Get the latest signal for a symbol.

### GET /signals/:symbol/history
Get signal history for a symbol.

### GET /portfolio/recommendations
Get portfolio optimization recommendations.

### GET /analysis/:symbol
Get complete technical analysis for a symbol.

### POST /signals/backtest
Backtest signals on historical data.

## Performance Metrics

The system tracks and reports:
- **Win Rate**: Percentage of profitable signals
- **Average Return**: Mean return per signal
- **Sharpe Ratio**: Risk-adjusted return
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Profit Factor**: Gross profits / gross losses
- **Confidence Distribution**: Signal quality metrics

## Best Practices

1. **Diversification**: Use signals across multiple timeframes and types
2. **Risk Management**: Always use stop losses and position sizing
3. **Backtesting**: Validate signals on historical data before live trading
4. **Monitoring**: Track signal performance continuously
5. **Updates**: Retrain ML models regularly with new data
6. **Latency**: Minimize data pipeline latency for best execution

## Troubleshooting

### Issue: No signals generated
- Check if sufficient price data is available (min 100 candles)
- Verify market data feed connection
- Check signal confidence thresholds

### Issue: Poor backtest performance
- Adjust signal aggregation weights
- Increase minimum confidence threshold
- Review indicator parameters

### Issue: High latency
- Enable Redis caching
- Optimize data pipeline configuration
- Use faster market data sources

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/trading-signals
- Documentation: https://docs.your-org.com/trading-signals
- Email: support@your-org.com
