/**
 * Scanner Configuration
 * @module .github/scanners/config
 */

import type { ScannerConfig, AirGapConfig, VulnerabilityPolicy } from './types.js';

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  syft: {
    outputFormat: 'cyclonedx-json',
    scope: 'all-layers',
    excludePatterns: [
      '**/node_modules/.cache/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
    ],
  },
  trivy: {
    severity: ['critical', 'high', 'medium'],
    ignoreUnfixed: false,
    timeout: '15m',
    scanners: ['vuln', 'secret'],
    offlineDb: process.env.TRIVY_DB_PATH,
  },
  cosign: {
    keylessEnabled: true,
    rekorUrl: 'https://rekor.sigstore.dev',
    fulcioUrl: 'https://fulcio.sigstore.dev',
  },
  slsa: {
    builderIdAllowlist: [
      'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml',
      'https://github.com/intelgraph/build-system/.github/workflows/federal-build.yml',
      'https://cloudbuild.googleapis.com/GoogleHostedWorker',
    ],
    requireHermetic: true,
    maxProvenanceAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
};

export const DEFAULT_AIRGAP_CONFIG: AirGapConfig = {
  enabled: process.env.AIRGAP_MODE === 'true',
  vulnDbPath: process.env.VULN_DB_PATH || '/var/lib/trivy/db',
  sbomStorePath: process.env.SBOM_STORE_PATH || '/var/lib/sbom',
  attestationStorePath: process.env.ATTESTATION_STORE_PATH || '/var/lib/attestations',
  syncSchedule: process.env.VULN_DB_SYNC_SCHEDULE || '0 2 * * *',
  offlineMode: process.env.OFFLINE_MODE === 'true',
};

export const DEFAULT_VULNERABILITY_POLICY: VulnerabilityPolicy = {
  version: '2.0',
  global: {
    defaultSeverityThresholds: {
      critical: 'block',
      high: 'block',
      medium: 'warn',
      low: 'ignore',
    },
    emergencyBypassEnabled: process.env.EMERGENCY_BYPASS === 'true',
    waiverExpiryDays: 30,
    notificationChannels: ['#security-alerts', '#platform-ops'],
  },
  services: {
    'intelgraph-server': {
      exposure: 'internet-facing',
      severityThresholds: {
        critical: 'block',
        high: 'block',
        medium: 'block',
        low: 'warn',
      },
      allowedVulnerabilities: [],
      scanSchedule: 'on_push',
    },
    'intelgraph-api': {
      exposure: 'internet-facing',
      severityThresholds: {
        critical: 'block',
        high: 'block',
        medium: 'block',
        low: 'warn',
      },
      allowedVulnerabilities: [],
      scanSchedule: 'on_push',
    },
    'analytics-engine': {
      exposure: 'internal',
      severityThresholds: {
        critical: 'block',
        high: 'block',
        medium: 'warn',
        low: 'ignore',
      },
      allowedVulnerabilities: [],
      scanSchedule: 'daily',
    },
    'copilot-service': {
      exposure: 'internal',
      severityThresholds: {
        critical: 'block',
        high: 'block',
        medium: 'warn',
        low: 'ignore',
      },
      allowedVulnerabilities: [],
      scanSchedule: 'daily',
    },
  },
};

// Environment-specific configuration loader
export function loadConfig(): {
  scanner: ScannerConfig;
  airgap: AirGapConfig;
  policy: VulnerabilityPolicy;
} {
  return {
    scanner: {
      ...DEFAULT_SCANNER_CONFIG,
      trivy: {
        ...DEFAULT_SCANNER_CONFIG.trivy,
        offlineDb: process.env.TRIVY_DB_PATH || DEFAULT_SCANNER_CONFIG.trivy.offlineDb,
      },
      cosign: {
        ...DEFAULT_SCANNER_CONFIG.cosign,
        keyPath: process.env.COSIGN_KEY_PATH,
        keylessEnabled: process.env.COSIGN_KEYLESS !== 'false',
      },
    },
    airgap: {
      ...DEFAULT_AIRGAP_CONFIG,
      enabled: process.env.AIRGAP_MODE === 'true',
      offlineMode: process.env.OFFLINE_MODE === 'true',
    },
    policy: DEFAULT_VULNERABILITY_POLICY,
  };
}

// CVSS severity thresholds
export const CVSS_THRESHOLDS = {
  critical: 9.0,
  high: 7.0,
  medium: 4.0,
  low: 0.1,
};

// Supported package ecosystems for auto-fix
export const SUPPORTED_ECOSYSTEMS = [
  'npm',
  'yarn',
  'pnpm',
  'pip',
  'poetry',
  'go',
  'cargo',
  'maven',
  'gradle',
  'nuget',
  'composer',
  'rubygems',
] as const;

export type SupportedEcosystem = (typeof SUPPORTED_ECOSYSTEMS)[number];

// Fix confidence thresholds
export const FIX_CONFIDENCE = {
  patch: 0.95, // Patch version bumps (1.0.0 -> 1.0.1)
  minor: 0.8, // Minor version bumps (1.0.0 -> 1.1.0)
  major: 0.5, // Major version bumps (1.0.0 -> 2.0.0)
};
