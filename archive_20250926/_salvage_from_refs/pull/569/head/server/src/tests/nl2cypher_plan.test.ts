import Nl2CypherService from '../nl/Nl2CypherService';

test('redacts emails in plan', async () => {
  const svc = new Nl2CypherService();
  const plan = await svc.plan('show me alice@example.com');
  expect(plan.explain.prompt).not.toMatch(/alice@example.com/);
  expect(plan.readOnly).toBe(true);
});
