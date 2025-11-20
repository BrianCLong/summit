/**
 * TypeScript/Node.js Client Examples for Predictive Threat Suite API
 *
 * Usage:
 *   npm install axios
 *   ts-node typescript_client.ts
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// Type Definitions
// ============================================================================

type SignalType = 'event_count' | 'latency_p95' | 'error_rate' | 'threat_score';
type ForecastHorizon = '1h' | '6h' | '24h' | '7d';
type ModelType = 'arima' | 'exponential_smoothing';
type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
type InterventionType =
  | 'deploy_patch'
  | 'rate_limit'
  | 'scale_up'
  | 'circuit_breaker'
  | 'traffic_shift'
  | 'rollback'
  | 'do_nothing';

interface ForecastRequest {
  signal_type: SignalType;
  entity_id: string;
  historical_data: number[];
  horizon?: ForecastHorizon;
  confidence_level?: number;
  model_type?: ModelType;
}

interface ForecastPoint {
  timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

interface ModelMetrics {
  mape: number;
  rmse: number;
  mae: number;
  r_squared: number;
}

interface ModelInfo {
  type: ModelType;
  parameters: Record<string, any>;
  accuracy_metrics: ModelMetrics;
}

interface ForecastResponse {
  signal_type: SignalType;
  entity_id: string;
  forecast_horizon: ForecastHorizon;
  generated_at: string;
  forecasts: ForecastPoint[];
  model_info: ModelInfo;
}

interface CurrentState {
  threat_level: ThreatLevel;
  error_rate: number;
  latency_p95: number;
  request_rate?: number;
  resource_utilization?: number;
}

interface Intervention {
  type: InterventionType;
  timing: string;
  parameters: Record<string, any>;
}

interface SimulationRequest {
  entity_id: string;
  current_state: CurrentState;
  interventions: Intervention[];
  timeframe?: string;
}

interface OutcomeMetrics {
  threat_escalation_probability: number;
  expected_error_rate: number;
  expected_latency_p95: number;
  expected_availability: number;
  risk_reduction: number;
}

interface InterventionOutcome {
  intervention_id: string;
  intervention_type: InterventionType;
  probability: number;
  impact: OutcomeMetrics;
  confidence: number;
  cost_estimate: number;
  time_to_effect: number;
}

interface Recommendation {
  action: InterventionType;
  priority: string;
  reasoning: string;
  expected_benefit: number;
}

interface SimulationResponse {
  scenario_id: string;
  entity_id: string;
  generated_at: string;
  baseline_outcome: OutcomeMetrics;
  intervention_outcomes: InterventionOutcome[];
  recommendation: Recommendation;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  services: Record<string, boolean>;
}

// ============================================================================
// Client Class
// ============================================================================

/**
 * TypeScript client for the Predictive Threat Suite API.
 *
 * @example
 * ```typescript
 * const client = new PredictiveSuiteClient('http://localhost:8091');
 *
 * // Generate forecast
 * const forecast = await client.generateForecast({
 *   signal_type: 'event_count',
 *   entity_id: 'auth_service',
 *   historical_data: [100, 105, 98, 110, 115],
 *   horizon: '24h'
 * });
 *
 * // Run simulation
 * const simulation = await client.runSimulation({
 *   entity_id: 'auth_service',
 *   current_state: {
 *     threat_level: 'high',
 *     error_rate: 0.05,
 *     latency_p95: 450
 *   },
 *   interventions: [
 *     { type: 'deploy_patch', timing: 'immediate', parameters: {} }
 *   ]
 * });
 * ```
 */
