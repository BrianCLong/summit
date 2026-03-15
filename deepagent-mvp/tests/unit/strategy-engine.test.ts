import { StrategyEngine } from '../../src/agent/reasoning/strategy-engine';

describe('StrategyEngine', () => {
  it('recommends tool discovery for fresh runs', () => {
    const engine = new StrategyEngine();
    const assessment = engine.assess('investigate ransomware indicators', ['high-priority'], []);

    expect(assessment.recommended.id).toBe('precision-tool-hunt');
    expect(assessment.recommended.nextAction).toBe('search_tools');
    expect(assessment.candidates).toHaveLength(3);
  });

  it('recommends execution after tool retrieval evidence exists', () => {
    const engine = new StrategyEngine();
    const assessment = engine.assess('investigate ransomware indicators', [], [
      {
        run_id: 'run-1',
        tenant_id: 'tenant-a',
        step: 1,
        event_json: { type: 'tool-retrieval', data: { results: ['tool-a'] } },
        ts: new Date(),
      },
    ]);

    expect(assessment.recommended.nextAction).toBe('call_tool');
  });
});
