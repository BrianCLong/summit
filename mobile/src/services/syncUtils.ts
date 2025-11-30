import { SyncStatus } from './SyncProvider';

export function batchesNeeded(total: number, batchSize: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / batchSize);
}

export function summarizeStatus(status: SyncStatus, lastSync?: Date, queueSize?: number): string {
  const syncStamp = lastSync ? lastSync.toISOString() : 'never';
  const queue = queueSize ?? 0;
  return `${status}|queue:${queue}|last:${syncStamp}`;
}
