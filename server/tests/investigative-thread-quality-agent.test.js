import InvestigativeThreadQualityAgent from '../src/ai/investigative-thread-quality-agent';
describe('InvestigativeThreadQualityAgent', () => {
  test('scores and updates graph metadata', async () => {
    const run = jest.fn().mockResolvedValue({});
    const close = jest.fn();
    const session = { run, close };
    const driver = { session: () => session };
    const agent = new InvestigativeThreadQualityAgent(driver);
    const thread = {
      id: 't1',
      investigationId: 'inv1',
      messages: [
        {
          text: 'First statement with reference http://example.com',
          evidence: ['http://example.com'],
        },
        { text: 'Second statement repeats' },
        { text: 'Second statement repeats' },
      ],
    };
    const scores = await agent.scoreAndUpdate(thread);
    expect(scores.evidence).toBeCloseTo(1 / 3, 5);
    expect(scores.redundancy).toBeGreaterThan(0);
    expect(run).toHaveBeenCalled();
  });
});
//# sourceMappingURL=investigative-thread-quality-agent.test.js.map
