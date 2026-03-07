import type { WriteSet, Claim } from "../materializers/materializeViews";

export interface SemanticIssue {
  code:
    | "INVALID_VALID_TIME_RANGE"
    | "MISSING_PROVENANCE_REFERENCE"
    | "DUPLICATE_BATCH_SIGNATURE"
    | "DUPLICATE_CLAIM_ID_IN_WRITESET";
  severity: "error" | "warning";
  message: string;
  writeset_id?: string;
  claim_id?: string;
  provenance_id?: string;
  details?: Record<string, unknown>;
}

export interface SemanticValidationResult {
  ok: boolean;
  issues: SemanticIssue[];
}

function isIsoBeforeOrEqual(a: string, b: string): boolean {
  return a <= b;
}

export function validateClaimSemanticRules(claim: Claim, writesetId?: string): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  if (claim.valid_time_start && claim.valid_time_end) {
    if (!isIsoBeforeOrEqual(claim.valid_time_start, claim.valid_time_end)) {
      issues.push({
        code: "INVALID_VALID_TIME_RANGE",
        severity: "error",
        writeset_id: writesetId,
        claim_id: claim.claim_id,
        message: "valid_time_start must be <= valid_time_end",
        details: {
          valid_time_start: claim.valid_time_start,
          valid_time_end: claim.valid_time_end,
        },
      });
    }
  }

  return issues;
}

export function validateWriteSetSemanticRules(writeset: WriteSet): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  const provenanceIds = new Set(writeset.provenance.map((p) => p.provenance_id));
  const claimIds = new Set<string>();

  for (const claim of writeset.claims) {
    if (claimIds.has(claim.claim_id)) {
      issues.push({
        code: "DUPLICATE_CLAIM_ID_IN_WRITESET",
        severity: "error",
        writeset_id: writeset.writeset_id,
        claim_id: claim.claim_id,
        message: `Duplicate claim_id in writeset: ${claim.claim_id}`,
      });
    }
    claimIds.add(claim.claim_id);

    issues.push(...validateClaimSemanticRules(claim, writeset.writeset_id));

    for (const provId of claim.provenance_refs) {
      if (!provenanceIds.has(provId)) {
        issues.push({
          code: "MISSING_PROVENANCE_REFERENCE",
          severity: "error",
          writeset_id: writeset.writeset_id,
          claim_id: claim.claim_id,
          provenance_id: provId,
          message: `Claim references provenance not present in writeset: ${provId}`,
        });
      }
    }
  }

  return issues;
}

export function detectDuplicateBatchSignatures(writesets: WriteSet[]): SemanticIssue[] {
  const seen = new Map<string, string>();
  const issues: SemanticIssue[] = [];

  for (const ws of writesets) {
    if (!ws.batch_signature) continue;

    const existing = seen.get(ws.batch_signature);
    if (existing) {
      issues.push({
        code: "DUPLICATE_BATCH_SIGNATURE",
        severity: "error",
        writeset_id: ws.writeset_id,
        message: `Duplicate batch_signature detected. First seen in ${existing}, repeated in ${ws.writeset_id}`,
        details: {
          batch_signature: ws.batch_signature,
          first_writeset_id: existing,
          duplicate_writeset_id: ws.writeset_id,
        },
      });
    } else {
      seen.set(ws.batch_signature, ws.writeset_id);
    }
  }

  return issues;
}

export function validateLedgerSemanticRules(writesets: WriteSet[]): SemanticValidationResult {
  const issues = [
    ...writesets.flatMap(validateWriteSetSemanticRules),
    ...detectDuplicateBatchSignatures(writesets),
  ];

  return {
    ok: issues.every((i) => i.severity !== "error"),
    issues,
  };
}
