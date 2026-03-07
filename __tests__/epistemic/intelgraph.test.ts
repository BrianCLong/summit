import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { getClaimContext, writeDecisionProvenance } from '../../server/src/intelgraph/epistemic/queries';

describe('IntelGraph Epistemic Queries', () => {
  test('getClaimContext executes expected query', async () => {
    let executedQuery = '';
    let executedParams: any = {};
    const mockSession = {
      run: async (query: string, params: any) => {
        executedQuery = query;
        executedParams = params;
        return { records: [{ c: { id: 'claim-1' }, evidenceIds: ['ev-1'] }] };
      }
    };

    const result = await getClaimContext(mockSession, 'claim-1');
    assert.strictEqual(executedParams.claimId, 'claim-1');
    assert.ok(executedQuery.includes('MATCH (c:Claim {id: $claimId})'));
    assert.strictEqual(result.length, 1);
  });

  test('writeDecisionProvenance executes expected query', async () => {
    let executedQuery = '';
    let executedParams: any = {};
    const mockSession = {
      run: async (query: string, params: any) => {
        executedQuery = query;
        executedParams = params;
        return {};
      }
    };

    const decision = {
      decision_id: 'd-1',
      claim_id: 'c-1',
      policy_id: 'p-1',
      decision: 'APPROVE',
      evidence_ids: ['e-1']
    };

    await writeDecisionProvenance(mockSession, decision);
    assert.strictEqual(executedParams.claimId, 'c-1');
    assert.strictEqual(executedParams.decisionId, 'd-1');
    assert.ok(executedQuery.includes('CREATE (d:EpistemicDecision'));
    assert.ok(executedQuery.includes('CREATE (c)-[:HAS_DECISION]->(d)'));
  });
});
