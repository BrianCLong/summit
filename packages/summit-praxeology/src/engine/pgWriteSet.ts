import { validatePlaybook, type RejectionReport } from '../validate/validatePlaybook';

export type PGWriteOperation =
  | { type: 'create_playbook'; payload: any }
  | { type: 'update_playbook'; id: string; payload: any };

export type PGWriteSetResult = {
  ok: boolean;
  committedIds: string[];
  rejections: Array<{ operation: PGWriteOperation; report: RejectionReport }>;
};

/**
 * PGWriteSet quarantines all PG writes.
 * They are analytic/defensive and must never write to the Reality Graph (RG).
 */
export class PGWriteSet {
  private operations: PGWriteOperation[] = [];

  add(op: PGWriteOperation) {
    this.operations.push(op);
  }

  commit(): PGWriteSetResult {
    const committedIds: string[] = [];
    const rejections: Array<{ operation: PGWriteOperation; report: RejectionReport }> = [];

    for (const op of this.operations) {
      if (op.type === 'create_playbook' || op.type === 'update_playbook') {
        const report = validatePlaybook(op.payload);

        if (report.ok) {
          // Here, you would normally commit to the database (e.g., Neo4j/Postgres)
          // Since this is PG, it strictly stays out of the RG schema.
          committedIds.push(op.payload.id);
        } else {
          rejections.push({ operation: op, report });
        }
      }
    }

    return {
      ok: rejections.length === 0,
      committedIds,
      rejections
    };
  }
}
