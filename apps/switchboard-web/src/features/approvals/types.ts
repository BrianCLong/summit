export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
    id: string;
    requester_id: string;
    approver_id?: string | null;
    status: ApprovalStatus;
    action?: string | null;
    payload?: Record<string, any> | null;
    reason?: string | null;
    decision_reason?: string | null;
    run_id?: string | null;
    created_at: string;
    updated_at: string;
    resolved_at?: string | null;
}

export interface ApprovalsResponse {
    approvals: Approval[];
}

export interface ApprovalActionResult {
    approval: Approval;
    actionResult?: any;
}

export interface SwitchboardApiError extends Error {
    status?: number;
}
