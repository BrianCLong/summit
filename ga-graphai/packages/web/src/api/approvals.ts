import { Approval, ApprovalStatus, PolicySimulationResult, Receipt } from "./types.js";

export type ApprovalFilter = {
  status?: ApprovalStatus;
  tenantId?: string;
  operation?: string;
  riskTier?: string;
  page?: number;
  pageSize?: number;
};

interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchApprovals(filters: ApprovalFilter): Promise<PagedResult<Approval>> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.tenantId) params.set("tenantId", filters.tenantId);
  if (filters.operation) params.set("operation", filters.operation);
  if (filters.riskTier) params.set("riskTier", filters.riskTier);
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.pageSize != null) params.set("pageSize", String(filters.pageSize));

  const res = await fetch(`/api/approvals?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load approvals");
  return res.json();
}

export async function fetchApproval(id: string): Promise<Approval> {
  const res = await fetch(`/api/approvals/${id}`);
  if (!res.ok) throw new Error("Failed to load approval");
  return res.json();
}

export async function decideApproval(
  id: string,
  decision: "APPROVED" | "REJECTED",
  rationale: string
): Promise<Approval> {
  const res = await fetch(`/api/approvals/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, rationale }),
  });
  if (!res.ok) throw new Error("Failed to submit decision");
  return res.json();
}

export async function simulatePolicy(
  operation: string,
  attributes: Record<string, any>
): Promise<PolicySimulationResult> {
  const res = await fetch(`/api/policy/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, attributes }),
  });
  if (!res.ok) throw new Error("Policy simulation failed");
  return res.json();
}

export async function fetchReceipt(id: string): Promise<Receipt> {
  const res = await fetch(`/api/receipts/${id}`);
  if (!res.ok) throw new Error("Failed to load receipt");
  return res.json();
}
