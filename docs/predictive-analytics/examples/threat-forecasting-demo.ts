/**
 * Threat Intelligence Forecasting Demo
 *
 * This example demonstrates how to use the predictive analytics platform
 * to forecast cyber threat activity and detect anomalies.
 */

import {
  ARIMAForecaster,
  ProphetForecaster,
  EnsembleForecaster,
  AnomalyForecaster,
  MonteCarloSimulator,
} from '@summit/forecasting';

import { RandomForestClassifier, GradientBoostingClassifier } from '@summit/predictive-models';
import { LogisticRiskScorer } from '@summit/risk-scoring';

// Generate synthetic threat data
function generateThreatData(days: number = 365) {
  const data = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    // Base trend
    const trend = 100 + i * 0.3;

    // Weekly seasonality (more attacks on weekdays)
    const dayOfWeek = date.getDay();
    const weekdayEffect = [0.8, 1.2, 1.3, 1.2, 1.1, 0.7, 0.6][dayOfWeek];

    // Monthly seasonality
    const monthEffect = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 10;

    // Random spikes (simulating attack campaigns)
    const spike = Math.random() < 0.05 ? Math.random() * 50 : 0;

    // Noise
    const noise = (Math.random() - 0.5) * 15;

    const value = Math.max(0, trend * weekdayEffect + monthEffect + spike + noise);

    data.push({
      timestamp: date,
      value: Math.round(value),
    });
  }

  return data;
}

