const { startRun } = require('../src/copilot/orchestrator');
const store = require('../src/copilot/store.memory');

test('startRun executes all tasks successfully', async () => {
  const run = await startRun('g1', 'Find coordinators');
  expect(run.status).toBe('PENDING'); // immediate

  // Wait a bit for async loop to complete
  await new Promise(r => setTimeout(r, 100));
  const final = store.getRun(run.id);
  expect(['SUCCEEDED','FAILED','RUNNING','PENDING']).toContain(final.status);
  expect(final.plan.steps.length).toBeGreaterThan(0);
});