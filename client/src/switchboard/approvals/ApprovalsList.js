"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApprovalsQueue = useApprovalsQueue;
exports.default = ApprovalsList;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = material_1.Grid;
const icons_material_1 = require("@mui/icons-material");
const normalizeApprovals = (payload) => {
    const approvals = Array.isArray(payload)
        ? payload
        : payload?.approvals;
    if (!Array.isArray(approvals)) {
        return [];
    }
    return approvals.map((item, index) => {
        const record = item;
        const id = String(record.id ?? `approval-${index}`);
        const requester = record.requester ||
            record.requester_id ||
            'unknown-requester';
        const operation = record.operation || record.action || 'Pending action';
        const submittedAt = record.submittedAt || record.created_at || new Date().toISOString();
        const obligations = Array.isArray(record.obligations)
            ? record.obligations
            : [];
        const riskFlags = Array.isArray(record.riskFlags)
            ? record.riskFlags
            : Array.isArray(record.risks)
                ? record.risks
                : [];
        return {
            id,
            requester,
            operation,
            submittedAt,
            obligations,
            riskFlags,
        };
    });
};
// eslint-disable-next-line react-refresh/only-export-components
function useApprovalsQueue(fetchImpl = fetch) {
    const [approvals, setApprovals] = react_1.default.useState([]);
    const [loading, setLoading] = react_1.default.useState(true);
    const [error, setError] = react_1.default.useState(null);
    const [pendingId, setPendingId] = react_1.default.useState(null);
    const loadQueue = react_1.default.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchImpl('/api/switchboard/approvals');
            if (!response.ok) {
                throw new Error('Failed to load approvals');
            }
            const payload = await response.json();
            setApprovals(normalizeApprovals(payload));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load approvals';
            setError(message);
        }
        finally {
            setLoading(false);
        }
    }, [fetchImpl]);
    react_1.default.useEffect(() => {
        loadQueue();
    }, [loadQueue]);
    const updateApproval = react_1.default.useCallback(async (id, action, rationale) => {
        const snapshot = approvals.map((item) => ({ ...item }));
        setPendingId(id);
        setError(null);
        setApprovals((prev) => prev.filter((item) => item.id !== id));
        try {
            const response = await fetchImpl(`/api/switchboard/approvals/${id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rationale }),
            });
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Decision failed');
            }
            await loadQueue();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Decision failed';
            setApprovals(snapshot);
            setError(message);
        }
        finally {
            setPendingId(null);
        }
    }, [approvals, fetchImpl, loadQueue]);
    return {
        approvals,
        loading,
        error,
        refresh: loadQueue,
        approve: (id, rationale) => updateApproval(id, 'approve', rationale),
        deny: (id, rationale) => updateApproval(id, 'deny', rationale),
        pendingId,
    };
}
function ApprovalsList() {
    const { approvals, loading, error, refresh, approve, deny, pendingId } = useApprovalsQueue();
    const [selectedId, setSelectedId] = react_1.default.useState(null);
    const [rationaleById, setRationaleById] = react_1.default.useState({});
    const [showValidation, setShowValidation] = react_1.default.useState(false);
    react_1.default.useEffect(() => {
        if (!selectedId && approvals.length > 0) {
            setSelectedId(approvals[0].id);
        }
        else if (selectedId && approvals.every((item) => item.id !== selectedId)) {
            setSelectedId(approvals[0]?.id ?? null);
        }
    }, [approvals, selectedId]);
    const selected = react_1.default.useMemo(() => approvals.find((item) => item.id === selectedId) ?? null, [approvals, selectedId]);
    const rationale = selected?.id ? rationaleById[selected.id] || '' : '';
    const rationaleError = showValidation && !rationale.trim()
        ? 'Rationale is required to record your decision.'
        : '';
    const handleRationaleChange = (value) => {
        if (!selected?.id)
            return;
        setRationaleById((prev) => ({ ...prev, [selected.id]: value }));
    };
    const handleDecision = async (action) => {
        if (!selected?.id)
            return;
        if (!rationale.trim()) {
            setShowValidation(true);
            return;
        }
        setShowValidation(false);
        if (action === 'approve') {
            await approve(selected.id, rationale.trim());
        }
        else {
            await deny(selected.id, rationale.trim());
        }
    };
    return (<material_1.Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
      <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <material_1.Stack direction="row" spacing={1} alignItems="center">
          <icons_material_1.WarningAmber color="primary"/>
          <material_1.Box>
            <material_1.Typography variant="h6">Approval queue</material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              High-risk automation steps are paused until an operator records a decision.
            </material_1.Typography>
          </material_1.Box>
        </material_1.Stack>
        <material_1.Button startIcon={<icons_material_1.Refresh />} onClick={refresh} disabled={loading} variant="outlined">
          Refresh
        </material_1.Button>
      </material_1.Stack>

      {loading ? (<material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <material_1.CircularProgress size={20}/>
          <material_1.Typography variant="body2">Loading approvals…</material_1.Typography>
        </material_1.Stack>) : null}

      {error ? (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>) : null}

      {!loading && approvals.length === 0 ? (<material_1.Alert severity="info" sx={{ mb: 0 }}>
          No pending approvals. You are all caught up.
        </material_1.Alert>) : (<AnyGrid container spacing={2} alignItems="stretch">
          <AnyGrid xs={12} md={5} lg={4}>
            <material_1.Paper variant="outlined" sx={{ height: '100%' }}>
              <material_1.List disablePadding>
                {approvals.map((item) => (<react_1.default.Fragment key={item.id}>
                    <material_1.ListItemButton selected={item.id === selected?.id} alignItems="flex-start" onClick={() => setSelectedId(item.id)} data-testid={`approval-row-${item.id}`}>
                      <material_1.ListItemText primary={<material_1.Typography variant="subtitle2" component="div">
                            {item.operation}
                          </material_1.Typography>} secondary={<material_1.Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            <material_1.Typography variant="caption" color="text.secondary">
                              Requested by {item.requester}
                            </material_1.Typography>
                            <material_1.Typography variant="caption" color="text.secondary">
                              Submitted {new Date(item.submittedAt).toLocaleString()}
                            </material_1.Typography>
                            <material_1.Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {item.riskFlags.map((risk) => (<material_1.Chip key={`${item.id}-risk-${risk}`} label={risk} size="small" color="error" icon={<icons_material_1.WarningAmber fontSize="small"/>}/>))}
                              {item.obligations.map((obligation) => (<material_1.Chip key={`${item.id}-obligation-${obligation}`} label={obligation} size="small" color="info" icon={<icons_material_1.Shield fontSize="small"/>}/>))}
                            </material_1.Stack>
                          </material_1.Stack>}/>
                    </material_1.ListItemButton>
                    <material_1.Divider component="li"/>
                  </react_1.default.Fragment>))}
              </material_1.List>
            </material_1.Paper>
          </AnyGrid>

          <AnyGrid xs={12} md={7} lg={8}>
            <material_1.Paper variant="outlined" sx={{ height: '100%', p: 2 }}>
              {selected ? (<material_1.Stack spacing={2} height="100%">
                  <material_1.Box>
                    <material_1.Typography variant="h6">{selected.operation}</material_1.Typography>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {selected.requester} • Submitted {new Date(selected.submittedAt).toLocaleString()}
                    </material_1.Typography>
                  </material_1.Box>

                  <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                    {selected.riskFlags.length ? (selected.riskFlags.map((flag) => (<material_1.Chip key={`${selected.id}-risk-${flag}`} icon={<icons_material_1.WarningAmber fontSize="small"/>} label={flag} color="error" size="small"/>))) : (<material_1.Chip label="No risk flags" size="small" color="success"/>)}

                    {selected.obligations.length ? (selected.obligations.map((obligation) => (<material_1.Chip key={`${selected.id}-obligation-${obligation}`} icon={<icons_material_1.Shield fontSize="small"/>} label={obligation} color="info" size="small"/>))) : (<material_1.Chip label="No obligations recorded" size="small" variant="outlined"/>)}
                  </material_1.Stack>

                  <material_1.Box>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Rationale & audit trail
                    </material_1.Typography>
                    <material_1.TextField label="Rationale" multiline minRows={3} fullWidth value={rationale} onChange={(event) => handleRationaleChange(event.target.value)} onBlur={() => setShowValidation(true)} error={Boolean(rationaleError)} helperText={rationaleError || 'Capture why you are approving or denying this run.'}/>
                  </material_1.Box>

                  <material_1.Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
                    <material_1.Button variant="contained" color="success" startIcon={<icons_material_1.CheckCircle />} onClick={() => handleDecision('approve')} disabled={Boolean(pendingId)}>
                      Approve
                    </material_1.Button>
                    <material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Close />} onClick={() => handleDecision('deny')} disabled={Boolean(pendingId)}>
                      Deny
                    </material_1.Button>
                  </material_1.Stack>
                </material_1.Stack>) : (<material_1.Stack spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <material_1.Typography variant="subtitle1">Select a request to review the details.</material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    Obligations, risk flags, and rationale capture will appear here.
                  </material_1.Typography>
                </material_1.Stack>)}
            </material_1.Paper>
          </AnyGrid>
        </AnyGrid>)}
    </material_1.Paper>);
}
