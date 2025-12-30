import {
  DualControlApprovalRecord,
  getDualControlState,
  upsertDualControlApproval,
} from '../db/models/approvals.js';

export interface ApprovalActorInput {
  user_id: string;
  role?: string;
  tenant_id?: string;
  attributes?: Record<string, unknown>;
  reason?: string;
}

export interface DualControlRequirement {
  requestId: string;
  action: string;
  tenantId: string;
  requesterId: string;
  requiredApprovals: number;
  requiredRoles?: string[];
  allowedRoles?: string[];
  approvals: ApprovalActorInput[];
}

export interface DualControlValidationResult {
  satisfied: boolean;
  violations: string[];
  recordedApprovals: number;
  state?: Awaited<ReturnType<typeof getDualControlState>>;
}

const DEFAULT_ALLOWED_ROLES = [
  'admin',
  'compliance-officer',
  'security-admin',
];

const DEFAULT_REQUIRED_ROLES = ['compliance-officer'];

export const normalizeApprovalActors = (
  approvals?: Array<string | ApprovalActorInput>,
): ApprovalActorInput[] => {
  if (!approvals) {return [];}

  return approvals.map((approval) =>
    typeof approval === 'string' ? { user_id: approval } : approval,
  );
};

export async function validateDualControlRequirement(
  requirement: DualControlRequirement,
): Promise<DualControlValidationResult> {
  const violations: string[] = [];
  const approverIds = new Set<string>();
  const allowedRoles =
    requirement.allowedRoles && requirement.allowedRoles.length
      ? requirement.allowedRoles
      : DEFAULT_ALLOWED_ROLES;
  const requiredRoles =
    requirement.requiredRoles && requirement.requiredRoles.length
      ? requirement.requiredRoles
      : DEFAULT_REQUIRED_ROLES;

  if (requirement.approvals.length < requirement.requiredApprovals) {
    violations.push(
      `At least ${requirement.requiredApprovals} approvals are required`,
    );
  }

  for (const approval of requirement.approvals) {
    if (approval.user_id === requirement.requesterId) {
      violations.push('Requester cannot self-approve sensitive actions');
    }

    if (approverIds.has(approval.user_id)) {
      violations.push('Dual control requires distinct approvers');
    } else {
      approverIds.add(approval.user_id);
    }

    if (!approval.role) {
      violations.push('Approver role must be provided for dual control');
    } else if (!allowedRoles.includes(approval.role)) {
      violations.push(`Approver role ${approval.role} is not permitted`);
    }

    const approvalTenant =
      approval.tenant_id || (approval.attributes as any)?.tenant_id;
    if (approvalTenant && approvalTenant !== requirement.tenantId) {
      violations.push('Approver must belong to the same tenant context');
    }
  }

  for (const role of requiredRoles) {
    if (!requirement.approvals.some((approval) => approval.role === role)) {
      violations.push(`At least one ${role} approval is required`);
    }
  }

  if (violations.length > 0) {
    return {
      satisfied: false,
      violations,
      recordedApprovals: 0,
    };
  }

  const persisted: Promise<DualControlApprovalRecord>[] = [];

  for (const approval of requirement.approvals) {
    persisted.push(
      upsertDualControlApproval({
        runId: requirement.requestId,
        stepId: requirement.action,
        userId: approval.user_id,
        verdict: 'approved',
        reason: approval.reason,
        role: approval.role,
        attributes: {
          ...(approval.attributes || {}),
          tenant_id: approval.tenant_id || requirement.tenantId,
        },
      }),
    );
  }

  await Promise.all(persisted);
  const state = await getDualControlState(
    requirement.requestId,
    requirement.action,
  );
  const satisfied =
    state.distinctApprovers >= requirement.requiredApprovals &&
    state.declinations === 0;

  return {
    satisfied,
    violations,
    recordedApprovals: state.approvalsCount,
    state,
  };
}
