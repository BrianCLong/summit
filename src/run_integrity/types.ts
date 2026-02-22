export interface EvidenceItem {
  id: string;
  runId: string;
  payload: any;
  metadata: any;
  digest?: string; // Pre-computed digest if available
}

export interface MismatchDetail {
  id: string;
  postgresDigest?: string;
  neo4jDigest?: string;
  type: 'MISSING_IN_POSTGRES' | 'MISSING_IN_NEO4J' | 'DIGEST_MISMATCH';
}

export interface IntegrityReport {
  runId: string;
  subject: string;
  timestamp: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  postgresCount: number;
  neo4jCount: number;
  postgresAggregateDigest: string;
  neo4jAggregateDigest: string;
  mismatches: MismatchDetail[];
}
