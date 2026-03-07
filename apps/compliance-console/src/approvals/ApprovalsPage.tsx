import { useMemo, useState } from "react";
import { ApprovalDetails } from "./ApprovalDetails";
import { ApprovalsList } from "./ApprovalsList";
import { AuditTimeline } from "./AuditTimeline";
import { approvalsData, demoUser } from "./mockData";
import { ApprovalRequest, AuditEvent, DecisionAction } from "./types";

function hydrateRequest(base: ApprovalRequest, nextAction: DecisionAction): ApprovalRequest {
  const approvals = [...base.approvals, nextAction];
  const nextStatus =
    nextAction.statusOverride ?? (nextAction.decision === "denied" ? "denied" : base.status);
  const timelineEntry: AuditEvent = {
    id: `timeline-${nextAction.id}`,
    correlationId: base.correlationId,
    type: nextAction.decision === "approved" ? "approval" : "denial",
    title: nextAction.decision === "approved" ? "Approval recorded" : "Denial recorded",
    description: nextAction.rationale,
    actor: nextAction.actor,
    timestamp: nextAction.timestamp,
    tags: ["abac"],
  };

  return {
    ...base,
    approvals,
    status: nextStatus,
    timeline: [...base.timeline, timelineEntry],
  };
}

/**
 * Composite page that renders approvals list, detail, and audit timeline.
 */
export function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(approvalsData);
  const [selectedId, setSelectedId] = useState<string | null>(requests[0]?.id ?? null);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId]
  );

  function recordDecision(action: DecisionAction) {
    setRequests((prev) =>
      prev.map((req) => (req.id === selectedId ? hydrateRequest(req, action) : req))
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1rem" }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Approvals</h2>
        <ApprovalsList
          requests={requests}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {selectedRequest ? (
          <>
            <ApprovalDetails
              request={selectedRequest}
              user={demoUser}
              onDecision={recordDecision}
            />
            <AuditTimeline
              events={selectedRequest.timeline}
              correlationId={selectedRequest.correlationId}
            />
          </>
        ) : (
          <p>Select a request to view details</p>
        )}
      </div>
    </div>
  );
}
