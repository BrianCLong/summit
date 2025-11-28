/**
 * Rapid Attribution (CTI) Runbook Definition
 *
 * This runbook implements a 4-step workflow for rapid cyber threat intelligence
 * attribution:
 *
 * 1. Ingest Indicators - Collect and normalize threat indicators
 * 2. Resolve Infrastructure - Discover related infrastructure through graph lookups
 * 3. Pattern Miner - Match campaigns and TTPs against known threat actors
 * 4. Generate Report - Create attribution hypothesis report
 *
 * @module runbooks/runtime/rapid-attribution-runbook
 */

import { RunbookDefinition, RunbookStepDefinition } from './types';
import { LegalBasis, DataLicense } from '../dags/types';

/**
 * Step 1: Ingest Indicators
 */
const ingestIndicatorsStep: RunbookStepDefinition = {
  id: 'step1_ingest_indicators',
  name: 'Ingest Indicators',
  description: 'Extract and normalize threat indicators from incident data or manual input',
  actionType: 'INGEST',
  dependsOn: [],
  config: {
    inputField: 'indicators',
    normalizeTypes: true,
    deduplicateIndicators: true,
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffSeconds: 10,
    backoffMultiplier: 2,
    maxBackoffSeconds: 60,
  },
  timeoutMs: 60000, // 1 minute
};

/**
 * Step 2: Resolve Infrastructure
 */
const resolveInfrastructureStep: RunbookStepDefinition = {
  id: 'step2_resolve_infrastructure',
  name: 'Resolve Infrastructure',
  description: 'Discover related infrastructure through graph database lookups',
  actionType: 'LOOKUP_GRAPH',
  dependsOn: ['step1_ingest_indicators'],
  config: {
    depth: 2,
    includePassiveDNS: true,
    includeCertificates: true,
    includeWHOIS: true,
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffSeconds: 10,
    backoffMultiplier: 2,
  },
  timeoutMs: 120000, // 2 minutes
};

/**
 * Step 3: Pattern Miner - Match Campaigns
 */
const patternMinerStep: RunbookStepDefinition = {
  id: 'step3_pattern_miner',
  name: 'Pattern Miner – Match Campaigns',
  description: 'Match indicators and infrastructure against known threat actor campaigns and TTPs',
  actionType: 'PATTERN_MINER',
  dependsOn: ['step2_resolve_infrastructure'],
  config: {
    minConfidence: 0.3,
    includeHistoricalCampaigns: true,
    maxCandidates: 10,
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffSeconds: 10,
  },
  timeoutMs: 90000, // 90 seconds
};

/**
 * Step 4: Generate Attribution Report
 */
const generateReportStep: RunbookStepDefinition = {
  id: 'step4_generate_report',
  name: 'Generate Attribution Hypothesis Report',
  description: 'Generate structured attribution report with confidence scores and evidence',
  actionType: 'GENERATE_REPORT',
  dependsOn: ['step3_pattern_miner'],
  config: {
    includeAlternativeCandidates: true,
    includeResidualUnknowns: true,
    includeRecommendations: true,
  },
  retryPolicy: {
    maxAttempts: 2,
    backoffSeconds: 10,
  },
  timeoutMs: 30000, // 30 seconds
};

/**
 * Rapid Attribution (CTI) Runbook Definition
 */
export const RapidAttributionRunbook: RunbookDefinition = {
  id: 'rapid_attribution_cti',
  name: 'Rapid Attribution (CTI)',
  version: '1.0.0',
  purpose:
    'Quickly attribute an indicator set to likely threat campaigns/infrastructure with evidential support.',
  legalBasisRequired: [LegalBasis.LEGITIMATE_INTERESTS, LegalBasis.PUBLIC_TASK],
  dataLicensesRequired: [
    DataLicense.INTERNAL_USE_ONLY,
    DataLicense.PROPRIETARY,
  ],
  assumptions: [
    'Indicators are lawfully obtained and permitted for CTI analysis.',
    'Existing campaign knowledge base is reasonably up to date.',
    'Graph database contains relevant historical threat data.',
    'User has appropriate clearance for CTI analysis.',
  ],
  kpis: [
    'Time-to-first-attribution-hypothesis',
    'Number of matching campaigns ranked by confidence',
    'Explicit residual unknowns documented',
    'Evidence quality score',
  ],
  steps: [
    ingestIndicatorsStep,
    resolveInfrastructureStep,
    patternMinerStep,
    generateReportStep,
  ],
  benchmarks: {
    totalMs: 300000, // 5 minutes
    perStepMs: {
      step1_ingest_indicators: 30000,
      step2_resolve_infrastructure: 60000,
      step3_pattern_miner: 45000,
      step4_generate_report: 15000,
    },
  },
  metadata: {
    category: 'CTI',
    sensitivity: 'high',
    retentionYears: 7,
    owner: 'CTI Team',
    reviewCycle: '90 days',
    compliance: ['GDPR Article 6(1)(f)', 'NIST CSF'],
  },
};

/**
 * Create a new instance of the Rapid Attribution runbook
 * with optional customizations
 */
export function createRapidAttributionRunbook(
  options?: Partial<{
    version: string;
    minConfidence: number;
    graphDepth: number;
    timeoutMultiplier: number;
  }>
): RunbookDefinition {
  const runbook = JSON.parse(JSON.stringify(RapidAttributionRunbook)) as RunbookDefinition;

  if (options?.version) {
    runbook.version = options.version;
  }

  if (options?.minConfidence !== undefined) {
    const patternStep = runbook.steps.find((s) => s.id === 'step3_pattern_miner');
    if (patternStep) {
      patternStep.config.minConfidence = options.minConfidence;
    }
  }

  if (options?.graphDepth !== undefined) {
    const graphStep = runbook.steps.find((s) => s.id === 'step2_resolve_infrastructure');
    if (graphStep) {
      graphStep.config.depth = options.graphDepth;
    }
  }

  if (options?.timeoutMultiplier !== undefined) {
    for (const step of runbook.steps) {
      if (step.timeoutMs) {
        step.timeoutMs = Math.floor(step.timeoutMs * options.timeoutMultiplier);
      }
    }
    if (runbook.benchmarks) {
      runbook.benchmarks.totalMs = Math.floor(
        runbook.benchmarks.totalMs * options.timeoutMultiplier
      );
      for (const stepId of Object.keys(runbook.benchmarks.perStepMs)) {
        runbook.benchmarks.perStepMs[stepId] = Math.floor(
          runbook.benchmarks.perStepMs[stepId] * options.timeoutMultiplier
        );
      }
    }
  }

  return runbook;
}

/**
 * Validate input for Rapid Attribution runbook
 */
export function validateRapidAttributionInput(input: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for indicators
  if (!input.indicators) {
    errors.push('Missing required field: indicators');
  } else if (!Array.isArray(input.indicators)) {
    errors.push('indicators must be an array');
  } else if (input.indicators.length === 0) {
    errors.push('indicators array cannot be empty');
  }

  // Validate indicator format if present
  if (Array.isArray(input.indicators)) {
    for (let i = 0; i < input.indicators.length; i++) {
      const ind = input.indicators[i];
      if (typeof ind !== 'string' || ind.trim().length === 0) {
        errors.push(`Invalid indicator at index ${i}: must be a non-empty string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Example input for Rapid Attribution runbook
 */
export const rapidAttributionExampleInput = {
  indicators: [
    '192.168.1.100',
    'malicious-domain.com',
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    'phishing.example.org',
    '10.0.0.50',
  ],
  caseId: 'CASE-2024-001',
  source: 'Security Operations Center',
  priority: 'high',
};
