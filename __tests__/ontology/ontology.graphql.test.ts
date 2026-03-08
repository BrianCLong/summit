import { resolvers } from '../../api/graphql/ontology/aiInfluenceCampaign.resolvers';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';

describe('GraphQL AI Influence Campaign Resolvers', () => {
  it('should resolve aiInfluenceCampaign with mocked data', async () => {
    const context = {};
    const result = await resolvers.Query.aiInfluenceCampaign(null, { campaignId: 'camp_test' }, context);
    assert.strictEqual(result.campaignId, 'camp_test');
    assert.ok(result.actorIds.includes('actor_example'));
    assert.ok(result.evidenceIds.includes('EVID:ai-influence-campaign:evidence:0001'));
  });

  it('should resolve aiInfluenceCampaignsByTactic to empty array', async () => {
    const context = {};
    const result = await resolvers.Query.aiInfluenceCampaignsByTactic(null, { tacticId: 'test_tactic' }, context);
    assert.strictEqual(Array.isArray(result), true);
    assert.strictEqual(result.length, 0);
  });
});
