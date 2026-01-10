import { RefusalRecordProps, ValidationIssue, ValidationResult } from './types.js';

export class RefusalRecord {
  readonly reason: string;
  readonly decisionId?: string;
  readonly evidenceIds: string[];
  readonly actor: string;
  readonly doctrineRefs: string[];
  readonly containment?: string;
  readonly createdAt: Date;

  static validate(props: RefusalRecordProps): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!props.reason?.trim()) {
      issues.push({ field: 'reason', message: 'Refusal records require a non-empty reason.' });
    }

    if (!props.actor?.trim()) {
      issues.push({ field: 'actor', message: 'Refusal records require an accountable actor.' });
    }

    if (props.evidenceIds?.some((id) => !id?.trim())) {
      issues.push({ field: 'evidenceIds', message: 'Evidence IDs must be non-empty strings.' });
    }

    if (props.doctrineRefs?.some((ref) => !ref?.trim())) {
      issues.push({ field: 'doctrineRefs', message: 'Doctrine references must be non-empty strings.' });
    }

    if (props.createdAt && Number.isNaN(props.createdAt.getTime())) {
      issues.push({ field: 'createdAt', message: 'Created timestamp must be a valid date.' });
    }

    return { ok: issues.length === 0, issues };
  }

  constructor(props: RefusalRecordProps) {
    const validation = RefusalRecord.validate(props);
    if (!validation.ok) {
      const message = validation.issues.map((issue) => `${issue.field}: ${issue.message}`).join(' ');
      throw new Error(`Invalid refusal record. ${message}`);
    }

    this.reason = props.reason;
    this.decisionId = props.decisionId;
    this.evidenceIds = (props.evidenceIds ?? []).map((id) => id.trim());
    this.actor = props.actor;
    this.doctrineRefs = (props.doctrineRefs ?? []).map((ref) => ref.trim());
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
