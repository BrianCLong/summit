#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const environment = process.env.TEST_ENVIRONMENT ?? 'dev';
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDataPath = join(__dirname, 'data', 'synthetic-test-data.json');
const dataPath = process.env.SYNTHETIC_DATA_PATH ?? defaultDataPath;

function fail(message) {
  console.error(`Node service synthetic test failed: ${message}`);
  process.exit(1);
}

function loadData(path) {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    fail(`Unable to load synthetic data from ${path}: ${error.message}`);
  }
}

const data = loadData(dataPath);
const nodeEvents = Array.isArray(data.nodeService) ? data.nodeService : [];
const envSample = nodeEvents.find((entry) => entry.environment === environment);

if (!envSample) {
  fail(`No synthetic sample found for environment '${environment}'.`);
}

if (envSample.schemaVersion !== 1) {
  fail(`Unexpected schema version ${envSample.schemaVersion} for environment '${environment}'.`);
}

const latencyBudgetByEnv = {
  dev: 150,
  staging: 110,
  prod: 90,
};

const latencyBudget = latencyBudgetByEnv[environment];
if (typeof latencyBudget !== 'number') {
  fail(`No latency budget defined for environment '${environment}'.`);
}

if (envSample.requestLatencyMs > latencyBudget) {
  fail(
    `Latency ${envSample.requestLatencyMs}ms exceeds budget ${latencyBudget}ms for environment '${environment}'.`
  );
}

if (environment === 'prod' && envSample.featureFlags.length !== 0) {
  fail('Production synthetic sample should not contain experimental feature flags.');
}

if (['dev', 'staging'].includes(environment)) {
  const requiredFlag = 'synthetic-metrics';
  if (!envSample.featureFlags.includes(requiredFlag)) {
    fail(`Expected feature flag '${requiredFlag}' for environment '${environment}'.`);
  }
}

console.log(
  `Node service synthetic validation succeeded for ${environment}. Latency=${envSample.requestLatencyMs}ms, flags=${envSample.featureFlags.join(',') || 'none'}.`
);
