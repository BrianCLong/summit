import { resolvers } from '../src/graphql/resolvers';

test('v13 deployCollaborative scales hyper', async () => {
  const plan = await resolvers.Mutation.deployCollaborative(null, {
    config: { collaborationIntensity: 1.0, globalImpact: 1e16, integrityThreshold: 0.001 },
  });
  expect(plan.harmonizedInsight.insight).toContain('1e16');
  expect(plan.riskMitigator.mitigation).toContain('0.001');
});