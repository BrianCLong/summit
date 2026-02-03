import { ApprovalActionResult, Approval, SwitchboardApiError } from './types';

const API_BASE = '/api/approvals';

async function parseError(response: Response): Promise<SwitchboardApiError> {
    let body: any;
    try {
        body = await response.json();
    } catch (error) {
        body = undefined;
    }

    const error = new Error(
        body?.error ?? body?.message ?? `Request failed with status ${response.status}`,
    ) as SwitchboardApiError;

    error.status = response.status;
    return error;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw await parseError(response);
    }

    return (await response.json()) as T;
}

export function fetchApprovals(status?: string): Promise<Approval[]> {
    const query = status ? `?status=${status}` : '';
    return request<Approval[]>(`/${query}`);
}

export function approveApproval(id: string, reason?: string): Promise<ApprovalActionResult> {
    return request<ApprovalActionResult>(`/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

export function rejectApproval(id: string, reason?: string): Promise<ApprovalActionResult> {
    return request<ApprovalActionResult>(`/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}
