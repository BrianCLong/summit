import { Span, trace } from '@opentelemetry/api';
import { v4 as uuid } from 'uuid';
import { createPage } from '../repositories/pageRepository.js';
import { createSession, getSessionById } from '../repositories/sessionRepository.js';
import { gamIngestLatencyMs, gamRetrievalHitsTotal } from './metrics.js';
import { embedText, HybridIndex } from './indexers.js';
import { DecoratedHeader, DecoratedPage, GamTurn, IngestResponse, IngestSessionRequest } from './types.js';

function buildMemo(turns: GamTurn[]): string {
  const recent = turns.slice(-3);
  const bulletPoints = recent.map((turn) => `- ${turn.role}: ${turn.content.slice(0, 180)}`);
  return bulletPoints.join('\n');
}

function buildHeader(input: {
  sessionId: string;
  tenantId: string;
  agentId?: string | null;
  sequence: number;
  memoSnapshot?: string;
  classification?: string[];
  policyTags?: string[];
  originRunId?: string | null;
  requestIntent?: string | null;
}): DecoratedHeader {
  return {
    sessionId: input.sessionId,
    tenantId: input.tenantId,
    agentId: input.agentId,
    sequence: input.sequence,
    createdAt: new Date().toISOString(),
    memoSnapshot: input.memoSnapshot,
    classification: input.classification,
    policyTags: input.policyTags,
    originRunId: input.originRunId,
    requestIntent: input.requestIntent,
  };
}

export class GamMemorizer {
  constructor(private index: HybridIndex, private featureEnabled: () => boolean) {}

  async ingest(payload: IngestSessionRequest): Promise<IngestResponse> {
    if (!this.featureEnabled()) {
      throw new Error('GAM memory feature is disabled');
    }
    if (!payload.tenantId) {
      throw new Error('tenantId is required');
    }
    const tracer = trace.getTracer('memory-gam');
    const memo = buildMemo(payload.turns);
    const start = Date.now();
    return tracer.startActiveSpan('memorizer.memorize', async (span: Span) => {
      try {
        const session = payload.sessionId
          ? await getSessionById(payload.sessionId, payload.tenantId)
          : await createSession({
              tenantId: payload.tenantId,
              agentId: payload.agentId ?? null,
              title: payload.title ?? null,
              description: payload.description ?? null,
              classification: payload.classification ?? [],
              policyTags: payload.policyTags ?? [],
              metadata: payload.metadata ?? {},
            });

        const pages: DecoratedPage[] = [];
        let sequence = 1;
        for (const turn of payload.turns) {
          // eslint-disable-next-line no-await-in-loop
          await tracer.startActiveSpan('memorizer.page', async (pageSpan: Span) => {
            const header = buildHeader({
              sessionId: session.id,
              tenantId: payload.tenantId,
              agentId: payload.agentId,
              sequence,
              memoSnapshot: memo,
              classification: payload.classification,
              policyTags: payload.policyTags,
              requestIntent: payload.description ?? null,
            });
            const rawContent = { header, turn };
            const embedding = embedText(turn.content);
            const page = await createPage({
              sessionId: session.id,
              tenantId: payload.tenantId,
              sequence,
              rawContent,
              memo,
              tokenCount: turn.content.length,
              actorId: payload.agentId ?? null,
              actorType: turn.role,
              metadata: payload.metadata ?? {},
              classification: payload.classification ?? [],
              policyTags: payload.policyTags ?? [],
              tags: Array.isArray(turn.metadata?.tags)
                ? (turn.metadata?.tags as string[])
                : [],
              embedding,
            });
            this.index.addPage(page, `${turn.content} ${memo}`, embedding);
            pages.push({ page, header });
            sequence += 1;
            pageSpan.setAttribute('page.id', page.id ?? uuid());
            pageSpan.end();
          });
        }
        try {
          const ingestCounter = gamRetrievalHitsTotal.labels('ingest');
          if (typeof ingestCounter.inc === 'function') {
            ingestCounter.inc(payload.turns.length);
          }
        } catch (err) {
          // Metrics are best-effort; ignore failures in test environments.
        }
        return { session, memo, pages };
      } finally {
        gamIngestLatencyMs.observe(Date.now() - start);
        span.end();
      }
    });
  }
}

export function defaultFeatureFlag(): boolean {
  return process.env.MEMORY_GAM_ENABLED === 'true';
}
