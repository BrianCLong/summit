export interface Approval {
  id: string;
  requester_id: string;
  approver_id?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  action?: string | null;
  payload?: any | null;
  reason?: string | null;
  decision_reason?: string | null;
  run_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

const API_BASE = '/api/approvals';

export async function getPendingApprovals(): Promise<Approval[]> {
  const response = await fetch(`${API_BASE}?status=pending`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch approvals: ${errorText}`);
  }
  return response.json();
}

export async function approveRequest(id: string, reason?: string): Promise<Approval> {
  const response = await fetch(`${API_BASE}/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to approve request: ${errorText}`);
  }
  return response.json();
}

export async function rejectRequest(id: string, reason?: string): Promise<Approval> {
  const response = await fetch(`${API_BASE}/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to reject request: ${errorText}`);
  }
  return response.json();
}
