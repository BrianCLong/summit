export interface Report {
  evidence_id: string; // EVID-COG-YYYYMMDD-<hash>
  subject: {
    type: string;
    name: string;
    digest?: string;
  };
  result: 'pass' | 'fail';
  artifacts: Array<{
    kind: string;
    path: string;
    sha256?: string;
  }>;
  summary?: string;
}

export interface Metrics {
  evidence_id: string;
  cosign_exit_code?: number;
  metadata?: Record<string, unknown>;
}

export interface Stamp {
  timestamp: string; // ISO 8601
}
