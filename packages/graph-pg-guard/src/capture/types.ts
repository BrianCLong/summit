export type CaptureSource = 'wal2json' | 'outbox';

export type WALCursor = {
  kind: 'wal';
  slot: string;
  lsn: string;
};

export type OutboxCursor = {
  kind: 'outbox';
  last_id: number;
};

export type CaptureCursor = WALCursor | OutboxCursor;

export interface ChangeEvent {
  table: string;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  pk: Record<string, any>;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  lsn?: string;
  id?: number; // For outbox
}
