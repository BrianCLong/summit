import { test } from 'node:test';
import assert from 'node:assert';
import AjvModule from 'ajv/dist/2020.js';
const Ajv = (AjvModule as any).default || AjvModule;

import { executionIntentSchema } from '../execution/index.js';
import { executionDecisionSchema } from '../execution/index.js';
import { executionPlanSchema } from '../execution/index.js';

test('ExecutionIntent schema validates correctly', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(executionIntentSchema.default || executionIntentSchema);

    const validIntent = {
        intent_id: "intent-001",
        agent_ref: "agent://summit/research-agent/v1",
        requester_ref: "svc://finance-risk-api",
        objective: "analyze top 10 vendor risks",
        tool_refs: ["web-search", "vector-db"],
        data_class: "internal",
        budget_ref: "budget://team-risk/q2",
        constraints: {
            max_cost_usd: 3.50,
            max_latency_ms: 45000,
            deterministic_mode: true
        }
    };

    const valid = validate(validIntent);
    assert.ok(valid, `Validation should succeed, but failed with: ${JSON.stringify(validate.errors)}`);

    const invalidIntent = {
        intent_id: "intent-001",
        agent_ref: "agent://summit/research-agent/v1",
        objective: "analyze top 10 vendor risks",
        constraints: {
            max_cost_usd: 3.50,
            max_latency_ms: 45000,
            deterministic_mode: true
        }
        // Missing requester_ref
    };

    const invalid = validate(invalidIntent);
    assert.strictEqual(invalid, false, 'Validation should fail due to missing required field');
});

test('ExecutionDecision schema validates correctly', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(executionDecisionSchema.default || executionDecisionSchema);

    const validDecision = {
        decision_id: "dec-001",
        intent_id: "intent-001",
        admit: true,
        reasons: [],
        route_ref: "route://openai/gpt-4.1/search-safe",
        policy_bindings: ["no-pii-egress", "tool-allowlist-default"],
        budget_lease_id: "lease-007",
        evidence_id: "EVID-0001",
        signature: "sig-xyz"
    };

    const valid = validate(validDecision);
    assert.ok(valid, `Validation should succeed, but failed with: ${JSON.stringify(validate.errors)}`);
});

test('ExecutionPlan schema validates correctly', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(executionPlanSchema.default || executionPlanSchema);

    const validPlan = {
        plan_id: "plan-001",
        decision_id: "dec-001",
        runtime_profile: "runner://default-safe",
        tool_session_refs: ["toolsession-search-1"],
        memory_scope: "memscope://team-risk/internal",
        retry_policy: "retry://bounded-safe",
        observability_profile: "obs://full-audit"
    };

    const valid = validate(validPlan);
    assert.ok(valid, `Validation should succeed, but failed with: ${JSON.stringify(validate.errors)}`);
});
