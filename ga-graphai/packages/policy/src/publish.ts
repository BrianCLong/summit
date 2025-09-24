import type {
  ExportManifest,
  LedgerFactInput,
  ManifestVerificationResult
} from 'prov-ledger';

export type PublicationRecommendation = 'proceed' | 'advise-remediation' | 'block';

export interface PublicationChecklist {
  citationsRequired: number;
  citationsProvided: number;
  manifestAttached: boolean;
  manifestHash?: string;
  missing: string[];
}

export interface PublicationAttempt {
  exportId: string;
  actor: string;
  citationsRequired: number;
  citationsProvided: number;
  manifestAttached: boolean;
  manifestHash?: string;
  overrideJustification?: string;
}

export interface PublicationDecision {
  exportId: string;
  actor: string;
  createdAt: string;
  recommendation: PublicationRecommendation;
  reasons: string[];
  checklist: PublicationChecklist;
  overrideJustification?: string;
  recordedInLedger: boolean;
}

interface PublicationAttemptInternal extends PublicationAttempt {
  manifestHash?: string;
}

export interface PublicationAttemptOptions {
  manifest?: ExportManifest;
  verification?: ManifestVerificationResult;
  recordAudit?: (entry: LedgerFactInput) => void;
}

function buildChecklist(attempt: PublicationAttemptInternal): PublicationChecklist {
  const missing: string[] = [];
  if (attempt.citationsProvided < attempt.citationsRequired) {
    missing.push('citations');
  }
  if (!attempt.manifestAttached) {
    missing.push('manifest');
  }
  return {
    citationsRequired: attempt.citationsRequired,
    citationsProvided: attempt.citationsProvided,
    manifestAttached: attempt.manifestAttached,
    manifestHash: attempt.manifestHash,
    missing
  };
}

function describeRecommendation(
  status: PublicationRecommendation,
  verification?: ManifestVerificationResult
): string[] {
  const reasons: string[] = [];
  if (verification && verification.status !== 'pass') {
    reasons.push(`Manifest verification reported: ${verification.status}`);
    reasons.push(...verification.issues);
  }
  switch (status) {
    case 'proceed':
      reasons.push('All checklist items satisfied.');
      break;
    case 'advise-remediation':
      reasons.push('Recommended to address missing checklist items before publishing.');
      break;
    case 'block':
      reasons.push('Blocking publication due to tampering or schema mismatch.');
      break;
    default:
      break;
  }
  return reasons;
}

function determineRecommendation(
  checklist: PublicationChecklist,
  verification?: ManifestVerificationResult
): PublicationRecommendation {
  if (verification && (verification.status === 'tampered' || verification.status === 'schema-mismatch')) {
    return 'block';
  }
  if (checklist.missing.length > 0 || (verification && verification.status === 'unverifiable')) {
    return 'advise-remediation';
  }
  return 'proceed';
}

export function evaluatePublicationAttempt(
  attempt: PublicationAttempt,
  options: PublicationAttemptOptions = {}
): PublicationDecision {
  const internalAttempt: PublicationAttemptInternal = {
    ...attempt,
    manifestHash: options.manifest?.merkleRoot ?? attempt.manifestHash
  };
  const checklist = buildChecklist(internalAttempt);
  const recommendation = determineRecommendation(checklist, options.verification);
  const reasons = describeRecommendation(recommendation, options.verification);
  const createdAt = new Date().toISOString();

  let recordedInLedger = false;
  if (options.recordAudit) {
    const payload = {
      checklist,
      recommendation,
      verificationStatus: options.verification?.status ?? 'not-run',
      issues: options.verification?.issues ?? [],
      override: attempt.overrideJustification ?? null
    } as const;
    const entry: LedgerFactInput = {
      id: `publish-${attempt.exportId}-${Date.now().toString(36)}`,
      category: 'publication',
      actor: attempt.actor,
      action: 'attempt',
      resource: attempt.exportId,
      payload,
      timestamp: createdAt
    };
    options.recordAudit(entry);
    recordedInLedger = true;
  }

  return {
    exportId: attempt.exportId,
    actor: attempt.actor,
    createdAt,
    recommendation,
    reasons,
    checklist,
    overrideJustification: attempt.overrideJustification,
    recordedInLedger
  };
}
