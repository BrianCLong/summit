import test from 'node:test';
import assert from 'node:assert';
import { CogWarPolicyEngine, type CogWarOperation } from '../../../src/cogwar/policy/engine.ts';

test('CogWarPolicyEngine - Rule 1: No AI-generated content may be published without human review flag', async (t) => {
  await t.test('fails if AI generated and no human review', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-1',
      isAiGenerated: true,
      hasHumanReview: false,
      riskLevel: 1,
      approvals: ['alice'],
      attributionChain: ['source-1']
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, false);
    const warning = result.warnings.find(w => w.rule_id === 'CW_RULE_001');
    assert.ok(warning);
    assert.strictEqual(warning?.severity, 'critical');
  });

  await t.test('passes if AI generated and has human review, generates near miss warning', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-2',
      isAiGenerated: true,
      hasHumanReview: true,
      riskLevel: 1,
      approvals: ['alice'],
      attributionChain: ['source-1']
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, true);
    const warning = result.warnings.find(w => w.rule_id === 'CW_RULE_001_NEAR_MISS');
    assert.ok(warning);
    assert.strictEqual(warning?.severity, 'low');
  });
});

test('CogWarPolicyEngine - Rule 2: Operations above risk_level 7 require dual approval', async (t) => {
  await t.test('fails if risk level > 7 and < 2 approvals', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-3',
      isAiGenerated: false,
      hasHumanReview: true,
      riskLevel: 8,
      approvals: ['alice'],
      attributionChain: ['source-1']
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, false);
    const warning = result.warnings.find(w => w.rule_id === 'CW_RULE_002');
    assert.ok(warning);
    assert.strictEqual(warning?.severity, 'high');
  });

  await t.test('passes if risk level > 7 and >= 2 approvals', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-4',
      isAiGenerated: false,
      hasHumanReview: true,
      riskLevel: 8,
      approvals: ['alice', 'bob'],
      attributionChain: ['source-1']
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, true);
    const warning = result.warnings.find(w => w.rule_id.startsWith('CW_RULE_002'));
    assert.strictEqual(warning, undefined);
  });

  await t.test('passes and generates near miss if risk level is exactly 7 and < 2 approvals', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-5',
      isAiGenerated: false,
      hasHumanReview: true,
      riskLevel: 7,
      approvals: ['alice'],
      attributionChain: ['source-1']
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, true);
    const warning = result.warnings.find(w => w.rule_id === 'CW_RULE_002_NEAR_MISS');
    assert.ok(warning);
    assert.strictEqual(warning?.severity, 'medium');
  });
});

test('CogWarPolicyEngine - Rule 3: All outputs must include attribution chain', async (t) => {
  await t.test('fails if attribution chain is empty', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-6',
      isAiGenerated: false,
      hasHumanReview: true,
      riskLevel: 1,
      approvals: ['alice'],
      attributionChain: []
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, false);
    const warning = result.warnings.find(w => w.rule_id === 'CW_RULE_003');
    assert.ok(warning);
    assert.strictEqual(warning?.severity, 'high');
  });

  await t.test('passes if attribution chain is not empty', () => {
    const engine = new CogWarPolicyEngine();
    const op: CogWarOperation = {
      id: 'op-7',
      isAiGenerated: false,
      hasHumanReview: true,
      riskLevel: 1,
      approvals: ['alice'],
      attributionChain: ['source-1']
    };

    const result = engine.evaluate(op);
    assert.strictEqual(result.allowed, true);
    const warning = result.warnings.find(w => w.rule_id === 'CW_RULE_003');
    assert.strictEqual(warning, undefined);
  });
});

test('CogWarPolicyEngine - Audit Log', async (t) => {
  await t.test('records all evaluations in audit log', () => {
    const engine = new CogWarPolicyEngine();
    const op1: CogWarOperation = {
      id: 'op-8',
      isAiGenerated: false,
      hasHumanReview: true,
      riskLevel: 1,
      approvals: ['alice'],
      attributionChain: ['source-1']
    };
    const op2: CogWarOperation = {
      id: 'op-9',
      isAiGenerated: true,
      hasHumanReview: false,
      riskLevel: 8,
      approvals: ['alice'],
      attributionChain: []
    };

    engine.evaluate(op1);
    engine.evaluate(op2);

    const log = engine.getAuditLog();
    assert.strictEqual(log.length, 2);

    assert.strictEqual(log[0].operationId, 'op-8');
    assert.strictEqual(log[0].result.allowed, true);

    assert.strictEqual(log[1].operationId, 'op-9');
    assert.strictEqual(log[1].result.allowed, false);
    assert.strictEqual(log[1].result.warnings.length, 3);
  });
});
