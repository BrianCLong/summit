import {
  AgentContext,
  HybridContextManager,
  HybridContextOptions,
  LLMClient,
} from '../../src/context/hybridContextManager';

class FakeLLM implements LLMClient {
  public lastPrompt?: string;

  async summarize(text: string, systemPrompt: string): Promise<string> {
    this.lastPrompt = `${systemPrompt}\n${text}`;
    return 'summary';
  }

  estimateTokens(text: string): number {
    return text.length;
  }
}

const baseOptions: HybridContextOptions = {
  observationWindow: 2,
  summarizationInterval: 4,
};

describe('HybridContextManager', () => {
  let llm: FakeLLM;
  let manager: HybridContextManager;

  beforeEach(() => {
    llm = new FakeLLM();
    manager = new HybridContextManager(llm, baseOptions);
  });

  it('masks observations beyond the window', async () => {
    const context: AgentContext = {
      turns: [
        { role: 'user', content: '1', observation: 'o1' },
        { role: 'assistant', content: '2', observation: 'o2' },
        { role: 'user', content: '3', observation: 'o3' },
      ],
    };

    const { context: managed } = await manager.manageContext(context);

    expect(managed.turns[0].observation).toContain('[omitted observation');
    expect(managed.turns[1].observation).toBe('o2');
    expect(managed.turns[2].observation).toBe('o3');
  });

  it('summarizes when interval is hit and truncates old turns', async () => {
    const context: AgentContext = {
      turns: [
        { role: 'user', content: '1' },
        { role: 'assistant', content: '2' },
        { role: 'user', content: '3' },
        { role: 'assistant', content: '4' },
      ],
    };

    const { context: managed } = await manager.manageContext(context);

    expect(managed.summary).toBeDefined();
    expect(managed.turns.length).toBe(baseOptions.observationWindow);
    expect(managed.turns[0].content).toBe('3');
    expect(managed.turns[1].content).toBe('4');
  });

  it('computes cost reduction metrics', async () => {
    const context: AgentContext = {
      turns: [
        { role: 'user', content: 'hello'.repeat(10) },
        { role: 'assistant', content: 'world'.repeat(10) },
      ],
    };

    const { metrics } = await manager.manageContext(context);

    expect(metrics.originalTokenEstimate).toBeGreaterThan(0);
    expect(metrics.managedTokenEstimate).toBeGreaterThan(0);
    expect(metrics.estimatedCostReduction).toBeGreaterThanOrEqual(0);
  });
});
