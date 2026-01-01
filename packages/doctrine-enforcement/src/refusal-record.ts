import { RefusalRecordProps } from './types.js';

export class RefusalRecord {
  readonly reason: string;
  readonly decisionId?: string;
  readonly evidenceIds: string[];
  readonly actor: string;
  readonly doctrineRefs: string[];
  readonly containment?: string;
  readonly createdAt: Date;

  constructor(props: RefusalRecordProps) {
    this.reason = props.reason;
    this.decisionId = props.decisionId;
    this.evidenceIds = props.evidenceIds ?? [];
    this.actor = props.actor;
    this.doctrineRefs = props.doctrineRefs ?? [];
    this.containment = props.containment;
    this.createdAt = props.createdAt ?? new Date();
  }

  toJSON() {
    return {
      reason: this.reason,
      decisionId: this.decisionId,
      evidenceIds: this.evidenceIds,
      actor: this.actor,
      doctrineRefs: this.doctrineRefs,
      containment: this.containment,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
