import { EvidenceId } from '../evidence/ids';

export interface SupportSpan {
  doc_id: string;
  start: number;
  end: number;
  text: string;
}

export interface InterpretiveDefault {
  default_id: EvidenceId;
  assumption_type: 'presupposition' | 'causal_link' | 'normative';
  content: string;
  support_spans: SupportSpan[];
  confidence: number;
  rationale_template_id: string;
}

export interface RedundancyCluster {
  cluster_id: string;
  narrative_ids: string[];
  structural_fingerprint: string;
  size: number;
}

export interface ConvergenceMetrics {
  interpretive_variance: number;
  convergence_direction: 'converging' | 'diverging' | 'stable';
  speed_score: number;
  vector: number[];
}

export interface NarrativeIdentity {
  narrative_id: string;
  first_seen: string;
  last_seen: string;
  mutation_log: Array<{
    timestamp: string;
    diff_hash: string;
  }>;
}

export interface NarrativeEvidencePack {
  interpretive_defaults: InterpretiveDefault[];
  redundancy_clusters: RedundancyCluster[];
  convergence: ConvergenceMetrics;
  narrative_ids: NarrativeIdentity[];
}
