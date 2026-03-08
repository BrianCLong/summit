"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalsPage = ApprovalsPage;
const react_1 = require("react");
const ApprovalDetails_1 = require("./ApprovalDetails");
const ApprovalsList_1 = require("./ApprovalsList");
const AuditTimeline_1 = require("./AuditTimeline");
const mockData_1 = require("./mockData");
function hydrateRequest(base, nextAction) {
    const approvals = [...base.approvals, nextAction];
    const nextStatus = nextAction.statusOverride ??
        (nextAction.decision === 'denied' ? 'denied' : base.status);
    const timelineEntry = {
        id: `timeline-${nextAction.id}`,
        correlationId: base.correlationId,
        type: nextAction.decision === 'approved' ? 'approval' : 'denial',
        title: nextAction.decision === 'approved'
            ? 'Approval recorded'
            : 'Denial recorded',
        description: nextAction.rationale,
        actor: nextAction.actor,
        timestamp: nextAction.timestamp,
        tags: ['abac'],
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
function ApprovalsPage() {
    const [requests, setRequests] = (0, react_1.useState)(mockData_1.approvalsData);
    const [selectedId, setSelectedId] = (0, react_1.useState)(requests[0]?.id ?? null);
    const selectedRequest = (0, react_1.useMemo)(() => requests.find((r) => r.id === selectedId) ?? null, [requests, selectedId]);
    function recordDecision(action) {
        setRequests((prev) => prev.map((req) => req.id === selectedId ? hydrateRequest(req, action) : req));
    }
    return (<div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem' }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Approvals</h2>
        <ApprovalsList_1.ApprovalsList requests={requests} selectedId={selectedId} onSelect={(id) => setSelectedId(id)}/>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {selectedRequest ? (<>
            <ApprovalDetails_1.ApprovalDetails request={selectedRequest} user={mockData_1.demoUser} onDecision={recordDecision}/>
            <AuditTimeline_1.AuditTimeline events={selectedRequest.timeline} correlationId={selectedRequest.correlationId}/>
          </>) : (<p>Select a request to view details</p>)}
      </div>
    </div>);
}
