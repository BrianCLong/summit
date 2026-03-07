import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { evaluateEpistemicIntent, ClaimContext, EpistemicPolicy } from '../src/epistemic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Epistemic Intent Evaluation - Abuse Cases', () => {
  const policy: EpistemicPolicy = {
    policyId: 'osint-high-impact',
    minSupportScore: 0.8,
    maxEpistemicUncertainty: 0.3,
    minIndependentSources: 2,
    maxConflictScore: 0.1,
  };

  const fixturesPath = path.join(__dirname, '../../../evidence/epistemic-assurance/fixtures/abuse-cases.json');
  const fixturesData = fs.readFileSync(fixturesPath, 'utf8');
  const fixtures = JSON.parse(fixturesData);

  fixtures.forEach((fixture: any) => {
    test(`handles fixture: ${fixture.description}`, () => {
      const result = evaluateEpistemicIntent(fixture.context as ClaimContext, policy);
      assert.strictEqual(result.decision, fixture.expectedDecision);
      assert.strictEqual(result.rationale, fixture.expectedRationale);
    });
  });
});
