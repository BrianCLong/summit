export type Op = 'INSERT'|'UPDATE'|'DELETE';

export interface ChangeEvent {
  table: string;
  op: Op;
  pk: Record<string, string|number>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  // opaque log position for idempotency
  lsn?: string;
}
