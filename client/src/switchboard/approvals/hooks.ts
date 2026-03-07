import { useCallback, useEffect, useMemo, useState } from "react";
import type { AbacState, ApprovalRecord, ApprovalStatus, AuditEvent } from "./types";

type GraphQLResponse<T> = { data?: T; errors?: { message?: string }[] };

const APPROVALS_QUERY = `
  query Approvals {
    approvals {
      id
      requester_id
      approver_id
      action
      status
      reason
      decision_reason
      run_id
      created_at
      approvalsRequired
      approvalsCompleted
      requiresDualControl
      claims
      auditTrail {
        id
        kind
        actor
        message
        at
        status
      }
    }
  }
`;

const APPROVAL_QUERY = `
  query Approval($id: ID!) {
    approval(id: $id) {
      id
      requester_id
      approver_id
      action
      status
      reason
      decision_reason
      run_id
      created_at
      approvalsRequired
      approvalsCompleted
      requiresDualControl
      claims
      auditTrail {
        id
        kind
        actor
        message
        at
        status
      }
    }
  }
`;

const CLAIMS_QUERY = `
  query Claims {
    viewer {
      claims
    }
  }
`;

const fallbackApprovals: ApprovalRecord[] = [
  {
    id: "ap-001",
    requester: "analyst.ops",
    approver: null,
    action: "quarantine-segment",
    status: "pending",
    reason: "Isolate workload to investigate telemetry spike",
    runId: "run-4488",
    createdAt: new Date().toISOString(),
    approvalsCompleted: 0,
    approvalsRequired: 2,
    requiresDualControl: true,
    claims: ["approval:review", "approval:dual-control"],
    auditTrail: [
      {
        id: "preflight-1",
        kind: "preflight",
        actor: "system",
        message: "Preflight checks completed (latency, blast-radius, rollback)",
        at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        status: "success",
      },
      {
        id: "approval-1",
        kind: "approval",
        actor: "analyst.ops",
        message: "Approval requested with justification",
        at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
        status: "info",
      },
    ],
  },
  {
    id: "ap-002",
    requester: "fusion.team",
    approver: null,
    action: "ship-disclosure",
    status: "pending",
    reason: "Send disclosure pack to regulator",
    runId: "run-4490",
    createdAt: new Date().toISOString(),
    approvalsCompleted: 1,
    approvalsRequired: 1,
    requiresDualControl: false,
    claims: ["approval:review"],
    auditTrail: [
      {
        id: "preflight-2",
        kind: "preflight",
        actor: "system",
        message: "Preflight validated encryption + recipients",
        at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        status: "success",
      },
      {
        id: "approval-2",
        kind: "approval",
        actor: "fusion.team",
        message: "Disclosure export blocked pending approval",
        at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        status: "warning",
      },
    ],
  },
];

async function fetchGraphQL<T>(query: string, variables?: Record<string, unknown>) {
  const res = await fetch("/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL request failed (${res.status})`);
  }
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }
  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }
  return json.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeApproval(raw: any): ApprovalRecord {
  return {
    id: raw.id,
    requester: raw.requester_id ?? raw.requester ?? "unknown",
    approver: raw.approver_id ?? raw.approver ?? null,
    action: raw.action ?? "unknown",
    status: (raw.status as ApprovalStatus) ?? "pending",
    reason: raw.reason ?? raw.justification ?? "",
    decisionReason: raw.decision_reason ?? raw.decisionReason ?? null,
    runId: raw.run_id ?? raw.runId ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    approvalsRequired: Number(raw.approvalsRequired ?? raw.required ?? 1),
    approvalsCompleted: Number(raw.approvalsCompleted ?? raw.completed ?? 0),
    requiresDualControl:
      Boolean(raw.requiresDualControl) || Number(raw.approvalsRequired ?? raw.required ?? 1) > 1,
    claims: Array.isArray(raw.claims) ? raw.claims : [],
    auditTrail: raw.auditTrail,
  };
}

async function loadGraphQLApprovals(): Promise<ApprovalRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await fetchGraphQL<{ approvals: any[] }>(APPROVALS_QUERY);
  return (data.approvals || []).map(normalizeApproval);
}

async function loadRestApprovals(): Promise<ApprovalRecord[]> {
  const res = await fetch("/api/approvals");
  if (!res.ok) {
    throw new Error("REST approvals request failed");
  }
  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  return list.map(normalizeApproval);
}

async function loadApproval(id: string): Promise<ApprovalRecord | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gql = await fetchGraphQL<{ approval: any }>(APPROVAL_QUERY, { id });
    if (gql.approval) return normalizeApproval(gql.approval);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // GraphQL is optional; fall back to REST
  }

  try {
    const res = await fetch(`/api/approvals/${id}`);
    if (res.ok) {
      const json = await res.json();
      return normalizeApproval(json?.data ?? json);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // Silent fallback to cached/fallback data
  }
  return null;
}

