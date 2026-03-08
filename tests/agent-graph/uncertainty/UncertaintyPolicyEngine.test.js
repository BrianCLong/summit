"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const UncertaintyPolicyEngine_1 = require("../../../src/agent-graph/uncertainty/UncertaintyPolicyEngine");
const UncertaintyRecord_1 = require("../../../src/agent-graph/uncertainty/UncertaintyRecord");
(0, node_test_1.test)('UncertaintyPolicyEngine evaluates high epistemic score and high risk', () => {
    const engine = new UncertaintyPolicyEngine_1.UncertaintyPolicyEngine();
    const record = {
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
    const context = { task_id: 'task-1', task_risk: 'high' };
    const actions = engine.evaluate(record, context);
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].action, 'increase_debate_depth');
});
(0, node_test_1.test)('UncertaintyPolicyEngine evaluates high epistemic score and low evidence', () => {
    const engine = new UncertaintyPolicyEngine_1.UncertaintyPolicyEngine();
    const record = {
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
    const context = { task_id: 'task-1', task_risk: 'medium' };
    const actions = engine.evaluate(record, context);
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].action, 'escalate_to_human');
});
(0, node_test_1.test)('UncertaintyPolicyEngine evaluates high aleatoric score and low epistemic score', () => {
    const engine = new UncertaintyPolicyEngine_1.UncertaintyPolicyEngine();
    const record = {
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
    const context = { task_id: 'task-2', task_risk: 'low' };
    const actions = engine.evaluate(record, context);
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].action, 'enforce_deterministic_decoding');
});
(0, node_test_1.test)('UncertaintyRegistry stores and retrieves records correctly', () => {
    const registry = new UncertaintyRecord_1.UncertaintyRegistry();
    const record = {
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
