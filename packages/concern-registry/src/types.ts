export interface Concern {
  concern_id: string;
  title: string;
  type: string;
  domain: string;
  severity: string;
  status: string;
  source_signals: string[];
  evidence_refs: string[];
  owner: string;
  created_from?: string;
}

export interface Signal {
  signal_id: string;
  type: string;
  source: string;
  evidence: string;
}
