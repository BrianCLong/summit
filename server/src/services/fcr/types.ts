export type FcrSignalType =
  | 'claim'
  | 'media'
  | 'url'
  | 'account'
  | 'coordination_feature';

export interface FcrPrivacyBudgetCost {
  epsilon: number;
  delta: number;
}

export interface FcrProvenanceAssertions {
  c2pa_status: 'pass' | 'fail' | 'error' | 'unknown';
  signer?: string;
  assertion_hash?: string;
  signature_chain?: string;
}

export interface FcrSignal {
  entity_id: string;
  tenant_id: string;
  observed_at: string;
  signal_type: FcrSignalType;
  narrative_claim_hash?: string;
  media_hashes?: {
    phash?: string;
    ahash?: string;
    dhash?: string;
    sha256?: string;
  };
  url?: {
    normalized?: string;
    registered_domain?: string;
    public_archive?: string;
  };
  account_handle_hash?: string;
  channel_metadata?: {
    platform?: string;
    region?: string;
    language?: string;
    reach?: number;
  };
  coordination_features?: {
    burstiness?: number;
    repost_similarity?: number;
    synchronized_windows?: number;
    shared_hashtag_set?: number;
  };
  provenance_assertions?: FcrProvenanceAssertions;
  confidence_local: number;
  privacy_budget_cost: FcrPrivacyBudgetCost;
  labels?: string[];
  version: 'v1';
}

export interface FcrCluster {
  cluster_id: string;
  centroid_hash: string;
  signal_count: number;
  tenant_count_bucket: '1-2' | '3-5' | '6-10' | '11+';
  confidence: number;
  first_observed_at: string;
  last_observed_at: string;
  public_artifacts: { type: 'url' | 'media_hash'; value: string }[];
  provenance_summary?: {
    c2pa_pass_rate: number;
    signer_set: string[];
  };
}

export interface FcrResponsePack {
  playbook_id: string;
  recommended_actions: string[];
  diffusion_summary: string;
}

export interface FcrAlert {
  alert_id: string;
  cluster_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  generated_at: string;
  response_pack?: FcrResponsePack;
}
