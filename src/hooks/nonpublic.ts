import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type NonPublicRequest = {
  tool_name: string;
  source_id: string;
  scope: string;
  purpose: string;
  retention_days: number;
  approval_id?: string;
};

export type NonPublicPolicyRule = {
  tool_name: string;
  source_id: string;
  scope: string;
  purpose: string;
  retention_days_max: number;
  approval_required: boolean;
};

export type NonPublicPolicy = {
  version: string;
  rules: NonPublicPolicyRule[];
};

export type PolicyDecision = {
  allow: boolean;
  reason: string;
  matched_rule_id?: string;
  denied_fields?: string[];
};

export type AuditRecord = {
  tool_name: string;
  source_id: string;
  scope: string;
  purpose: string;
  retention_days: number;
  decision: 'allow' | 'deny';
  reason: string;
};

export type ProvenanceRecord = {
  source_id: string;
  tool_name: string;
  fields: Array<{
    field: string;
    sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    provenance: string;
  }>;
};

export type ApprovalRequest = {
  approval_id: string;
  nonce: string;
  source_id: string;
  scope: string;
  purpose: string;
  retention_days: number;
  tool_name: string;
};

export type ApprovalGrant = {
  approval_id: string;
  nonce: string;
  signature: string;
};

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableSort(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableSort((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableSort(value), null, 2);
}

function hashSignature(payload: Omit<ApprovalRequest, 'approval_id'>, secret: string): string {
  return createHash('sha256')
    .update(`${payload.nonce}:${payload.source_id}:${payload.scope}:${payload.purpose}:${payload.retention_days}:${payload.tool_name}:${secret}`)
    .digest('hex');
}

export function evaluateNonPublicPolicy(
  request: NonPublicRequest,
  policy: NonPublicPolicy,
): PolicyDecision {
  const matched = policy.rules.find(
    (rule) =>
      rule.tool_name === request.tool_name &&
      rule.source_id === request.source_id &&
      rule.scope === request.scope,
  );

  if (!matched) {
    return {
      allow: false,
      reason: 'deny_by_default',
      denied_fields: ['source_id', 'scope', 'tool_name'],
    };
  }

  const deniedFields: string[] = [];
  if (matched.purpose !== request.purpose) {
    deniedFields.push('purpose');
  }
  if (request.retention_days > matched.retention_days_max || request.retention_days <= 0) {
    deniedFields.push('retention_days');
  }
  if (matched.approval_required && !request.approval_id) {
    deniedFields.push('approval');
  }

  if (deniedFields.length > 0) {
    return {
      allow: false,
      reason: 'policy_mismatch',
      matched_rule_id: `${matched.source_id}:${matched.scope}`,
      denied_fields: deniedFields,
    };
  }

  return {
    allow: true,
    reason: 'policy_match',
    matched_rule_id: `${matched.source_id}:${matched.scope}`,
  };
}

export async function emitDeterministicArtifacts(args: {
  artifacts_dir: string;
  run_id: string;
  policy_decision: PolicyDecision;
  audit: AuditRecord;
  provenance: ProvenanceRecord;
  approval_request?: ApprovalRequest;
  approval_grant?: ApprovalGrant;
}): Promise<void> {
  const runDir = path.join(args.artifacts_dir, args.run_id);
  await mkdir(runDir, { recursive: true });

  const writes: Array<Promise<void>> = [
    writeFile(path.join(runDir, 'policy_decision.json'), stableStringify(args.policy_decision)),
    writeFile(path.join(runDir, 'audit.json'), stableStringify(args.audit)),
    writeFile(path.join(runDir, 'provenance.json'), stableStringify(args.provenance)),
  ];

  if (args.approval_request) {
    writes.push(
      writeFile(path.join(runDir, 'approval_request.json'), stableStringify(args.approval_request)),
    );
  }

  if (args.approval_grant) {
    writes.push(writeFile(path.join(runDir, 'approval_grant.json'), stableStringify(args.approval_grant)));
  }

  await Promise.all(writes);
}

export function buildApprovalRequest(request: NonPublicRequest): ApprovalRequest {
  return {
    approval_id: request.approval_id ?? `apr-${randomUUID()}`,
    nonce: randomUUID(),
    purpose: request.purpose,
    retention_days: request.retention_days,
    scope: request.scope,
    source_id: request.source_id,
    tool_name: request.tool_name,
  };
}

export function buildApprovalGrant(
  approvalRequest: ApprovalRequest,
  signerSecret: string,
): ApprovalGrant {
  const signature = hashSignature(
    {
      nonce: approvalRequest.nonce,
      source_id: approvalRequest.source_id,
      scope: approvalRequest.scope,
      purpose: approvalRequest.purpose,
      retention_days: approvalRequest.retention_days,
      tool_name: approvalRequest.tool_name,
    },
    signerSecret,
  );

  return {
    approval_id: approvalRequest.approval_id,
    nonce: approvalRequest.nonce,
    signature,
  };
}

export function validateApprovalGrant(args: {
  approval_request: ApprovalRequest;
  approval_grant: ApprovalGrant;
  signer_secret: string;
}): boolean {
  if (args.approval_request.approval_id !== args.approval_grant.approval_id) {
    return false;
  }

  if (args.approval_request.nonce !== args.approval_grant.nonce) {
    return false;
  }

  const expectedSignature = hashSignature(
    {
      nonce: args.approval_request.nonce,
      source_id: args.approval_request.source_id,
      scope: args.approval_request.scope,
      purpose: args.approval_request.purpose,
      retention_days: args.approval_request.retention_days,
      tool_name: args.approval_request.tool_name,
    },
    args.signer_secret,
  );

  return args.approval_grant.signature === expectedSignature;
}
