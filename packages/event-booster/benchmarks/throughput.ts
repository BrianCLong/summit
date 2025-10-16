import {
  createDefaultEventBooster,
  generateBurstEvents,
  runPatternBenchmark,
} from '../src/index.js';

const booster = createDefaultEventBooster();
const baseline = generateBurstEvents({
  bursts: 5,
  burstSize: 20,
  intervalMs: 250,
});

const metrics = runPatternBenchmark(booster, 'amplify-signal', baseline, {
  iterations: 20,
  warmupIterations: 5,
});

console.table(metrics);
