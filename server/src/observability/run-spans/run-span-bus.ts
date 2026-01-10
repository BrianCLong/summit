import { randomUUID } from 'crypto';
import { pg } from '../../db/pg.js';
import logger from '../../utils/logger.js';
import { RunSpan } from './types.js';
import { validateTags } from './tag-registry.js';

const inMemoryBuffer: RunSpan[] = [];

const inMemoryEnabled = () => (process.env.OBS_SPAN_DEV_BUFFER || '').toLowerCase() === 'true';

export class RunSpanBus {
  private async persistSpan(span: RunSpan): Promise<void> {
    await pg.write(
      `INSERT INTO obs_raw_spans (
        run_id,
        trace_id,
        tenant_id,
        span_id,
        parent_span_id,
        stage,
        kind,
        status,
        start_time,
        end_time,
        retry_count,
        attributes,
        resources
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0), to_timestamp($9 / 1000.0), $10, $11::jsonb, $12::jsonb)`,
      [
        span.runId,
        span.traceId,
        span.tenantId || null,
        span.spanId,
        span.parentSpanId,
        span.stage,
        span.kind,
        span.status,
        span.startTimeMs,
        span.endTimeMs,
        span.retryCount || 0,
        JSON.stringify(span.attributes || {}),
        JSON.stringify(span.resources || {}),
      ],
    );
  }

  async emit(span: RunSpan): Promise<void> {
    const normalized: RunSpan = {
      ...span,
      parentSpanId: span.parentSpanId || null,
      retryCount: span.retryCount || 0,
      attributes: span.attributes || {},
      resources: span.resources || {},
    };

    const tenantFromAttributes =
      typeof normalized.attributes?.tenantId === 'string'
        ? String(normalized.attributes.tenantId)
        : undefined;
    normalized.tenantId = normalized.tenantId || tenantFromAttributes;

    const { valid } = validateTags(normalized.attributes || {});
    normalized.attributes = valid;

    if (inMemoryEnabled()) {
      inMemoryBuffer.push(normalized);
      return;
    }

    try {
      await this.persistSpan(normalized);
    } catch (err: any) {
      logger.error({ err, spanId: span.spanId }, 'Failed to persist run span');
    }
  }

  async flushBuffer(): Promise<number> {
    if (!inMemoryEnabled() || inMemoryBuffer.length === 0) return 0;
    const buffered = [...inMemoryBuffer];
    inMemoryBuffer.length = 0;
    for (const span of buffered) {
      try {
        await this.persistSpan(span);
      } catch (err: any) {
        logger.error({ err, spanId: span.spanId }, 'Failed to flush buffered run span');
      }
    }
    return buffered.length;
  }
}

export const runSpanBus = new RunSpanBus();

export const createRunSpan = (
  input: Partial<RunSpan> & Pick<RunSpan, 'runId' | 'stage' | 'kind' | 'status'>,
): RunSpan => {
  const now = Date.now();
  return {
    traceId: input.traceId || input.runId,
    spanId: input.spanId || randomUUID(),
    parentSpanId: input.parentSpanId || null,
    runId: input.runId,
    tenantId: input.tenantId,
    stage: input.stage,
    kind: input.kind,
    startTimeMs: input.startTimeMs || now,
    endTimeMs: input.endTimeMs || now,
    status: input.status,
    retryCount: input.retryCount || 0,
    attributes: input.attributes || {},
    resources: input.resources,
  };
};
