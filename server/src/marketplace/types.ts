export enum LicenseType {
  MIT = 'MIT',
  APACHE_2_0 = 'Apache-2.0',
  GPL_3_0 = 'GPL-3.0',
  PROPRIETARY = 'Proprietary',
  UNKNOWN = 'Unknown',
}

export enum SecurityStatus {
  SAFE = 'SAFE',
  VULNERABLE = 'VULNERABLE',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export enum TrustTier {
  INTERNAL = 'INTERNAL',
  PARTNER = 'PARTNER',
  COMMUNITY = 'COMMUNITY',
  UNVERIFIED = 'UNVERIFIED',
}

export interface MarketplaceArtifactGovernance {
  artifactId: string;
  license: LicenseType;
  securityStatus: SecurityStatus;
  trustTier: TrustTier;
  cves: string[];
  lastScannedAt: Date;
  signedBy?: string;
  quarantined: boolean;
  quarantineReason?: string;
}

export interface PolicyDecision {
  id: string;
  artifactId: string;
  policyId: string;
  allowed: boolean;
  reasons: string[];
  timestamp: Date;
}
