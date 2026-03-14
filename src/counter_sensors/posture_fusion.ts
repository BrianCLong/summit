import { CounterSensorNetwork } from './model.ts';
import { type ScenarioExecutionRecord } from '../counter_ai/multi_agent_harness.ts';

export type PostureRating = 'GREEN' | 'AMBER' | 'RED';

export interface PostureResult {
  sensor_coverage_score: number;
  sensor_trust_score: number;
  stack_robustness_score: number;
  composite_rating: PostureRating;
  rationale: string;
}

/**
 * Fuse the Counter-Sensor Network and Harness execution records
 * to produce a dynamic CI posture rating for a given community ID.
 */
export function get_posture_for_community(
  community_id: string,
  network: CounterSensorNetwork,
  harness_records: ScenarioExecutionRecord[],
  community_nodes: string[] // The known nodes associated with the community
): PostureResult {

  // 1. Compute Coverage Score [0, 1]
  let covered_nodes = 0;
  let has_redundant_coverage = false;
  let total_sensors_covering = 0;

  const node_coverage_count: Record<string, number> = {};

  network.sensors.forEach(s => {
    let covering = false;
    s.coverage_region.node_ids.forEach(n => {
      if (community_nodes.includes(n)) {
        node_coverage_count[n] = (node_coverage_count[n] || 0) + 1;
        covering = true;
      }
    });
    if (covering) total_sensors_covering++;
  });

  covered_nodes = Object.keys(node_coverage_count).length;
  const sensor_coverage_score = community_nodes.length === 0 ? 0 : covered_nodes / community_nodes.length;

  has_redundant_coverage = Object.values(node_coverage_count).some(count => count > 1);

  // 2. Compute Trust Score [0, 1]
  let sensor_trust_score = 1.0;

  network.sensors.forEach(s => {
    // Check if this sensor covers our community
    if (s.coverage_region.node_ids.some(n => community_nodes.includes(n))) {
      if (s.signal_quality === 'DECEPTIVE') {
        sensor_trust_score -= 0.4;
      } else if (s.signal_quality === 'LOW') {
        sensor_trust_score -= 0.1;
      }
    }
  });

  sensor_trust_score = Math.max(0, sensor_trust_score);

  // 3. Compute Robustness Score [0, 1] based on harness risk records
  let stack_robustness_score = 1.0;

  // A simplistic mapping: if risks were triggered that are high/critical severity, lower robustness.
  harness_records.forEach(record => {
    // If the record triggered risks
    if (record.triggered_risk_ids && record.triggered_risk_ids.length > 0) {
      if (record.severity === 'CRITICAL') {
        stack_robustness_score -= 0.5;
      } else if (record.severity === 'HIGH') {
        stack_robustness_score -= 0.3;
      } else if (record.severity === 'MEDIUM') {
        stack_robustness_score -= 0.1;
      }
    }
  });

  stack_robustness_score = Math.max(0, stack_robustness_score);

  // 4. Compute Composite Rating
  let composite_rating: PostureRating = 'GREEN';
  let rationale = `Community ${community_id} posture is GREEN.`;

  if (stack_robustness_score <= 0.5) {
    composite_rating = 'RED';
    rationale = `Community ${community_id} posture is RED: Severe vulnerabilities detected in AI stack.`;
  } else if (sensor_trust_score < 0.5 || sensor_coverage_score < 0.5) {
    composite_rating = 'AMBER';
    rationale = `Community ${community_id} posture is AMBER: Coverage is weak or highly deceptive.`;
  } else if (!has_redundant_coverage) {
    composite_rating = 'AMBER';
    rationale = `Community ${community_id} posture is AMBER: Fragile coverage (lack of redundancy).`;
  }

  // If robustness is okay, but it's RED for some other reason, override (e.g. 0 coverage)
  if (sensor_coverage_score === 0) {
    composite_rating = 'RED';
    rationale = `Community ${community_id} posture is RED: Complete blind spot.`;
  }

  return {
    sensor_coverage_score,
    sensor_trust_score,
    stack_robustness_score,
    composite_rating,
    rationale
  };
}
