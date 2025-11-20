# Time Series Forecasting Guide

## Overview

The IntelGraph Forecasting Engine provides enterprise-grade time series prediction capabilities with multiple algorithms, ensemble methods, automated model selection, and comprehensive evaluation tools.

## Forecasting Algorithms

### 1. ARIMA (AutoRegressive Integrated Moving Average)

ARIMA models are ideal for univariate time series with trends and no strong seasonality.

**Parameters:**
- `p`: Autoregressive order (number of lag observations)
- `d`: Differencing order (to make series stationary)
- `q`: Moving average order (size of moving average window)

**Usage:**

```typescript
import { ARIMA } from '@intelgraph/forecasting';

const model = new ARIMA({
  p: 2,  // AR order
  d: 1,  // Differencing
  q: 2   // MA order
});

await model.fit(historicalData);
const forecast = await model.forecast(30, 0.95); // 30 periods ahead, 95% confidence
```

**When to use:**
- Non-seasonal data
- Data with trends
- Short to medium-term forecasts
- When interpretability is important

### 2. SARIMA (Seasonal ARIMA)

Extension of ARIMA for seasonal data.

**Parameters:**
- `p, d, q`: Non-seasonal parameters
- `P, D, Q`: Seasonal parameters
- `s`: Seasonal period (e.g., 12 for monthly data with yearly seasonality)

**Usage:**

```typescript
const model = new ARIMA({
  p: 1, d: 1, q: 1,    // Non-seasonal
  P: 1, D: 1, Q: 1,    // Seasonal
  s: 12                // Monthly seasonality
});
```

**When to use:**
- Strong seasonal patterns
- Regular seasonal cycles
- Medium to long-term forecasts

### 3. Exponential Smoothing (Holt-Winters)

Triple exponential smoothing handles trend and seasonality effectively.

**Configuration:**

```typescript
import { ExponentialSmoothing } from '@intelgraph/forecasting';

const model = new ExponentialSmoothing({
  trend: 'add',              // 'add', 'mul', or null
  seasonal: 'add',           // 'add', 'mul', or null
  seasonal_periods: 24,      // Hourly data with daily seasonality
  damped_trend: false,       // Dampen trend over time
  alpha: 0.2,               // Level smoothing
  beta: 0.1,                // Trend smoothing
  gamma: 0.1                // Seasonal smoothing
});

await model.fit(data);
const forecast = await model.forecast(168); // Week ahead
```

**Modes:**
- **Additive**: Seasonal variations are constant
- **Multiplicative**: Seasonal variations proportional to level

**When to use:**
- Strong seasonal patterns
- Need fast computation
- Short to medium-term forecasts
- Real-time forecasting

### 4. Ensemble Forecasting

Combine multiple models for improved accuracy and robustness.

**Usage:**

```typescript
import { EnsembleForecaster } from '@intelgraph/forecasting';

const ensemble = new EnsembleForecaster({
  models: [
    {
      model_type: 'arima',
      hyperparameters: { p: 1, d: 1, q: 1 }
    },
    {
      model_type: 'exponential_smoothing',
      hyperparameters: { trend: 'add', seasonal: 'add', seasonal_periods: 24 }
    }
  ],
  combination_method: 'weighted_average',
  weights: [0.6, 0.4]
});

await ensemble.fit(data);
const forecast = await ensemble.forecast(24);
```

**Combination Methods:**
- `average`: Simple average
- `weighted_average`: Weighted by specified weights
- `median`: Median of predictions
- `stacking`: Meta-model learns optimal combination

**When to use:**
- Maximum accuracy required
- Uncertain about best single model
- Robust predictions needed

## Model Selection

### Automated Model Selection

Let the system choose the best model:

```typescript
import { ARIMA } from '@intelgraph/forecasting';

// Automatic parameter search
const result = await ARIMA.autoFit(data, 5, 2, 5); // maxP, maxD, maxQ

console.log('Best config:', result.config);
console.log('Validation metrics:', result.metrics);

// Use best model for forecasting
const model = new ARIMA(result.config);
await model.fit(data);
const forecast = await model.forecast(30);
```

### Model Comparison

