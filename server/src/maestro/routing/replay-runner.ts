import { LLMClient, MockLLM } from '../../services/llm.js';
import { DecisionRecorder, DecisionRecord } from './decision-recorder.js';
import { LLMDecisionRouter } from './llm-decision-router.js';
import { RouteDecision } from './learning-to-rank.js';

export class ReplayRunner {
  constructor(
    private recorder: DecisionRecorder = new DecisionRecorder(),
    private router: LLMDecisionRouter = new LLMDecisionRouter(),
    private provider: LLMClient = new MockLLM(),
  ) {}

  async replay(decisionId: string): Promise<{
    record: DecisionRecord;
    replayDecision: RouteDecision;
    matches: boolean;
    renderedOutput: string;
  }> {
    const record = await this.recorder.load(decisionId);

    if (!record) {
      throw new Error(`Decision record ${decisionId} not found`);
    }

    const { decision } = await this.router.route(
      {
        prompt: record.request.prompt,
        context: record.request.context,
        tenantId: record.request.tenantId || 'unknown',
        userId: record.request.userId,
        features: record.request.features,
        policies: record.request.policies,
        constraints: record.request.constraints,
        redactions: record.outcome.guardrailActions.piiRedactions,
        startedAt: record.meta.decisionStartedAt,
      },
      { persist: false, applySideEffects: false },
    );

    const output: string[] = [];
    const controller = new AbortController();
    for await (const token of this.provider.stream(
      record.request.prompt,
      controller.signal,
    )) {
      output.push(token);
    }

    const matches =
      decision.selectedModel.provider === record.outcome.provider &&
      decision.selectedModel.id === record.outcome.model;

    return {
      record,
      replayDecision: decision,
      matches,
      renderedOutput: output.join(''),
    };
  }
}
