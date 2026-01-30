/**
 * SBOM and Vulnerability Scanner Types
 * @module .github/scanners/types
 */

// SBOM Types
export interface SBOMComponent {
  type: 'library' | 'framework' | 'application' | 'container' | 'operating-system';
  name: string;
  version: string;
  purl?: string;
  licenses?: string[];
  hashes?: {
    algorithm: string;
    content: string;
  }[];
  supplier?: string;
  author?: string;
  description?: string;
}

export interface SBOMDocument {
  bomFormat: 'CycloneDX' | 'SPDX';
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools?: { vendor: string; name: string; version: string }[];
    component?: {
      type: string;
      name: string;
      version: string;
    };
  };
  components: SBOMComponent[];
}

// Vulnerability Types
export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface Vulnerability {
  id: string;
  source: string;
  severity: VulnerabilitySeverity;
  cvssScore?: number;
  cvssVector?: string;
  title: string;
  description: string;
  affectedPackage: string;
  installedVersion: string;
  fixedVersion?: string;
  publishedDate?: string;
  lastModifiedDate?: string;
  references: string[];
  exploitAvailable?: boolean;
  epssScore?: number;
  cisaKev?: boolean;
}

export interface VulnerabilityScanResult {
  scanId: string;
  scanTime: string;
  scanner: string;
  scannerVersion: string;
  target: string;
  targetType: 'image' | 'filesystem' | 'repository' | 'sbom';
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    fixable: number;
  };
  metadata?: Record<string, unknown>;
}

// SLSA Types
export interface SLSA3Provenance {
  _type: string;
  predicateType: string;
  subject: {
    name: string;
    digest: { sha256: string };
  }[];
  predicate: {
    buildDefinition: {
      buildType: string;
      externalParameters: Record<string, unknown>;
      internalParameters?: Record<string, unknown>;
      resolvedDependencies?: {
        uri: string;
        digest: Record<string, string>;
        name?: string;
      }[];
    };
    runDetails: {
      builder: {
        id: string;
        version?: Record<string, string>;
      };
      metadata: {
        invocationId: string;
        startedOn: string;
        finishedOn: string;
      };
      byproducts?: {
        name: string;
        digest: Record<string, string>;
      }[];
    };
  };
}

export interface AttestationBundle {
  dsseEnvelope: {
    payload: string;
    payloadType: string;
    signatures: {
      keyid: string;
      sig: string;
    }[];
  };
}

export interface AttestationResult {
  success: boolean;
  attestationId?: string;
  bundlePath?: string;
  subject: string;
  digest: string;
  builder: string;
  timestamp: string;
  errors?: string[];
}

// Auto-fix Types
export interface FixSuggestion {
  vulnerabilityId: string;
  package: string;
  currentVersion: string;
  fixedVersion: string;
  confidence: 'high' | 'medium' | 'low';
  breakingChange: boolean;
  automatable: boolean;
  commands?: string[];
  prTitle?: string;
  prBody?: string;
}

export interface AutoFixResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  fixesApplied: FixSuggestion[];
  fixesFailed: { fix: FixSuggestion; error: string }[];
  summary: {
    attempted: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

// Air-gapped Types
export interface AirGapConfig {
  enabled: boolean;
  vulnDbPath: string;
  sbomStorePath: string;
  attestationStorePath: string;
  syncSchedule?: string;
  lastSync?: string;
  offlineMode: boolean;
}

export interface VulnerabilityDatabase {
  version: string;
  lastUpdated: string;
  sources: string[];
  entries: Map<string, Vulnerability[]>;
}

// Dashboard Types
export interface DashboardSummary {
  totalScans: number;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  fixableCount: number;
  sbomCount: number;
  attestationCount: number;
  lastScanTime?: string;
  trendData: {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  target: string;
  scanner: string;
  status: 'success' | 'failed' | 'partial';
  summary: VulnerabilityScanResult['summary'];
  duration: number;
}

// Policy Types
export interface VulnerabilityPolicy {
  version: string;
  services: Record<string, ServicePolicy>;
  global: GlobalPolicy;
}

export interface ServicePolicy {
  exposure: 'internet-facing' | 'internal' | 'private';
  severityThresholds: {
    critical: 'block' | 'warn' | 'ignore';
    high: 'block' | 'warn' | 'ignore';
    medium: 'block' | 'warn' | 'ignore';
    low: 'block' | 'warn' | 'ignore';
  };
  allowedVulnerabilities: string[];
  scanSchedule: 'on_push' | 'daily' | 'weekly';
}

export interface GlobalPolicy {
  defaultSeverityThresholds: ServicePolicy['severityThresholds'];
  emergencyBypassEnabled: boolean;
  waiverExpiryDays: number;
  notificationChannels: string[];
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  blockedVulnerabilities: string[];
  warnings: string[];
  waiversApplied: string[];
  policyViolations: string[];
}

// Scanner Configuration
export interface ScannerConfig {
  syft: {
    outputFormat: 'cyclonedx-json' | 'spdx-json' | 'json';
    scope: 'all-layers' | 'squashed';
    excludePatterns?: string[];
  };
  trivy: {
    severity: VulnerabilitySeverity[];
    ignoreUnfixed: boolean;
    timeout: string;
    scanners: ('vuln' | 'misconfig' | 'secret' | 'license')[];
    offlineDb?: string;
  };
  cosign: {
    keyPath?: string;
    keylessEnabled: boolean;
    rekorUrl?: string;
    fulcioUrl?: string;
  };
  slsa: {
    builderIdAllowlist: string[];
    requireHermetic: boolean;
    maxProvenanceAge: number;
  };
}