Compare multiple models systematically:

```typescript
import { Backtesting } from '@intelgraph/forecasting';

const modelConfigs = [
  { model_type: 'arima', hyperparameters: { p: 1, d: 1, q: 1 } },
  { model_type: 'arima', hyperparameters: { p: 2, d: 1, q: 2 } },
  { model_type: 'exponential_smoothing', hyperparameters: { trend: 'add', seasonal: 'add', seasonal_periods: 24 } }
];

const comparisons = await Backtesting.compareModels(
  data,
  timestamps,
  modelConfigs,
  {
    initial_training_size: 100,
    horizon: 24,
    n_splits: 5
  }
);

// Results sorted by performance
console.log('Best model:', comparisons[0].config);
console.log('Average RMSE:', comparisons[0].results.average_metrics.rmse);
```

## Model Evaluation

### Backtesting

Evaluate model performance on historical data:

```typescript
import { Backtesting } from '@intelgraph/forecasting';

const results = await Backtesting.timeSeriesCrossValidation(
  data,
  timestamps,
  modelConfig,
  {
    initial_training_size: 200,  // Initial training window
    horizon: 24,                  // Forecast horizon
    step_size: 24,                // Step between splits
    n_splits: 10                  // Number of validation splits
  }
);

console.log('Average metrics:', results.average_metrics);
console.log('Individual splits:', results.splits);
```

### Walk-Forward Validation

Simulate real-world forecasting:

```typescript
const results = await Backtesting.walkForwardValidation(
  data,
  timestamps,
  modelConfig,
  100,  // Window size
  1     // Step size (1 = one-step-ahead)
);

console.log('Walk-forward RMSE:', results.average_metrics.rmse);
```

### Forecast Accuracy Metrics

**MAE (Mean Absolute Error)**
- Average absolute difference between forecast and actual
- Same unit as data
- `MAE = mean(|actual - predicted|)`

**RMSE (Root Mean Square Error)**
- Square root of average squared errors
- Penalizes large errors more
- `RMSE = sqrt(mean((actual - predicted)²))`

**MAPE (Mean Absolute Percentage Error)**
- Average percentage error
- Scale-independent
- `MAPE = mean(|actual - predicted| / |actual|) × 100`

**MASE (Mean Absolute Scaled Error)**
- Scaled by naive forecast error
- Good for intermittent demand
- Values < 1 indicate better than naive

```typescript
const metrics = model.calculateMetrics(actual, predicted);

console.log(`MAE: ${metrics.mae}`);
console.log(`RMSE: ${metrics.rmse}`);
console.log(`MAPE: ${metrics.mape}%`);
```

## Advanced Techniques

### Multi-Horizon Forecasting

Generate forecasts for multiple time horizons:

```typescript
const horizons = [1, 7, 30];
const forecasts: Record<number, ForecastPoint[]> = {};

for (const horizon of horizons) {
  forecasts[horizon] = await model.forecast(horizon);
}

console.log('Short-term (1 day):', forecasts[1]);
console.log('Medium-term (1 week):', forecasts[7]);
console.log('Long-term (1 month):', forecasts[30]);
```

### Confidence Intervals

Forecasts include prediction intervals:

```typescript
const forecast = await model.forecast(30, 0.95); // 95% confidence

forecast.forEach(point => {
  console.log(`${point.timestamp}: ${point.predicted_value}`);
  console.log(`  95% CI: [${point.lower_bound}, ${point.upper_bound}]`);
});
```

### Handling Missing Data

Impute missing values before forecasting:

```typescript
function imputeMissing(data: number[]): number[] {
  const result = [...data];

  for (let i = 0; i < result.length; i++) {
    if (isNaN(result[i]) || result[i] === null) {
      // Linear interpolation
      let prev = i - 1;
      let next = i + 1;

      while (prev >= 0 && isNaN(result[prev])) prev--;
      while (next < result.length && isNaN(result[next])) next++;

      if (prev >= 0 && next < result.length) {
        result[i] = result[prev] + (result[next] - result[prev]) * ((i - prev) / (next - prev));
      } else if (prev >= 0) {
        result[i] = result[prev];
      } else if (next < result.length) {
        result[i] = result[next];
      }
    }
  }

  return result;
}

const cleanedData = imputeMissing(rawData);
await model.fit(cleanedData);
```

