import InvestigativeThreadQualityAgent, {
  ThreadInput,
} from '../src/ai/investigative-thread-quality-agent';

describe('InvestigativeThreadQualityAgent', () => {
  test('scores and updates graph metadata', async () => {
    const run = jest.fn().mockResolvedValue({});
    const close = jest.fn();
    const session = { run, close } as any;
    const driver = { session: () => session } as any;

    const agent = new InvestigativeThreadQualityAgent(driver);
    const thread: ThreadInput = {
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
