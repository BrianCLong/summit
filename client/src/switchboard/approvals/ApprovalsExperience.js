"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ApprovalsExperience;
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_1 = require("react");
const AuditTimeline_1 = require("./AuditTimeline");
const hooks_1 = require("./hooks");
const REQUIRED_CLAIMS = ['approval:review'];
const statusColor = {
    pending: 'info',
    awaiting_second: 'warning',
    approved: 'success',
    denied: 'error',
    escalated: 'warning',
};
function ApprovalsExperience() {
    const { approvals, loading, error, refresh } = (0, hooks_1.useApprovalsData)();
    const [selectedId, setSelectedId] = (0, react_1.useState)(null);
    const [rationale, setRationale] = (0, react_1.useState)('');
    const [formError, setFormError] = (0, react_1.useState)(null);
    const [banner, setBanner] = (0, react_1.useState)(null);
    const [optimisticStatuses, setOptimisticStatuses] = (0, react_1.useState)({});
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const displayApprovals = (0, react_1.useMemo)(() => approvals.map((item) => optimisticStatuses[item.id]
        ? { ...item, status: optimisticStatuses[item.id] }
        : item), [approvals, optimisticStatuses]);
    (0, react_1.useEffect)(() => {
        if (!selectedId && displayApprovals.length) {
            setSelectedId(displayApprovals[0].id);
        }
    }, [displayApprovals, selectedId]);
    const { detail, timeline, loading: detailLoading } = (0, hooks_1.useApprovalDetails)(selectedId, displayApprovals);
    const abac = (0, hooks_1.useAbacClaims)(REQUIRED_CLAIMS);
    const requiresDualClaim = detail?.requiresDualControl ?? false;
    const hasDualClaim = abac.claims.includes('approval:dual-control');
    const handleDecision = async (action) => {
        if (!detail)
            return;
        const trimmed = rationale.trim();
        if (trimmed.length < 8) {
            setFormError('Add a rationale with at least 8 characters to satisfy audit policy.');
            return;
        }
        if (requiresDualClaim && !hasDualClaim) {
            setFormError('Dual-control is enforced and your ABAC claims do not allow approvals.');
            return;
        }
        setFormError(null);
        setSubmitting(true);
        try {
            const result = await (0, hooks_1.submitDecision)(detail, action, trimmed);
            const approvalsRemaining = (detail.approvalsRequired || 1) -
                (result.approvalsCompleted || detail.approvalsCompleted || 0);
            const needsPartner = detail.requiresDualControl && approvalsRemaining > 0;
            const nextStatus = needsPartner && action === 'approve'
                ? 'awaiting_second'
                : result.status || action;
            setOptimisticStatuses((prev) => ({ ...prev, [detail.id]: nextStatus }));
            setBanner(needsPartner
                ? 'Dual-control enforced: awaiting co-signer before execution.'
                : 'Decision recorded and propagated to the workflow.');
            setRationale('');
            await refresh();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            setFormError(err?.message || 'Unable to submit decision');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (abac.loading) {
        return (<material_1.Stack direction="row" alignItems="center" spacing={1} sx={{ p: 3 }}>
        <material_1.CircularProgress size={18}/>
        <material_1.Typography variant="body2">Resolving ABAC claims…</material_1.Typography>
      </material_1.Stack>);
    }
    if (!abac.allowed) {
        return (<material_1.Alert severity="warning" icon={<icons_material_1.ErrorOutline fontSize="inherit"/>} sx={{ borderRadius: 2, border: '1px solid hsl(var(--stroke-strong))' }}>
        You are missing the required ABAC claims ({REQUIRED_CLAIMS.join(', ')}) to review approvals. Request access or escalate to a privileged reviewer.
      </material_1.Alert>);
    }
    return (<material_1.Box sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
            backgroundColor: 'hsl(var(--surface-subtle))',
            p: 2,
            borderRadius: 2,
            border: '1px solid hsl(var(--stroke-strong))',
        }}>
      <material_1.Stack spacing={1.5}>
        <material_1.Stack direction="row" alignItems="center" justifyContent="space-between">
          <material_1.Stack spacing={0.5}>
            <material_1.Typography variant="h6">Approvals queue</material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              ABAC-guarded switchboard for preflighted changes and disclosures.
            </material_1.Typography>
          </material_1.Stack>
          <material_1.Button size="small" variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={() => refresh()} disabled={loading}>
            Refresh
          </material_1.Button>
        </material_1.Stack>

        {banner ? (<material_1.Alert severity="info" onClose={() => setBanner(null)} icon={<icons_material_1.Gavel fontSize="inherit"/>}>
            {banner}
          </material_1.Alert>) : null}
        {error ? (<material_1.Alert severity="error" icon={<icons_material_1.ErrorOutline fontSize="inherit"/>}>
            {error}
          </material_1.Alert>) : null}

        <material_1.Card variant="outlined" sx={{
            backgroundColor: 'hsl(var(--surface-elevated))',
            borderColor: 'hsl(var(--stroke-strong))',
        }}>
          <material_1.CardContent sx={{ p: 0 }}>
            <material_1.List dense disablePadding>
              {displayApprovals.map((item) => {
            const secondary = item.requiresDualControl && !hasDualClaim
                ? 'Dual control enforced • approval guarded'
                : item.reason || 'No description';
            return (<material_1.ListItemButton key={item.id} selected={item.id === selectedId} onClick={() => setSelectedId(item.id)} sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.5 }}>
                    <material_1.Chip size="small" label={item.status.replace('_', ' ')} color={statusColor[item.status] || 'info'}/>
                    <material_1.ListItemText primary={<material_1.Stack direction="row" spacing={0.75} alignItems="center">
                          <material_1.Typography variant="body1" fontWeight={600}>
                            {item.action}
                          </material_1.Typography>
                          {item.requiresDualControl ? (<material_1.Tooltip title="Dual-control enforced">
                              <icons_material_1.LockClock fontSize="small" color="warning"/>
                            </material_1.Tooltip>) : null}
                        </material_1.Stack>} secondary={<material_1.Typography variant="body2" color="text.secondary">
                          Run {item.runId || 'n/a'} • Requested by {item.requester} •{' '}
                          {secondary}
                        </material_1.Typography>}/>
                  </material_1.ListItemButton>);
        })}
              {!displayApprovals.length && (<material_1.Box sx={{ p: 2 }}>
                  <material_1.Alert severity="success" icon={<icons_material_1.CheckCircle fontSize="inherit"/>}>
                    Queue is clear. No pending approvals.
                  </material_1.Alert>
                </material_1.Box>)}
            </material_1.List>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Stack>

      <material_1.Card variant="outlined" sx={{
            backgroundColor: 'hsl(var(--surface-elevated))',
            borderColor: 'hsl(var(--stroke-strong))',
        }}>
        <material_1.CardContent>
          {detailLoading ? (<material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <material_1.CircularProgress size={18}/>
              <material_1.Typography variant="body2">Loading approval detail…</material_1.Typography>
            </material_1.Stack>) : null}
          {detail ? (<material_1.Stack spacing={1.5}>
              <material_1.Stack direction="row" spacing={1} alignItems="center">
                <material_1.Chip size="small" label={detail.status.replace('_', ' ')} color={statusColor[detail.status] || 'info'}/>
                <material_1.Chip size="small" variant="outlined" label={`Run ${detail.runId || 'n/a'}`}/>
                <material_1.Chip size="small" variant="outlined" label={detail.action}/>
              </material_1.Stack>
              <material_1.Typography variant="h6">{detail.reason || 'Approval detail'}</material_1.Typography>
              <material_1.Typography variant="body2" color="text.secondary">
                Requested by <strong>{detail.requester}</strong>{' '}
                {detail.createdAt ? `on ${new Date(detail.createdAt).toLocaleString()}` : ''}
              </material_1.Typography>
              <material_1.Stack direction="row" spacing={1}>
                <material_1.Chip size="small" label={`Approvals ${detail.approvalsCompleted}/${detail.approvalsRequired}`} color={detail.approvalsCompleted >= detail.approvalsRequired ? 'success' : 'default'}/>
                {detail.requiresDualControl ? (<material_1.Chip size="small" icon={<icons_material_1.LockClock fontSize="small"/>} label="Dual-control" color={hasDualClaim ? 'warning' : 'default'}/>) : null}
              </material_1.Stack>

              <material_1.Divider />

              <material_1.Stack spacing={1}>
                <material_1.Typography variant="subtitle2">Decision</material_1.Typography>
                <material_1.TextField label="Rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Document why you are approving or denying" multiline minRows={3} error={Boolean(formError)} helperText={formError || 'Required for audit and dual-control workflows'}/>
                <material_1.Stack direction="row" spacing={1}>
                  <material_1.Button variant="contained" color="success" startIcon={<icons_material_1.CheckCircle />} disabled={submitting} onClick={() => handleDecision('approve')}>
                    Approve
                  </material_1.Button>
                  <material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Close />} disabled={submitting} onClick={() => handleDecision('deny')}>
                    Deny
                  </material_1.Button>
                </material_1.Stack>
                {requiresDualClaim && !hasDualClaim ? (<material_1.Alert severity="warning" icon={<icons_material_1.LockClock fontSize="inherit"/>} sx={{ mt: 1 }}>
                    Dual-control enforced. A reviewer with <code>approval:dual-control</code>{' '}
                    must co-sign before execution.
                  </material_1.Alert>) : null}
              </material_1.Stack>

              <material_1.Divider />
              <AuditTimeline_1.AuditTimeline events={timeline}/>
            </material_1.Stack>) : (<material_1.Alert severity="info" icon={<icons_material_1.ErrorOutline fontSize="inherit"/>}>
              Select an approval to review details, audit trail, and preflight readiness.
            </material_1.Alert>)}
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
}
