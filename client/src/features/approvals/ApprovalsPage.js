"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ApprovalsPage;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = material_1.Grid;
const icons_material_1 = require("@mui/icons-material");
const statusChipColor = {
    pending: 'info',
    approved: 'success',
    rejected: 'error',
};
function ApprovalsPage() {
    const [approvals, setApprovals] = react_1.default.useState([]);
    const [loading, setLoading] = react_1.default.useState(false);
    const [error, setError] = react_1.default.useState('');
    const [decisionNotes, setDecisionNotes] = react_1.default.useState({});
    const fetchApprovals = react_1.default.useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch('/api/approvals?status=pending');
            if (!response.ok) {
                throw new Error('Failed to load approvals');
            }
            const data = await response.json();
            setApprovals(Array.isArray(data) ? data : []);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            setError(err?.message || 'Unable to load approvals');
        }
        finally {
            setLoading(false);
        }
    }, []);
    react_1.default.useEffect(() => {
        fetchApprovals();
    }, [fetchApprovals]);
    const updateDecisionNote = (id, value) => {
        setDecisionNotes((prev) => ({ ...prev, [id]: value }));
    };
    const decide = async (id, action) => {
        try {
            setError('');
            const response = await fetch(`/api/approvals/${id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: decisionNotes[id] || '' }),
            });
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Decision failed');
            }
            await fetchApprovals();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            setError(err?.message || 'Decision failed');
        }
    };
    return (<material_1.Box>
      <material_1.Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <material_1.Stack direction="row" spacing={1} alignItems="center">
          <icons_material_1.PendingActions color="primary"/>
          <material_1.Box>
            <material_1.Typography variant="h5">Pending Approvals</material_1.Typography>
            <material_1.Typography variant="body2" color="text.secondary">
              High-risk automations are paused until an operator approves them.
            </material_1.Typography>
          </material_1.Box>
        </material_1.Stack>
        <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={fetchApprovals} disabled={loading}>
          Refresh
        </material_1.Button>
      </material_1.Stack>

      {error ? (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>) : null}

      {approvals.length === 0 && !loading ? (<material_1.Alert severity="success" icon={<icons_material_1.CheckCircle fontSize="inherit"/>}>
          No pending approvals. You are all caught up.
        </material_1.Alert>) : null}

      <AnyGrid container spacing={2}>
        {approvals.map((approval) => (<AnyGrid xs={12} md={6} key={approval.id}>
            <material_1.Card variant="outlined">
              <material_1.CardContent>
                <material_1.Stack spacing={1.5}>
                  <material_1.Stack direction="row" spacing={1} alignItems="center">
                    <material_1.Chip label={approval.status.toUpperCase()} color={statusChipColor[approval.status] || 'default'} size="small"/>
                    {approval.action ? (<material_1.Chip label={approval.action} size="small"/>) : null}
                    {approval.run_id ? (<material_1.Chip label={`Run: ${approval.run_id}`} size="small"/>) : null}
                  </material_1.Stack>

                  <material_1.Typography variant="subtitle1">
                    Requested by <strong>{approval.requester_id}</strong>
                  </material_1.Typography>
                  {approval.reason ? (<material_1.Typography variant="body2" color="text.secondary">
                      Reason: {approval.reason}
                    </material_1.Typography>) : null}
                  <material_1.Typography variant="caption" color="text.secondary">
                    Created: {new Date(approval.created_at).toLocaleString()}
                  </material_1.Typography>

                  <material_1.TextField label="Decision reason" value={decisionNotes[approval.id] || ''} onChange={(e) => updateDecisionNote(approval.id, e.target.value)} fullWidth multiline minRows={2}/>

                  <material_1.Stack direction="row" spacing={1}>
                    <material_1.Button variant="contained" color="success" startIcon={<icons_material_1.CheckCircle />} onClick={() => decide(approval.id, 'approve')} disabled={loading}>
                      Approve
                    </material_1.Button>
                    <material_1.Button variant="outlined" color="error" startIcon={<icons_material_1.Cancel />} onClick={() => decide(approval.id, 'reject')} disabled={loading}>
                      Reject
                    </material_1.Button>
                  </material_1.Stack>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </AnyGrid>))}
      </AnyGrid>
    </material_1.Box>);
}
