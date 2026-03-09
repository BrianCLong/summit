import test from 'node:test';
import assert from 'node:assert';
import { runResearchQuery, enforceResearchBounds, ResearchSandboxPolicy } from '../../summit/agents/research_sandbox.js';

test('enforceResearchBounds accepts safe policy', () => {
  const policy: ResearchSandboxPolicy = {
    corporaIds: ['c1'],
    outboundNetwork: false,
    writeAccess: false,
    canExecuteCode: false
  };

  assert.doesNotThrow(() => enforceResearchBounds(policy));
});

test('enforceResearchBounds throws on outbound network true', () => {
  const policy: any = {
    corporaIds: ['c1'],
    outboundNetwork: true,
    writeAccess: false,
    canExecuteCode: false
  };

  assert.throws(() => enforceResearchBounds(policy), /outbound network not disabled/);
});

test('enforceResearchBounds throws on write access true', () => {
  const policy: any = {
    corporaIds: ['c1'],
    outboundNetwork: false,
    writeAccess: true,
    canExecuteCode: false
  };

  assert.throws(() => enforceResearchBounds(policy), /write access not disabled/);
});

test('enforceResearchBounds throws on code execution true', () => {
  const policy: any = {
    corporaIds: ['c1'],
    outboundNetwork: false,
    writeAccess: false,
    canExecuteCode: true
  };

  assert.throws(() => enforceResearchBounds(policy), /code execution not disabled/);
});

test('runResearchQuery returns mock results for valid policy', async () => {
  const policy: ResearchSandboxPolicy = {
    corporaIds: ['c1'],
    outboundNetwork: false,
    writeAccess: false,
    canExecuteCode: false
  };

  const res = await runResearchQuery({ text: 'query' }, policy);
  assert.strictEqual(res.succeeded, true);
  assert.strictEqual(res.documents.length, 2);
});
