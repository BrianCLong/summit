
export interface AssuranceClaim {
  id: string;
  domain: 'security' | 'governance' | 'operations' | 'provenance' | 'lifecycle';
  claim: string; // e.g. "security.vulnerability.scan.passed"
  value: boolean | string | number;
  evidence: EvidenceReference[];
  timestamp: string;
  validUntil: string;
}

export interface EvidenceReference {
  type: 'artifact' | 'log' | 'test_result' | 'policy' | 'metric';
  id: string;
  hash: string;
  location?: string; // URI
}

export interface Attestation {
  id: string;
  tenantId: string;
  timestamp: string;
  claims: AssuranceClaim[];
  signature: string; // Detached signature of claims
  metadata: {
    engineVersion: string;
    profile?: string;
  };
}

export interface AttestationProfile {
  id: string;
  name: string;
  description: string;
  requiredClaims: string[];
  exclusions: string[];
}
