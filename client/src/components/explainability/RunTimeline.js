"use strict";
/**
 * Run Timeline Component
 *
 * Displays a chronological list of explainable runs (agent runs, predictions, negotiations).
 * Provides filtering and quick access to run details.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const RunTimeline = ({ tenantId, onRunSelect, autoRefresh = false, refreshIntervalMs = 30000, }) => {
    const [runs, setRuns] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [filter, setFilter] = (0, react_1.useState)({
        run_type: '',
        min_confidence: '',
        capability: '',
    });
    const fetchRuns = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('tenant_id', tenantId);
            if (filter.run_type)
                params.append('run_type', filter.run_type);
            if (filter.min_confidence)
                params.append('min_confidence', filter.min_confidence);
            if (filter.capability)
                params.append('capability', filter.capability);
            const response = await fetch(`/api/explainability/runs?${params.toString()}`);
            const result = await response.json();
            if (result.success) {
                setRuns(result.data || []);
            }
            else {
                setError(result.errors?.[0]?.message || 'Failed to fetch runs');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    }, [filter, tenantId]);
    (0, react_1.useEffect)(() => {
        void fetchRuns();
    }, [fetchRuns]);
    (0, react_1.useEffect)(() => {
        if (autoRefresh) {
            const interval = setInterval(fetchRuns, refreshIntervalMs);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshIntervalMs, fetchRuns]);
    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8)
            return 'success';
        if (confidence >= 0.5)
            return 'warning';
        return 'error';
    };
    const getConfidenceIcon = (confidence) => {
        if (confidence >= 0.8)
            return <icons_material_1.CheckCircle fontSize="small"/>;
        if (confidence >= 0.5)
            return <icons_material_1.Warning fontSize="small"/>;
        return <icons_material_1.Error fontSize="small"/>;
    };
    const formatDuration = (ms) => {
        if (ms === null)
            return 'In progress...';
        if (ms < 1000)
            return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };
    const formatTimestamp = (iso) => {
        const date = new Date(iso);
        return date.toLocaleString();
    };
    return (<material_1.Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      <material_1.Typography variant="h4" gutterBottom>
        Explainability Timeline
      </material_1.Typography>

      {/* Filters */}
      <material_1.Card sx={{ mb: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction="row" spacing={2} alignItems="center">
            <material_1.FormControl sx={{ minWidth: 200 }}>
              <material_1.InputLabel>Run Type</material_1.InputLabel>
              <material_1.Select value={filter.run_type} label="Run Type" onChange={(e) => setFilter({ ...filter, run_type: e.target.value })}>
                <material_1.MenuItem value="">All</material_1.MenuItem>
                <material_1.MenuItem value="agent_run">Agent Run</material_1.MenuItem>
                <material_1.MenuItem value="prediction">Prediction</material_1.MenuItem>
                <material_1.MenuItem value="negotiation">Negotiation</material_1.MenuItem>
                <material_1.MenuItem value="policy_decision">Policy Decision</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>

            <material_1.TextField label="Min Confidence" type="number" inputProps={{ min: 0, max: 1, step: 0.1 }} value={filter.min_confidence} onChange={(e) => setFilter({ ...filter, min_confidence: e.target.value })} sx={{ width: 150 }}/>

            <material_1.TextField label="Capability" value={filter.capability} onChange={(e) => setFilter({ ...filter, capability: e.target.value })} placeholder="e.g., graph_query" sx={{ flexGrow: 1 }}/>

            <material_1.Tooltip title="Refresh">
              <material_1.IconButton onClick={fetchRuns} disabled={loading}>
                <icons_material_1.Refresh />
              </material_1.IconButton>
            </material_1.Tooltip>
          </material_1.Stack>
        </material_1.CardContent>
      </material_1.Card>

      {/* Loading */}
      {loading && <material_1.LinearProgress sx={{ mb: 2 }}/>}

      {/* Error */}
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </material_1.Alert>)}

      {/* Run List */}
      <material_1.Stack spacing={2}>
        {runs.length === 0 && !loading && (<material_1.Alert severity="info">No runs found. Try adjusting your filters.</material_1.Alert>)}

        {runs.map((run) => (<material_1.Card key={run.run_id} elevation={2}>
            <material_1.CardContent>
              <material_1.Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <material_1.Box sx={{ flexGrow: 1 }}>
                  {/* Header */}
                  <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <material_1.Typography variant="h6">{run.run_type.replace('_', ' ')}</material_1.Typography>
                    <material_1.Chip label={run.actor.actor_name} size="small" variant="outlined"/>
                    <material_1.Chip label={`${(run.confidence.overall_confidence * 100).toFixed(0)}%`} size="small" color={getConfidenceColor(run.confidence.overall_confidence)} icon={getConfidenceIcon(run.confidence.overall_confidence)}/>
                  </material_1.Stack>

                  {/* Summary */}
                  <material_1.Typography variant="body1" sx={{ mb: 1 }}>
                    {run.explanation.summary}
                  </material_1.Typography>

                  {/* Metadata */}
                  <material_1.Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Started: {formatTimestamp(run.started_at)}
                    </material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Duration: {formatDuration(run.duration_ms)}
                    </material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Evidence: {run.confidence.evidence_count}
                    </material_1.Typography>
                  </material_1.Stack>

                  {/* Capabilities */}
                  <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                    {run.capabilities_used.map((cap) => (<material_1.Chip key={cap} label={cap} size="small"/>))}
                  </material_1.Stack>

                  {/* Policy Decisions */}
                  {run.policy_decisions.length > 0 && (<material_1.Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {run.policy_decisions.map((pd, idx) => (<material_1.Chip key={idx} label={`${pd.policy_name}: ${pd.decision}`} size="small" color={pd.decision === 'allow' ? 'success' : 'error'} variant="outlined"/>))}
                    </material_1.Stack>)}
                </material_1.Box>

                {/* Actions */}
                <material_1.Tooltip title="View Details">
                  <material_1.IconButton onClick={() => onRunSelect && onRunSelect(run.run_id)} color="primary">
                    <icons_material_1.Visibility />
                  </material_1.IconButton>
                </material_1.Tooltip>
              </material_1.Stack>
            </material_1.CardContent>
          </material_1.Card>))}
      </material_1.Stack>
    </material_1.Box>);
};
exports.default = RunTimeline;
