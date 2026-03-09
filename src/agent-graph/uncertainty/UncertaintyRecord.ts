export type UncertaintyState =
  | 'Detected'
  | 'Characterized'
  | 'Mitigated'
  | 'Resolved'
  | 'Escalated'
  | 'Expired';

export type UncertaintyType =
  | 'data_quality'
  | 'model_disagreement'
  | 'coordination_conflict'
  | 'missing_evidence'
  | 'parametric_knowledge'
  | string;

export interface QuantitativeMetrics {
  epistemic_score: number;
  aleatoric_score: number;
  disagreement_index: number;
  evidence_coverage_ratio: number;
}

export interface QualitativeMetrics {
  category: string;
  triggers: string[];
  remediation_actions: string[];
  human_overrides: string[];
}

export interface UncertaintyRecord {
  id: string;
  detected_at: string;
  source: string;
  type: UncertaintyType;
  current_state: UncertaintyState;
  target_id: string;
  target_type: 'Claim' | 'AgentRun' | 'EvidenceItem' | 'Task' | string;
  quantitative: QuantitativeMetrics;
  qualitative: QualitativeMetrics;
}

export class UncertaintyRegistry {
  private records: Map<string, UncertaintyRecord> = new Map();

  addRecord(record: UncertaintyRecord): void {
    this.records.set(record.id, record);
  }

  getRecord(id: string): UncertaintyRecord | undefined {
    return this.records.get(id);
  }

  getRecordsForTarget(targetId: string): UncertaintyRecord[] {
    return Array.from(this.records.values()).filter(r => r.target_id === targetId);
  }

  updateRecordState(id: string, newState: UncertaintyState): void {
    const record = this.records.get(id);
    if (record) {
      record.current_state = newState;
    }
  }

  getAllRecords(): UncertaintyRecord[] {
    return Array.from(this.records.values());
  }
}
