import { useMemo, useState } from "react";
import { abacDecision } from "./abac";
import { ApprovalRequest, Decision, DecisionAction, UserContext } from "./types";

type Props = {
  request: ApprovalRequest;
  user: UserContext;
  onDecision: (action: DecisionAction) => void;
};

/**
 * Detailed view for a single approval request with ABAC-enforced decision actions.
 */
export function ApprovalDetails({ request, user, onDecision }: Props) {
  const [rationale, setRationale] = useState("Approved with ABAC permit");

  const existingApprovalByUser = useMemo(
    () => request.approvals.find((a) => a.actor === user.id),
    [request.approvals, user.id]
  );

  function handleDecision(decision: Decision) {
    const evaluation = abacDecision(user, request, decision);
    if (!evaluation.allowed) {
      onDecision({
        id: crypto.randomUUID(),
        actor: user.id,
        role: user.role,
        decision: "denied",
        rationale: evaluation.reason ?? "Denied by ABAC",
        timestamp: new Date().toISOString(),
        correlationId: request.correlationId,
        statusOverride: "denied",
      });
      return;
    }

    const isDualPending = request.dualControl && request.status !== "approved";
    const dualStatus = decision === "deny" ? "denied" : isDualPending ? "waiting_dual" : "approved";

    onDecision({
      id: crypto.randomUUID(),
      actor: user.id,
      role: user.role,
      decision: decision === "approve" ? "approved" : "denied",
      rationale,
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId,
      statusOverride: dualStatus,
    });
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", padding: "1rem", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Request details</h3>
      <p style={{ margin: "0 0 0.4rem 0" }}>
        <strong>{request.title}</strong>
      </p>
      <p style={{ margin: "0 0 0.4rem 0", color: "#4b5563" }}>
        Service: {request.service} · Risk: {request.riskLevel.toUpperCase()} · Status:{" "}
        {request.status}
      </p>
      <p style={{ margin: "0 0 0.4rem 0", color: "#4b5563" }}>
        Tenant: {request.attributes.tenant} · Region: {request.attributes.region}
      </p>
      <p style={{ margin: "0 0 0.4rem 0", color: "#4b5563" }}>
        Sensitivity: {request.attributes.sensitivity} · Dual control:{" "}
        {request.dualControl ? "Enabled" : "Disabled"}
      </p>

      <label style={{ display: "block", margin: "0.75rem 0 0.35rem 0", fontWeight: 600 }}>
        Rationale
      </label>
      <textarea
        aria-label="rationale"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        style={{ width: "100%", minHeight: 80, padding: "0.5rem", borderRadius: 6 }}
      />

      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => handleDecision("approve")}
          disabled={Boolean(existingApprovalByUser)}
          style={{
            padding: "0.5rem 0.85rem",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: existingApprovalByUser ? "not-allowed" : "pointer",
          }}
        >
          Approve
        </button>
        <button
          onClick={() => handleDecision("deny")}
          disabled={Boolean(existingApprovalByUser)}
          style={{
            padding: "0.5rem 0.85rem",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: existingApprovalByUser ? "not-allowed" : "pointer",
          }}
        >
          Deny
        </button>
      </div>

      {existingApprovalByUser && (
        <p style={{ marginTop: "0.75rem", color: "#10b981" }}>
          You have already submitted a decision: {existingApprovalByUser.decision}
        </p>
      )}
    </div>
  );
}
