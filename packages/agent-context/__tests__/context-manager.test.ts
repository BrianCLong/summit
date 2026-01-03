import { AgentContextManager } from '../src/context-manager';
import { estimateMessagesTokens } from '../src/token-estimator';

const baseTurn = (id: number) => ({
  reasoning: `step ${id} reasoning`,
  action: `action ${id}`,
  observation: { content: `result ${id}`, type: 'tool_output' as const },
});

describe('AgentContextManager', () => {
  it('masks only older observations while preserving reasoning and actions', async () => {
    const manager = new AgentContextManager({ maskingWindow: 2, defaultStrategy: 'masking' });
    await manager.ingestTurn(baseTurn(1));
    await manager.ingestTurn(baseTurn(2));
    await manager.ingestTurn(baseTurn(3));

    const { messages, diagnostics } = await manager.buildPromptContext({ tokenBudget: 8000, strategy: 'masking' });

    expect(diagnostics.maskedObservations).toBe(1);
    const combined = messages.map((m) => m.content).join('\n');
    expect(combined).toContain('step 1 reasoning');
    expect(combined).toContain('action 1');
    expect(combined).toContain('[OMITTED_OBSERVATION');
    expect(combined).toContain('result 2');
    expect(combined).toContain('result 3');
  });

  it('triggers summarization when hybrid thresholds are exceeded', async () => {
    const manager = new AgentContextManager({
      defaultStrategy: 'hybrid',
      summarizationTurnThreshold: 3,
      maskingWindow: 1,
    });
    await manager.ingestTurn(baseTurn(1));
    await manager.ingestTurn(baseTurn(2));
    await manager.ingestTurn(baseTurn(3));
    await manager.ingestTurn(baseTurn(4));

    const result = await manager.buildPromptContext({
      tokenBudget: 2000,
      strategy: 'hybrid',
      summarizationTurnThreshold: 3,
      maskingWindow: 1,
    });

    expect(result.diagnostics.summaryCalls).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics.runningSummary).toBeDefined();
  });

  it('respects token budgets when packing messages', async () => {
    const manager = new AgentContextManager({ defaultStrategy: 'masking', maskingWindow: 5 });
    for (let i = 0; i < 6; i += 1) {
      await manager.ingestTurn(baseTurn(i));
    }

    const { messages, diagnostics } = await manager.buildPromptContext({
      tokenBudget: 200,
      reservedForResponse: 50,
      maxContextPct: 0.5,
      strategy: 'masking',
    });

    const estimated = estimateMessagesTokens(messages);
    expect(estimated).toBeLessThanOrEqual(diagnostics.contextTokensOut);
  });

  it('supports a raw strategy without masking or summarization', async () => {
    const manager = new AgentContextManager({ defaultStrategy: 'raw', maskingWindow: 2 });
    await manager.ingestTurn(baseTurn(1));
    await manager.ingestTurn(baseTurn(2));

    const { messages, diagnostics } = await manager.buildPromptContext({ tokenBudget: 4000, strategy: 'raw' });

    const combined = messages.map((m) => m.content).join('\n');
    expect(combined).not.toContain('[OMITTED_OBSERVATION');
    expect(diagnostics.summaryCalls).toBe(0);
    expect(diagnostics.maskedObservations).toBe(0);
  });
});