export class PredictiveSuiteClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:8091', timeout: number = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate a time series forecast.
   */
  async generateForecast(request: ForecastRequest): Promise<ForecastResponse> {
    try {
      const response = await this.client.post<ForecastResponse>('/api/forecast', request);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Run a counterfactual simulation.
   */
  async runSimulation(request: SimulationRequest): Promise<SimulationResponse> {
    try {
      const response = await this.client.post<SimulationResponse>('/api/simulate', request);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Check service health.
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  /**
   * Get Prometheus metrics.
   */
  async getMetrics(): Promise<string> {
    const response = await this.client.get<string>('/metrics');
    return response.data;
  }

  private handleError(error: AxiosError): void {
    if (error.response) {
      console.error(`API Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('No response received from API:', error.message);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

// ============================================================================
// Example Functions
// ============================================================================

/**
 * Example 1: Basic forecast with TypeScript
 */
async function exampleBasicForecast() {
  const client = new PredictiveSuiteClient();

  const historicalData = [
    100, 105, 98, 110, 115, 108, 120, 125, 118, 130,
    135, 128, 140, 145, 138, 150, 155, 148, 160, 165,
    158, 170, 175, 168, 180, 185, 178, 190, 195, 188,
  ];

  const forecast = await client.generateForecast({
    signal_type: 'event_count',
    entity_id: 'auth_service',
    historical_data: historicalData,
    horizon: '24h',
    confidence_level: 0.95,
    model_type: 'arima',
  });

  console.log('📊 Forecast Generated:');
  console.log(`  Entity: ${forecast.entity_id}`);
  console.log(`  Signal: ${forecast.signal_type}`);
  console.log(`  Horizon: ${forecast.forecast_horizon}`);
  console.log(`  Model: ${forecast.model_info.type}`);
  console.log(`  MAPE: ${forecast.model_info.accuracy_metrics.mape.toFixed(2)}%`);
  console.log(`\n  First 5 predictions:`);

  forecast.forecasts.slice(0, 5).forEach((fp, i) => {
    console.log(
      `    ${i + 1}h: ${fp.predicted_value.toFixed(1)} ` +
      `[${fp.lower_bound.toFixed(1)}, ${fp.upper_bound.toFixed(1)}]`
    );
  });

  return forecast;
}

/**
 * Example 2: High-threat simulation with TypeScript
 */
async function exampleHighThreatSimulation() {
  const client = new PredictiveSuiteClient();

  const simulation = await client.runSimulation({
    entity_id: 'payment_service',
    current_state: {
      threat_level: 'high',
      error_rate: 0.08,
      latency_p95: 650,
      request_rate: 200,
      resource_utilization: 0.85,
    },
    interventions: [
      {
        type: 'deploy_patch',
        timing: 'immediate',
        parameters: { rollout_percentage: 50 },
      },
      {
        type: 'rate_limit',
        timing: 'immediate',
        parameters: { limit: 1000 },
      },
      {
        type: 'circuit_breaker',
        timing: 'immediate',
        parameters: { error_threshold: 0.05 },
      },
      {
        type: 'rollback',
        timing: 'immediate',
        parameters: {},
      },
    ],
    timeframe: '24h',
  });

  console.log('🚨 Simulation Results:');
  console.log(`  Entity: ${simulation.entity_id}`);
  console.log(`  Scenario ID: ${simulation.scenario_id}`);

  const baseline = simulation.baseline_outcome;
  console.log(`\n  Baseline (no intervention):`);
  console.log(`    Threat escalation: ${(baseline.threat_escalation_probability * 100).toFixed(1)}%`);
  console.log(`    Expected error rate: ${(baseline.expected_error_rate * 100).toFixed(2)}%`);
  console.log(`    Expected latency: ${baseline.expected_latency_p95.toFixed(0)}ms`);

  console.log(`\n  Intervention Analysis:`);
  simulation.intervention_outcomes.forEach((outcome) => {
    const riskReduction = outcome.impact.risk_reduction * 100;
    const confidence = outcome.confidence * 100;
    console.log(`\n    ${outcome.intervention_type}:`);
    console.log(`      Risk reduction: ${riskReduction.toFixed(1)}%`);
    console.log(`      Confidence: ${confidence.toFixed(1)}%`);
    console.log(`      Time to effect: ${outcome.time_to_effect} minutes`);
    console.log(
      `      Post-intervention risk: ` +
      `${(outcome.impact.threat_escalation_probability * 100).toFixed(1)}%`
    );
  });

  const rec = simulation.recommendation;
  console.log(`\n  🎯 Recommendation:`);
  console.log(`    Action: ${rec.action}`);
  console.log(`    Priority: ${rec.priority.toUpperCase()}`);
  console.log(`    Reasoning: ${rec.reasoning}`);

  return simulation;
}

/**
 * Example 3: Batch forecasting with async/await
 */
async function exampleBatchForecasting() {
  const client = new PredictiveSuiteClient();
  const entities = ['auth_service', 'payment_service', 'user_service', 'api_gateway'];

  console.log('🔄 Batch forecasting for multiple entities...\n');

  const promises = entities.map((entityId) => {
    // Generate synthetic data for each entity
    const seed = entityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const historicalData = Array.from({ length: 50 }, (_, i) => 100 + i + (seed % 20));

    return client
      .generateForecast({
        signal_type: 'event_count',
        entity_id: entityId,
        historical_data: historicalData,
        horizon: '24h',
      })
      .then((forecast) => {
        const mape = forecast.model_info.accuracy_metrics.mape;
        const nextValue = forecast.forecasts[0].predicted_value;
        console.log(
          `✅ ${entityId.padEnd(20)} | MAPE: ${mape.toFixed(1).padStart(5)}% | ` +
          `Next hour: ${nextValue.toFixed(1)}`
        );
        return { entityId, forecast };
      })
      .catch((error) => {
        console.log(`❌ ${entityId.padEnd(20)} | Error: ${error.message}`);
        return { entityId, error };
      });
  });

  const results = await Promise.all(promises);
  const successful = results.filter((r) => 'forecast' in r).length;

  console.log(`\n📊 Successfully forecasted ${successful}/${entities.length} entities`);

  return results;
}

/**
 * Example 4: Integration with Express.js (API endpoint wrapper)
 */
function exampleExpressIntegration() {
  // This would be in your Express.js app
  const code = `
import express from 'express';
import { PredictiveSuiteClient } from './typescript_client';

const app = express();
const predictiveClient = new PredictiveSuiteClient();

app.use(express.json());

// Endpoint to get forecasts
app.post('/api/internal/forecast/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { historical_data, horizon } = req.body;

    const forecast = await predictiveClient.generateForecast({
      signal_type: 'event_count',
      entity_id: entityId,
      historical_data,
      horizon: horizon || '24h',
    });

    res.json(forecast);
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// Endpoint to run simulations
app.post('/api/internal/simulate/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { current_state, interventions } = req.body;

    const simulation = await predictiveClient.runSimulation({
      entity_id: entityId,
      current_state,
      interventions,
    });

    res.json(simulation);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Failed to run simulation' });
  }
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
`;

  console.log('📝 Express.js Integration Example:\n');
  console.log(code);
}

/**
 * Example 5: Error handling with TypeScript
 */
async function exampleErrorHandling() {
  const client = new PredictiveSuiteClient();

  console.log('🛠️  Testing error handling...\n');

  // Test service health
  try {
    const health = await client.getHealth();
    console.log(`✅ Service is healthy: ${health.status}`);
  } catch (error) {
    console.log(`❌ Service health check failed`);
  }

  // Test with invalid data
  try {
    await client.generateForecast({
      signal_type: 'event_count',
      entity_id: 'test',
      historical_data: [1], // Too few points
      horizon: '24h',
    });
  } catch (error) {
    console.log(`✅ Caught expected error for insufficient data`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('=' . repeat(80));
  console.log('  Predictive Threat Suite - TypeScript Client Examples');
  console.log('='.repeat(80));
  console.log();

  const client = new PredictiveSuiteClient();

  // Check service health
  try {
    const health = await client.getHealth();
    console.log(`✅ Service is healthy: ${health.status}\n`);
  } catch (error) {
    console.log(`❌ Cannot connect to service`);
    console.log('   Make sure the service is running on http://localhost:8091\n');
    process.exit(1);
  }

  // Run examples
  console.log('\n' + '='.repeat(80));
  console.log('Example 1: Basic Forecast');
  console.log('='.repeat(80));
  await exampleBasicForecast();

  console.log('\n' + '='.repeat(80));
  console.log('Example 2: High-Threat Simulation');
  console.log('='.repeat(80));
  await exampleHighThreatSimulation();

  console.log('\n' + '='.repeat(80));
  console.log('Example 3: Batch Processing');
  console.log('='.repeat(80));
  await exampleBatchForecasting();

  console.log('\n' + '='.repeat(80));
  console.log('Example 4: Express.js Integration');
  console.log('='.repeat(80));
  exampleExpressIntegration();

  console.log('\n' + '='.repeat(80));
  console.log('Example 5: Error Handling');
  console.log('='.repeat(80));
  await exampleErrorHandling();

  console.log('\n✅ All examples completed!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default PredictiveSuiteClient;