async function main() {
  console.log('=== Threat Intelligence Forecasting Demo ===\n');

  // Generate historical threat data
  const threatData = generateThreatData(365);
  console.log(`Generated ${threatData.length} days of historical threat data`);

  // Split into training and test sets
  const trainSize = Math.floor(threatData.length * 0.8);
  const trainData = threatData.slice(0, trainSize);
  const testData = threatData.slice(trainSize);

  // ============================================
  // 1. ARIMA Forecasting
  // ============================================
  console.log('\n--- ARIMA Forecasting ---');

  const arimaForecaster = new ARIMAForecaster({ p: 2, d: 1, q: 1 });
  arimaForecaster.fit(trainData);

  const arimaForecast = arimaForecaster.forecast(30, 0.95);
  console.log('Next 7 days forecast:');
  arimaForecast.slice(0, 7).forEach(f => {
    console.log(`  ${f.timestamp.toDateString()}: ${f.forecast.toFixed(0)} ` +
                `[${f.lowerBound.toFixed(0)} - ${f.upperBound.toFixed(0)}]`);
  });

  // Evaluate ARIMA
  const arimaPerformance = arimaForecaster.evaluate(testData);
  console.log(`ARIMA Performance: MAE=${arimaPerformance.mae.toFixed(2)}, ` +
              `RMSE=${arimaPerformance.rmse.toFixed(2)}`);

  // ============================================
  // 2. Prophet-style Forecasting
  // ============================================
  console.log('\n--- Prophet-style Forecasting ---');

  const prophetForecaster = new ProphetForecaster({
    horizon: 30,
    confidenceLevel: 0.95,
    seasonality: {
      period: 7,
      mode: 'multiplicative',
    },
  });

  prophetForecaster.fit(trainData);

  const prophetForecast = prophetForecaster.forecast();
  console.log('Prophet trend decomposition:');
  const decomposition = prophetForecaster.decompose();
  console.log(`  Trend range: ${Math.min(...decomposition.trend).toFixed(0)} - ` +
              `${Math.max(...decomposition.trend).toFixed(0)}`);
  console.log(`  Seasonal amplitude: ${(Math.max(...decomposition.seasonal) -
              Math.min(...decomposition.seasonal)).toFixed(2)}`);

  // ============================================
  // 3. Ensemble Forecasting
  // ============================================
  console.log('\n--- Ensemble Forecasting ---');

  const ensembleForecaster = new EnsembleForecaster({
    models: [
      { type: 'arima', params: { p: 1, d: 1, q: 1 } },
      { type: 'exponential', params: { alpha: 0.3, seasonalPeriods: 7 } },
    ],
    weights: [0.6, 0.4],
    method: 'weighted',
  });

  ensembleForecaster.fit(trainData);
  const ensembleForecast = ensembleForecaster.forecast(14, 0.95);

  console.log('14-day ensemble forecast summary:');
  const avgForecast = ensembleForecast.reduce((sum, f) => sum + f.forecast, 0) / ensembleForecast.length;
  console.log(`  Average: ${avgForecast.toFixed(0)} threats/day`);
  console.log(`  Min: ${Math.min(...ensembleForecast.map(f => f.forecast)).toFixed(0)}`);
  console.log(`  Max: ${Math.max(...ensembleForecast.map(f => f.forecast)).toFixed(0)}`);

  // ============================================
  // 4. Anomaly Detection
  // ============================================
  console.log('\n--- Anomaly Detection ---');

  const anomalyForecaster = new AnomalyForecaster(2.5, 30);
  anomalyForecaster.fit(trainData);

  const outbreaks = anomalyForecaster.detectOutbreaks();
  console.log(`Detected ${outbreaks.length} potential attack outbreaks`);

  if (outbreaks.length > 0) {
    console.log('Top 3 outbreaks:');
    outbreaks.slice(0, 3).forEach(outbreak => {
      console.log(`  ${outbreak.timestamp.toDateString()}: ` +
                  `magnitude=${outbreak.magnitude.toFixed(0)}, ` +
                  `confidence=${(outbreak.confidence * 100).toFixed(0)}%`);
    });
  }

  const trendReversals = anomalyForecaster.detectTrendReversals();
  console.log(`Detected ${trendReversals.length} trend reversals`);

  // Forecast future anomalies
  const futureAnomalies = anomalyForecaster.forecastAnomalies(14);
  const highRiskDays = futureAnomalies.filter(a => a.probability > 0.1);
  console.log(`\nHigh-risk days in next 14 days: ${highRiskDays.length}`);

  // ============================================
  // 5. Monte Carlo Simulation
  // ============================================
  console.log('\n--- Monte Carlo Simulation ---');

  const simulator = new MonteCarloSimulator(1000);
  const simulationResult = simulator.simulate(ensembleForecast, 0.15, 0.01);

  console.log('Simulation results (14-day forecast):');
  const p5 = simulationResult.percentiles.get(5)!;
  const p50 = simulationResult.percentiles.get(50)!;
  const p95 = simulationResult.percentiles.get(95)!;

  console.log('  5th percentile (optimistic): ' +
              `${p5.reduce((s, f) => s + f.forecast, 0).toFixed(0)} total threats`);
  console.log('  50th percentile (median): ' +
              `${p50.reduce((s, f) => s + f.forecast, 0).toFixed(0)} total threats`);
  console.log('  95th percentile (pessimistic): ' +
              `${p95.reduce((s, f) => s + f.forecast, 0).toFixed(0)} total threats`);

  // ============================================
  // 6. Threat Classification
  // ============================================
  console.log('\n--- Threat Classification ---');

  // Generate synthetic threat features
  const threatFeatures = trainData.map(d => [
    d.value / 100,                    // Normalized volume
    d.timestamp.getDay() / 7,         // Day of week
    Math.random(),                    // Simulated severity
    Math.random(),                    // Simulated sophistication
  ]);

  const threatLabels = threatFeatures.map(f =>
    f[0] > 1.2 && f[2] > 0.7 ? 'critical' : f[0] > 0.8 ? 'high' : 'low'
  );

  const classifier = new GradientBoostingClassifier({
    nEstimators: 50,
    learningRate: 0.1,
    maxDepth: 4,
  });

  // Simplified binary classification
  const binaryLabels = threatLabels.map(l => l === 'critical' ? 1 : 0);
  classifier.fit({ features: threatFeatures, labels: binaryLabels });

  console.log('Threat classifier trained');
  const testSample = [[1.5, 0.5, 0.9, 0.8]];
  const prediction = classifier.predict(testSample);
  console.log(`Sample prediction: ${prediction[0].prediction === 1 ? 'CRITICAL' : 'NOT CRITICAL'} ` +
              `(confidence: ${(prediction[0].confidence * 100).toFixed(0)}%)`);

  // ============================================
  // 7. Risk Scoring
  // ============================================
  console.log('\n--- Entity Risk Scoring ---');

  const riskScorer = new LogisticRiskScorer();
  const riskFeatures = threatFeatures.map(f => [f[0], f[2], f[3]]);
  const riskLabels = binaryLabels;

  riskScorer.fit(riskFeatures, riskLabels, ['threat_volume', 'severity', 'sophistication']);

  // Score sample entities
  const entities = [
    { id: 'APT-001', features: [1.8, 0.95, 0.9] },
    { id: 'APT-002', features: [0.5, 0.3, 0.4] },
    { id: 'APT-003', features: [1.2, 0.7, 0.8] },
  ];

  console.log('Entity risk scores:');
  entities.forEach(entity => {
    const score = riskScorer.score(entity.id, entity.features);
    console.log(`  ${entity.id}: Score=${score.score}, Level=${score.riskLevel.toUpperCase()}`);
  });

  console.log('\n=== Demo Complete ===');
}

// Run demo
main().catch(console.error);
