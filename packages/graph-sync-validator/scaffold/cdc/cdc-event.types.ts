export type OpType = 'insert' | 'update' | 'delete';

export interface CdcMutation<TAfter = Record<string, unknown>, TBefore = Record<string, unknown>> {
  source_system: string;
  db_name: string;
  table: string;
  pk: Record<string, string | number>;
  before: TBefore | null;
  after: TAfter | null;
  op_type: OpType;
  lsn: string;
  txid: string;
  commit_ts: string;
  actor: string | null;
  checksum: string;
}

export interface OpenLineageRunEvent {
  eventType: 'COMPLETE';
  eventTime: string;
  job: {
    namespace: string;
    name: string;
  };
  run: {
    runId: string;
  };
  inputs: Array<{
    namespace: string;
    name: string;
    facets?: Record<string, unknown>;
  }>;
  outputs: Array<{
    namespace: string;
    name: string;
    facets?: Record<string, unknown>;
  }>;
}

export interface Neo4jApplyResult {
  applied: number;
  skippedAsReplay: number;
}
