import { ExpertRegistry, SessionContext } from './ExpertRegistry';
import { MetaCogEngine } from './MetaCogEngine';

export interface HistoryPruner {
  getPrunedContext: (sessionId: string, input: string) => Promise<SessionContext>;
}

export class ConciergeAgent {
  private readonly activeExperts = new Map<string, string[]>();

  constructor(
    private readonly registry: ExpertRegistry,
    private readonly meta: MetaCogEngine,
    private readonly historyPruner: HistoryPruner,
    private readonly maxExpertsPerSession = 3,
  ) {}

  async handleTurn(sessionId: string, input: string): Promise<string> {
    const ctx = await this.historyPruner.getPrunedContext(sessionId, input);
    const experts = this.registry.all();
    const chosenIds = await this.meta.selectExperts(input, experts, ctx.summary);
    const boundedIds = chosenIds.slice(0, this.maxExpertsPerSession);

    const orderedIds = this.applyLru(sessionId, boundedIds);
    const responses: string[] = [];

    for (const expertId of orderedIds) {
      const expert = this.registry.get(expertId);
      if (!expert) {
        continue;
      }
      const response = await expert.handle(input, ctx);
      responses.push(response);
    }

    return responses.join('\n');
  }

  private applyLru(sessionId: string, selectedIds: string[]): string[] {
    const current = this.activeExperts.get(sessionId) ?? [];
    const filtered = current.filter((id) => !selectedIds.includes(id));
    const next = [...selectedIds, ...filtered].slice(0, this.maxExpertsPerSession);
    this.activeExperts.set(sessionId, next);
    return next;
  }
}
