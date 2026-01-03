import { Span, trace } from '@opentelemetry/api';
import { gamBuildContextLatencyMs, gamContextTokensOut, gamPagesUsed, gamReflectionSteps, gamRetrievalHitsTotal } from './metrics.js';
import { HybridIndex, PlanActionInput } from './indexers.js';
import {
  BriefingContext,
  BuildContextRequest,
  IntegrationState,
  PlanAction,
  ReflectionDecision,
  RetrievalResult,
} from './types.js';

const DEFAULT_BUDGETS = {
  maxPages: 8,
  maxReflectionDepth: 2,
  maxOutputTokens: 800,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function truncateTokens(text: string, maxTokens: number): string {
  if (text.length <= maxTokens) return text;
  return `${text.slice(0, maxTokens)}…`;
}

function summarize(results: RetrievalResult[]): { summary: string; facts: string[] } {
  const facts = results.slice(0, 6).map((r) => `${r.retrieverType.toUpperCase()}[${r.pageId}]: ${truncateTokens(r.excerpt, 160)}`);
  return {
    summary: facts.slice(0, 3).join('\n') || 'No evidence found',
    facts,
  };
}

function toPlanActions(request: BuildContextRequest, k: number): PlanAction[] {
  const baseQuery = request.request.slice(0, 240);
  const actions: PlanAction[] = [
    { tool: 'bm25', query: baseQuery, k, note: 'lexical recall' },
    { tool: 'dense', query: baseQuery, k, note: 'semantic recall' },
  ];
  if (request.sessionId) {
    actions.push({ tool: 'page_id', pageIds: [request.sessionId], k: Math.min(2, k), note: 'session anchor' });
  }
  return actions;
}

export class Researcher {
  constructor(private index: HybridIndex, private featureEnabled: () => boolean) {}

  buildContext(request: BuildContextRequest): Promise<BriefingContext> {
    if (!this.featureEnabled()) {
      throw new Error('GAM memory feature is disabled');
    }
    const budgets = {
      maxPages: clamp(request.budgets?.maxPages ?? DEFAULT_BUDGETS.maxPages, 1, 32),
      maxReflectionDepth: clamp(request.budgets?.maxReflectionDepth ?? DEFAULT_BUDGETS.maxReflectionDepth, 1, 5),
      maxOutputTokens: clamp(request.budgets?.maxOutputTokens ?? DEFAULT_BUDGETS.maxOutputTokens, 200, 4000),
    };
    const tracer = trace.getTracer('memory-gam');
    const start = Date.now();
    return tracer.startActiveSpan('researcher.plan', async (planSpan: Span) => {
      try {
        let reflectionStep = 0;
        let integration: IntegrationState = { briefingDraft: '', keyFacts: [], openQuestions: [], usedPages: [] };
        let evidence: RetrievalResult[] = [];
        const plan = toPlanActions(request, budgets.maxPages);

        while (reflectionStep < budgets.maxReflectionDepth) {
          const actions: PlanActionInput[] = plan.map((action) => ({
            tool: action.tool,
            query: action.query,
            pageIds: action.pageIds,
            k: action.k,
            tenantId: request.tenantId,
          }));

          const searchResults = await tracer.startActiveSpan('researcher.search', async (searchSpan: Span) => {
            const results = this.index.search(actions);
            results.forEach((r) => {
              try {
                const counter = gamRetrievalHitsTotal.labels(r.retrieverType);
                if (typeof counter.inc === 'function') {
                  counter.inc();
                }
              } catch (err) {
                // Metrics are best-effort; ignore failures in test environments.
              }
            });
            searchSpan.end();
            return results;
          });

          const filtered = searchResults
            .filter((r: RetrievalResult) => r.tenantId === request.tenantId)
            .sort((a: RetrievalResult, b: RetrievalResult) => b.score - a.score)
            .slice(0, budgets.maxPages);

          evidence = [...evidence, ...filtered];

          integration = await tracer.startActiveSpan('researcher.integrate', async (integrateSpan: Span) => {
            const { summary, facts } = summarize(filtered);
            const keyFacts = [...integration.keyFacts, ...facts].slice(0, 10);
            const usedPages = Array.from(
              new Set([...integration.usedPages, ...filtered.map((r: RetrievalResult) => r.pageId)]),
            ).slice(
              0,
              budgets.maxPages,
            );
            const openQuestions = integration.openQuestions.length > 0 ? integration.openQuestions : ['What is missing?'];
            integrateSpan.end();
            return {
              briefingDraft: `${integration.briefingDraft}\n${summary}`.trim(),
              keyFacts,
              openQuestions,
              usedPages,
            };
          });

          const reflection: ReflectionDecision = await tracer.startActiveSpan(
            'researcher.reflect',
            async (reflectSpan: Span) => {
              const missingInfo = integration.keyFacts.length < 2 ? 'Need more supporting facts' : undefined;
              const done = reflectionStep + 1 >= budgets.maxReflectionDepth || integration.keyFacts.length >= 3;
              reflectSpan.end();
              return { done, missingInfo };
            },
          );

          reflectionStep += 1;
          gamReflectionSteps.set(reflectionStep);
          if (reflection.done) {
            break;
          }
        }

        const briefing: BriefingContext = {
          executiveSummary: truncateTokens(integration.briefingDraft || request.request, budgets.maxOutputTokens),
          keyFacts: integration.keyFacts.slice(0, 8),
          openQuestions: integration.openQuestions.slice(0, 4),
          evidence: evidence.slice(0, budgets.maxPages).map((item) => ({
            pageId: item.pageId,
            excerpt: truncateTokens(item.excerpt, 200),
            relevanceScore: item.score,
            retrieverType: item.retrieverType,
          })),
          tokensUsed: Math.min(budgets.maxOutputTokens, (integration.briefingDraft || '').length + request.request.length),
          reflectionSteps: reflectionStep,
          pagesUsed: Math.min(integration.usedPages.length, budgets.maxPages),
        };

        gamPagesUsed.set(briefing.pagesUsed);
        gamContextTokensOut.set(briefing.tokensUsed);

        return briefing;
      } finally {
        gamBuildContextLatencyMs.observe(Date.now() - start);
        planSpan.end();
      }
    });
  }
}