### Seasonal Adjustment

Remove seasonality before forecasting:

```typescript
import { SeasonalDecomposition } from '@intelgraph/seasonal-decomposition';

// Decompose time series
const decomp = SeasonalDecomposition.additiveDecomposition(data, timestamps, 24);

// Forecast deseasonalized data
const deseasonalized = data.map((v, i) => v - decomp.seasonal[i]);
await model.fit(deseasonalized);
const forecast = await model.forecast(24);

// Add seasonality back
const seasonalForecast = forecast.map((point, i) => ({
  ...point,
  predicted_value: point.predicted_value + decomp.seasonal[i % 24]
}));
```

## Production Deployment

### Model Persistence

Save and load trained models:

```typescript
interface ModelArtifact {
  model_id: string;
  model_type: string;
  parameters: Record<string, any>;
  trained_at: Date;
  performance_metrics: ForecastMetrics;
}

// Save model
async function saveModel(model: ARIMA, modelId: string): Promise<void> {
  const artifact: ModelArtifact = {
    model_id: modelId,
    model_type: 'arima',
    parameters: model.config,
    trained_at: new Date(),
    performance_metrics: model.metrics
  };

  await db.insert('forecast_models', artifact);
}

// Load and use model
async function loadModel(modelId: string): Promise<ARIMA> {
  const artifact = await db.findOne('forecast_models', { model_id: modelId });
  const model = new ARIMA(artifact.parameters);
  // Model needs to be retrained or state restored
  return model;
}
```

### Continuous Retraining

Implement automated model retraining:

```typescript
async function retrainSchedule() {
  setInterval(async () => {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const data = await storage.query({
      start_time: cutoffDate,
      end_time: new Date(),
      metric_name: 'daily_sales'
    });

    const model = new ARIMA({ p: 1, d: 1, q: 1 });
    await model.fit(data.map(d => d.value));

    await saveModel(model, 'daily_sales_arima');
    console.log('Model retrained successfully');
  }, 24 * 60 * 60 * 1000); // Daily
}
```

### Forecast Monitoring

Track forecast accuracy in production:

```typescript
async function monitorForecastAccuracy() {
  const forecast = await loadForecast('daily_sales', yesterday);
  const actual = await storage.query({
    start_time: yesterday,
    end_time: today,
    metric_name: 'daily_sales'
  });

  const error = Math.abs(actual[0].value - forecast.predicted_value);
  const mape = (error / actual[0].value) * 100;

  if (mape > 20) {
    console.warn('Forecast accuracy degraded, retraining recommended');
    await triggerRetraining('daily_sales');
  }
}
```

## Best Practices

1. **Data Preparation**
   - Handle missing values appropriately
   - Remove outliers or handle explicitly
   - Ensure stationarity (for ARIMA)
   - Check for sufficient data (>2 seasonal cycles)

2. **Model Selection**
   - Start simple, then add complexity
   - Use cross-validation for selection
   - Consider computational constraints
   - Match model to forecast horizon

3. **Validation**
   - Always use backtesting
   - Reserve holdout set for final validation
   - Monitor forecast accuracy in production
   - Retrain periodically

4. **Ensemble Methods**
   - Combine diverse models
   - Use when accuracy is critical
   - Monitor individual model contributions
   - Consider computational cost

5. **Production**
   - Implement automated retraining
   - Monitor forecast accuracy
   - Version control models
   - Document model configurations

## Common Pitfalls

1. **Overfitting**: Too many parameters for limited data
2. **Underfitting**: Model too simple for complex patterns
3. **Data leakage**: Using future information in training
4. **Ignoring seasonality**: Missing regular patterns
5. **Poor validation**: Not testing on realistic scenarios

## Further Reading

- Box, G. E. P., & Jenkins, G. M. (2015). Time Series Analysis: Forecasting and Control
- Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and Practice
- [IntelGraph Time Series Guide](./GUIDE.md)
- [IntelGraph Anomaly Detection Guide](./ANOMALIES.md)