async function loadClaims(): Promise<string[]> {
  try {
    const data = await fetchGraphQL<{ viewer?: { claims?: string[] } }>(CLAIMS_QUERY);
    if (data.viewer?.claims?.length) return data.viewer.claims;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // continue to REST
  }

  try {
    const res = await fetch("/api/auth/claims");
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.claims)) return json.claims;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // continue to fallback
  }

  return ["approval:review", "approval:dual-control"];
}

export function useApprovalsData() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadGraphQLApprovals().catch(async () => loadRestApprovals());
      setApprovals(data.length ? data : fallbackApprovals);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setApprovals(fallbackApprovals);
      setError(err?.message ?? "Unable to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { approvals, loading, error, refresh };
}

export function useAbacClaims(requiredClaims: string[]): AbacState {
  const [claims, setClaims] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = await loadClaims();
      setClaims(resolved);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setClaims([]);
      setError(err?.message ?? "Unable to resolve ABAC claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allowed = useMemo(
    () => requiredClaims.every((claim) => claims.includes(claim)),
    [claims, requiredClaims]
  );

  return { claims, loading, allowed, error, refresh };
}

export function useApprovalDetails(
  approvalId: string | null,
  approvals: ApprovalRecord[]
): {
  detail: ApprovalRecord | null;
  timeline: AuditEvent[];
  loading: boolean;
} {
  const [detail, setDetail] = useState<ApprovalRecord | null>(null);
  const [timeline, setTimeline] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const next = async () => {
      if (!approvalId) {
        setDetail(null);
        setTimeline([]);
        return;
      }
      setLoading(true);
      const cached = approvals.find((item) => item.id === approvalId) ?? null;
      const latest = (await loadApproval(approvalId)) || cached;
      if (!active) return;
      const resolved = latest ?? cached;
      setDetail(resolved ?? null);
      const events: AuditEvent[] =
        resolved?.auditTrail?.length && Array.isArray(resolved.auditTrail)
          ? resolved.auditTrail
          : buildDefaultTimeline(resolved);
      setTimeline(events);
      setLoading(false);
    };
    next();
    return () => {
      active = false;
    };
  }, [approvalId, approvals]);

  return { detail, timeline, loading };
}

function buildDefaultTimeline(detail?: ApprovalRecord | null): AuditEvent[] {
  if (!detail) return [];
  const baseTime = new Date(detail.createdAt || Date.now()).getTime();
  return [
    {
      id: `${detail.id}-preflight`,
      kind: "preflight",
      actor: "system",
      message: "Preflight checks completed",
      at: new Date(baseTime).toISOString(),
      status: "success",
    },
    {
      id: `${detail.id}-approval`,
      kind: "approval",
      actor: detail.requester,
      message: detail.reason || "Approval requested",
      at: new Date(baseTime + 2 * 60 * 1000).toISOString(),
      status: "info",
    },
    {
      id: `${detail.id}-execution`,
      kind: "execution",
      actor: "orchestrator",
      message: "Execution pending approval",
      at: new Date(baseTime + 4 * 60 * 1000).toISOString(),
      status: "warning",
    },
    {
      id: `${detail.id}-receipt`,
      kind: "receipt",
      actor: "audit-ledger",
      message: "Receipt will be emitted after execution",
      at: new Date(baseTime + 6 * 60 * 1000).toISOString(),
      status: "info",
    },
  ];
}

export async function submitDecision(
  approval: ApprovalRecord,
  action: "approve" | "deny",
  rationale: string
): Promise<{ status: ApprovalStatus; approvalsCompleted: number }> {
  const payload = {
    id: approval.id,
    reason: rationale,
    dualControl: approval.requiresDualControl,
    action,
  };

  try {
    const gql = await fetchGraphQL<{
      decideApproval?: { status?: ApprovalStatus; approvalsCompleted?: number };
    }>(
      `
        mutation DecideApproval($id: ID!, $action: String!, $reason: String!, $dualControl: Boolean!) {
          decideApproval(id: $id, action: $action, reason: $reason, dualControl: $dualControl) {
            status
            approvalsCompleted
          }
        }
      `,
      payload
    );
    if (gql.decideApproval) {
      return {
        status: (gql.decideApproval.status as ApprovalStatus) || action,
        approvalsCompleted:
          gql.decideApproval.approvalsCompleted ?? approval.approvalsCompleted + 1,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // Intentionally fall back to REST
  }

  const res = await fetch(`/api/approvals/${approval.id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Decision failed");
  }
  const json = await res.json().catch(() => ({}));
  return {
    status: (json.status as ApprovalStatus) || action,
    approvalsCompleted: json.approvalsCompleted ?? approval.approvalsCompleted + 1,
  };
}
