import { readFileSync } from 'fs';
import path from 'path';
import { buildSamplePolicyDecision } from '../../../test/fixtures/golden/samples.js';
import { serializePolicyDecision } from '../src/index.js';

const fixturePath = path.resolve(
  __dirname,
  '../../../test/fixtures/golden/policy_decision_v0_1.json',
);

describe('policy decision serialization', () => {
  it('emits a stable, canonical JSON representation', () => {
    const decision = buildSamplePolicyDecision();
    const serialized = serializePolicyDecision(decision);
    const fixture = readFileSync(fixturePath, 'utf-8').trim();

    expect(serialized).toBe(fixture);
  });

  it('fails loudly when decision surface changes', () => {
    const decision = buildSamplePolicyDecision();
    decision.reasons.push({
      clause: {
        id: 'license-3-clause-1',
        type: 'RETENTION',
        description: 'Retention requires audit trail',
        enforcementLevel: 'SOFT',
        constraints: { retentionDays: 30 },
      },
      licenseId: 'license-3',
      impact: 'INFO',
      explanation: 'New retention requirement',
      suggestedAction: 'capture-audit-log',
    });

    const serialized = serializePolicyDecision(decision);
    const fixture = readFileSync(fixturePath, 'utf-8').trim();

    expect(serialized).not.toBe(fixture);
  });
});
