import { test } from 'node:test';
import * as assert from 'node:assert';
import { UncertaintyPolicyEngine, TaskContext } from '../../../src/agent-graph/uncertainty/UncertaintyPolicyEngine';
import { UncertaintyRecord, UncertaintyRegistry } from '../../../src/agent-graph/uncertainty/UncertaintyRecord';

test('UncertaintyPolicyEngine evaluates high epistemic score and high risk', () => {
  const engine = new UncertaintyPolicyEngine();
  const record: UncertaintyRecord = {
    id: 'u1',
    detected_at: new Date().toISOString(),
    source: 'disagreement_sensor',
    type: 'model_disagreement',
    current_state: 'Detected',
    target_id: 'task-1',
    target_type: 'Task',
    quantitative: {
      epistemic_score: 0.8,
      aleatoric_score: 0.2,
      disagreement_index: 0.5,
      evidence_coverage_ratio: 0.8
    },
    qualitative: {
      category: 'strategic',
      triggers: [],
      remediation_actions: [],
      human_overrides: []
    }
  };

  const context: TaskContext = { task_id: 'task-1', task_risk: 'high' };
  const actions = engine.evaluate(record, context);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].action, 'increase_debate_depth');
});

test('UncertaintyPolicyEngine evaluates high epistemic score and low evidence', () => {
  const engine = new UncertaintyPolicyEngine();
  const record: UncertaintyRecord = {
    id: 'u2',
    detected_at: new Date().toISOString(),
    source: 'evidence_sensor',
    type: 'missing_evidence',
    current_state: 'Detected',
    target_id: 'claim-1',
    target_type: 'Claim',
    quantitative: {
      epistemic_score: 0.65,
      aleatoric_score: 0.2,
      disagreement_index: 0.1,
      evidence_coverage_ratio: 0.2
    },
    qualitative: {
      category: 'data',
      triggers: [],
      remediation_actions: [],
      human_overrides: []
    }
  };

  const context: TaskContext = { task_id: 'task-1', task_risk: 'medium' };
  const actions = engine.evaluate(record, context);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].action, 'escalate_to_human');
});

test('UncertaintyPolicyEngine evaluates high aleatoric score and low epistemic score', () => {
  const engine = new UncertaintyPolicyEngine();
  const record: UncertaintyRecord = {
    id: 'u3',
    detected_at: new Date().toISOString(),
    source: 'parametric_sensor',
    type: 'parametric_knowledge',
    current_state: 'Detected',
    target_id: 'task-2',
    target_type: 'Task',
    quantitative: {
      epistemic_score: 0.3,
      aleatoric_score: 0.8,
      disagreement_index: 0.1,
      evidence_coverage_ratio: 0.9
    },
    qualitative: {
      category: 'model',
      triggers: [],
      remediation_actions: [],
      human_overrides: []
    }
  };

  const context: TaskContext = { task_id: 'task-2', task_risk: 'low' };
  const actions = engine.evaluate(record, context);

  assert.strictEqual(actions.length, 1);
  assert.strictEqual(actions[0].action, 'enforce_deterministic_decoding');
});

test('UncertaintyRegistry stores and retrieves records correctly', () => {
  const registry = new UncertaintyRegistry();
  const record: UncertaintyRecord = {
    id: 'u4',
    detected_at: new Date().toISOString(),
    source: 'coordination_sensor',
    type: 'coordination_conflict',
    current_state: 'Detected',
    target_id: 'task-3',
    target_type: 'Task',
    quantitative: {
      epistemic_score: 0.1,
      aleatoric_score: 0.1,
      disagreement_index: 0.9,
      evidence_coverage_ratio: 0.9
    },
    qualitative: {
      category: 'coordination',
      triggers: [],
      remediation_actions: [],
      human_overrides: []
    }
  };

  registry.addRecord(record);

  const fetched = registry.getRecord('u4');
  assert.deepStrictEqual(fetched, record);

  registry.updateRecordState('u4', 'Characterized');
  assert.strictEqual(registry.getRecord('u4')?.current_state, 'Characterized');

  const forTarget = registry.getRecordsForTarget('task-3');
  assert.strictEqual(forTarget.length, 1);
  assert.strictEqual(forTarget[0].id, 'u4');
});
