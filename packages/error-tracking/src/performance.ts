import { getClient } from './client-registry';
import type { PerformanceSpanOptions, PerformanceTransactionOptions, SpanLike } from './types';

export async function withSpan<T>(options: PerformanceSpanOptions, fn: () => Promise<T> | T): Promise<T> {
  const client = getClient();
  const startSpan = client.startSpan;
  if (!startSpan) {
    return await fn();
  }
  const span = startSpan({
    name: options.name,
    op: options.op,
    description: options.description,
    data: options.data
  }) as SpanLike;
  try {
    const result = await fn();
    span.setStatus('ok');
    return result;
  } catch (error) {
    span.setStatus('internal_error');
    client.captureException(error);
    throw error;
  } finally {
    span.finish();
  }
}

export async function withTransaction<T>(
  options: PerformanceTransactionOptions,
  fn: () => Promise<T> | T
): Promise<T> {
  const client = getClient();
  const startTransaction = client.startTransaction;
  if (!startTransaction) {
    return await fn();
  }
  const transaction = startTransaction({
    name: options.name,
    op: options.op,
    description: options.description,
    metadata: options.metadata,
    data: options.data,
    sampled: options.sampled
  }) as SpanLike;
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    client.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
