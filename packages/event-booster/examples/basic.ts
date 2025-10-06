import {
  createDefaultEventBooster,
  generateUniformEvents,
  runPatternBenchmark,
} from '../src/index.js';

const booster = createDefaultEventBooster();
const baseline = generateUniformEvents(5, { signal: 3 });
const result = booster.boost(baseline, 'amplify-signal');

console.log(`Boosted ${result.outputCount} events`);
console.log(result.events.slice(0, 2));

const metrics = runPatternBenchmark(booster, 'amplify-signal', baseline, {
  iterations: 5,
});

console.table(metrics);
