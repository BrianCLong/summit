import { DriftGovernanceService } from '../stewardship/drift/service.js';
import { ForecastingService } from '../stewardship/forecast/service.js';
import { RoadmapEngine } from '../stewardship/roadmap/engine.js';

async function main() {
  console.log('--- Platform Stewardship Review ---\n');

  // 1. Drift Governance
  console.log('1. Drift Signals:');
  const driftService = new DriftGovernanceService();
  const driftSignals = await driftService.collectDriftSignals();
  if (driftSignals.length === 0) {
    console.log('   No significant drift detected.');
  } else {
    driftSignals.forEach((s) => {
      console.log(`   [${s.severity}] ${s.type} Drift (${s.metric}): ${s.delta > 0 ? '+' : ''}${s.delta}`);
    });
  }
  console.log('');

  // 2. Forecasts
  console.log('2. Forecasts:');
  const forecastService = new ForecastingService();
  const forecasts = await forecastService.generateForecasts();
  forecasts.forEach((f) => {
    console.log(`   ${f.type} (${f.horizon} days): ${f.predictedValue}`);
    console.log(`      CI: [${f.confidenceInterval.lower}, ${f.confidenceInterval.upper}]`);
    console.log(`      Assumptions: ${f.assumptions.join(', ')}`);
  });
  console.log('');

  // 3. Roadmap Signals
  console.log('3. Roadmap Pressure Signals:');
  const roadmapEngine = new RoadmapEngine();
  const roadmapSignals = roadmapEngine.generateSignals(driftSignals, forecasts);

  if (roadmapSignals.length === 0) {
    console.log('   No urgent roadmap pressure signals.');
  } else {
    roadmapSignals.forEach((s) => {
      console.log(`   [Score: ${s.score}] ${s.category}`);
      console.log(`      Reason: ${s.reason}`);
      console.log(`      Suggested Investment: ${s.suggestedInvestmentArea}`);
    });
  }

  console.log('\n--- End of Review ---');
}

main().catch((err: any) => {
  console.error(err);
  process.exit(1);
});
