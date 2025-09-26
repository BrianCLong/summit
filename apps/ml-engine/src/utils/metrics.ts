import client from 'prom-client';
import { config } from '../config';

const register = new client.Registry();

if (config.monitoring.metricsEnabled) {
  client.collectDefaultMetrics({ register, prefix: 'ml_engine_' });
}

const federatedTrainingDuration = new client.Histogram({
  name: 'ml_engine_federated_training_duration_seconds',
  help: 'Duration of federated learning jobs in seconds',
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120, 300],
  registers: [register],
});

const federatedTrainingRounds = new client.Counter({
  name: 'ml_engine_federated_training_rounds_total',
  help: 'Total number of federated learning rounds executed',
  registers: [register],
});

const federatedTrainingExamples = new client.Counter({
  name: 'ml_engine_federated_training_examples_total',
  help: 'Total number of client examples processed by federated learning',
  registers: [register],
});

const federatedTrainingFailures = new client.Counter({
  name: 'ml_engine_federated_training_failures_total',
  help: 'Count of failed federated learning jobs',
  registers: [register],
});

const federatedTrainingInFlight = new client.Gauge({
  name: 'ml_engine_federated_training_in_flight',
  help: 'Number of federated learning jobs currently running',
  registers: [register],
});

export const metrics = {
  register,
  federatedTrainingDuration,
  federatedTrainingRounds,
  federatedTrainingExamples,
  federatedTrainingFailures,
  federatedTrainingInFlight,
};

export function recordFederatedTrainingSuccess(params: {
  rounds: number;
  exampleCount: number;
  durationMs: number;
}) {
  const seconds = params.durationMs / 1000;
  metrics.federatedTrainingDuration.observe(seconds);
  metrics.federatedTrainingRounds.inc(params.rounds);
  metrics.federatedTrainingExamples.inc(params.exampleCount);
}

export function recordFederatedTrainingFailure() {
  metrics.federatedTrainingFailures.inc();
}

export default metrics;
