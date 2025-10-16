const { resolvers } = require('../src/graphql/resolvers');

describe('CopilotGoals resolvers', () => {
  test('createCopilotGoal validates text', async () => {
    await expect(
      resolvers.Mutation.createCopilotGoal(null, { text: '  ' }),
    ).rejects.toThrow();
  });

  test('createCopilotGoal + copilotGoals flow', async () => {
    const created = await resolvers.Mutation.createCopilotGoal(null, {
      text: 'Find coordinators',
      investigationId: '123',
    });
    expect(created.id).toBeDefined();
    const list = await resolvers.Query.copilotGoals(null, {
      investigationId: '123',
    });
    expect(list[0].text).toBe('Find coordinators');
  });
});
