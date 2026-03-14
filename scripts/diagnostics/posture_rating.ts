import { CounterSensorNetwork, type CounterSensor } from '../../src/counter_sensors/model.ts';
import { HarnessRunner, multiHopPoisoningScenario, graphemicPerturbationScenario } from '../../src/counter_ai/multi_agent_harness.ts';
import { get_posture_for_community } from '../../src/counter_sensors/posture_fusion.ts';

async function main() {
  const targetCommunity = process.argv[2] || 'example_community_001';

  // 1. Setup mock sensors covering the community
  const s1: CounterSensor = {
    sensor_id: 'internal_monitor_alpha',
    backing_assets: ['asset_x'],
    coverage_region: { node_ids: [targetCommunity, 'other_node'], relation_types: ['supports'] },
    signal_quality: 'MEDIUM',
    sensor_mode: 'PASSIVE_WATCH',
  };

  const s2: CounterSensor = {
    sensor_id: 'adversary_watch_beta',
    backing_assets: ['asset_y'],
    coverage_region: { node_ids: [targetCommunity], relation_types: ['contradicts'] },
    signal_quality: 'HIGH',
    sensor_mode: 'EARLY_WARNING',
  };

  const network = new CounterSensorNetwork([s1, s2]);

  // 2. Setup harness and run scenarios to simulate recent attacks on the stack
  const runner = new HarnessRunner();
  runner.registerScenario(multiHopPoisoningScenario);
  runner.registerScenario(graphemicPerturbationScenario);

  // Simulate running the harness recently
  await runner.runAll({ target_id: targetCommunity });
  const harnessRecords = runner.getExecutionLog();

  // 3. Compute dynamic CI posture
  const communityNodes = [targetCommunity];
  const posture = get_posture_for_community(targetCommunity, network, harnessRecords, communityNodes);

  console.log(`\n=== MACO CI Posture Diagnostic ===`);
  console.log(`Target Community: ${targetCommunity}`);
  console.log(`Composite Rating: [${posture.composite_rating}]`);
  console.log(`Rationale:        ${posture.rationale}`);
  console.log(`\n--- Component Scores ---`);
  console.log(`Sensor Coverage:  ${(posture.sensor_coverage_score * 100).toFixed(1)}%`);
  console.log(`Sensor Trust:     ${(posture.sensor_trust_score * 100).toFixed(1)}%`);
  console.log(`Stack Robustness: ${(posture.stack_robustness_score * 100).toFixed(1)}%\n`);
}

main().catch(err => {
  console.error('Failed to run diagnostic:', err);
  process.exit(1);
});
