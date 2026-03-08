"use strict";
/**
 * Run Detail View Component
 *
 * Displays comprehensive details of a single explainable run.
 * Answers: What ran? Why? What did it produce? Can I trust it?
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
const RunDetailView = ({ runId, onClose: _onClose }) => {
    const [run, setRun] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchRunDetails = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/explainability/runs/${runId}`);
            const result = await response.json();
            if (result.success) {
                setRun(result.data);
            }
            else {
                setError(result.errors?.[0]?.message || 'Failed to fetch run details');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    }, [runId]);
    (0, react_1.useEffect)(() => {
        void fetchRunDetails();
    }, [fetchRunDetails]);
    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8)
            return 'success';
        if (confidence >= 0.5)
            return 'warning';
        return 'error';
    };
    const getRiskColor = (risk) => {
        const riskLower = risk.toLowerCase();
        if (riskLower === 'critical')
            return 'error';
        if (riskLower === 'high')
            return 'warning';
        if (riskLower === 'medium')
            return 'info';
        return 'default';
    };
    const formatTimestamp = (iso) => {
        const date = new Date(iso);
        return date.toLocaleString();
    };
    if (loading) {
        return (<material_1.Box sx={{ width: '100%', p: 2 }}>
        <material_1.LinearProgress />
        <material_1.Typography sx={{ mt: 2, textAlign: 'center' }}>Loading run details...</material_1.Typography>
      </material_1.Box>);
    }
    if (error) {
        return (<material_1.Alert severity="error" onClose={() => setError(null)}>
        {error}
      </material_1.Alert>);
    }
    if (!run) {
        return <material_1.Alert severity="info">Run not found</material_1.Alert>;
    }
    return (<material_1.Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <material_1.Card sx={{ mb: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <material_1.Typography variant="h4">{run.run_type.replace('_', ' ')}</material_1.Typography>
            <material_1.Stack direction="row" spacing={1}>
              <material_1.Chip label={`Confidence: ${(run.confidence.overall_confidence * 100).toFixed(0)}%`} color={getConfidenceColor(run.confidence.overall_confidence)} icon={run.confidence.overall_confidence >= 0.8 ? (<icons_material_1.CheckCircle />) : run.confidence.overall_confidence >= 0.5 ? (<icons_material_1.Warning />) : (<icons_material_1.Error />)}/>
              {run.confidence.validated && (<material_1.Chip label="Validated" color="success" icon={<icons_material_1.Verified />}/>)}
            </material_1.Stack>
          </material_1.Stack>

          <material_1.Typography variant="h6" gutterBottom>
            {run.explanation.summary}
          </material_1.Typography>

          <material_1.Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <material_1.Box>
              <material_1.Typography variant="caption" color="text.secondary">
                Actor
              </material_1.Typography>
              <material_1.Typography variant="body2">
                {run.actor.actor_name} ({run.actor.actor_type})
              </material_1.Typography>
            </material_1.Box>
            <material_1.Box>
              <material_1.Typography variant="caption" color="text.secondary">
                Started
              </material_1.Typography>
              <material_1.Typography variant="body2">{formatTimestamp(run.started_at)}</material_1.Typography>
            </material_1.Box>
            {run.completed_at && (<material_1.Box>
                <material_1.Typography variant="caption" color="text.secondary">
                  Duration
                </material_1.Typography>
                <material_1.Typography variant="body2">
                  {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                </material_1.Typography>
              </material_1.Box>)}
            <material_1.Box>
              <material_1.Typography variant="caption" color="text.secondary">
                Run ID
              </material_1.Typography>
              <material_1.Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                {run.run_id.slice(0, 8)}...
              </material_1.Typography>
            </material_1.Box>
          </material_1.Stack>

          {run.redacted_fields.length > 0 && (<material_1.Alert severity="info" sx={{ mt: 2 }}>
              <material_1.Typography variant="body2">
                {run.redacted_fields.length} field(s) redacted for privacy/security
              </material_1.Typography>
            </material_1.Alert>)}
        </material_1.CardContent>
      </material_1.Card>

      {/* Explanation Details */}
      <material_1.Accordion defaultExpanded>
        <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
          <material_1.Typography variant="h6">Explanation</material_1.Typography>
        </material_1.AccordionSummary>
        <material_1.AccordionDetails>
          <material_1.Stack spacing={2}>
            <material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Why Triggered
              </material_1.Typography>
              <material_1.Typography variant="body2">{run.explanation.why_triggered}</material_1.Typography>
            </material_1.Box>

            <material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Why This Approach
              </material_1.Typography>
              <material_1.Typography variant="body2">{run.explanation.why_this_approach}</material_1.Typography>
            </material_1.Box>

            {run.explanation.reasoning_steps.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Reasoning Steps
                </material_1.Typography>
                {run.explanation.reasoning_steps.map((step) => (<material_1.Card key={step.step_number} variant="outlined" sx={{ mb: 1 }}>
                    <material_1.CardContent>
                      <material_1.Stack direction="row" spacing={2} alignItems="center">
                        <material_1.Chip label={`Step ${step.step_number}`} size="small"/>
                        <material_1.Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {step.description}
                        </material_1.Typography>
                        <material_1.Chip label={`${(step.confidence * 100).toFixed(0)}%`} size="small" color={getConfidenceColor(step.confidence)}/>
                      </material_1.Stack>
                      <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {step.rationale}
                      </material_1.Typography>
                    </material_1.CardContent>
                  </material_1.Card>))}
              </material_1.Box>)}

            {run.explanation.alternatives_considered.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Alternatives Considered
                </material_1.Typography>
                {run.explanation.alternatives_considered.map((alt, idx) => (<material_1.Card key={idx} variant="outlined" sx={{ mb: 1 }}>
                    <material_1.CardContent>
                      <material_1.Typography variant="body2" fontWeight="bold">
                        {alt.approach}
                      </material_1.Typography>
                      <material_1.Typography variant="caption" color="text.secondary">
                        Not chosen: {alt.why_not_chosen}
                      </material_1.Typography>
                    </material_1.CardContent>
                  </material_1.Card>))}
              </material_1.Box>)}
          </material_1.Stack>
        </material_1.AccordionDetails>
      </material_1.Accordion>

      {/* Confidence & Trust */}
      <material_1.Accordion>
        <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
          <material_1.Typography variant="h6">Confidence & Trust Signals</material_1.Typography>
        </material_1.AccordionSummary>
        <material_1.AccordionDetails>
          <material_1.Table size="small">
            <material_1.TableBody>
              <material_1.TableRow>
                <material_1.TableCell>Overall Confidence</material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Chip label={`${(run.confidence.overall_confidence * 100).toFixed(0)}%`} color={getConfidenceColor(run.confidence.overall_confidence)}/>
                </material_1.TableCell>
              </material_1.TableRow>
              <material_1.TableRow>
                <material_1.TableCell>Confidence Basis</material_1.TableCell>
                <material_1.TableCell>{run.confidence.confidence_basis}</material_1.TableCell>
              </material_1.TableRow>
              <material_1.TableRow>
                <material_1.TableCell>Evidence Count</material_1.TableCell>
                <material_1.TableCell>{run.confidence.evidence_count}</material_1.TableCell>
              </material_1.TableRow>
              <material_1.TableRow>
                <material_1.TableCell>Evidence Quality</material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Chip label={run.confidence.evidence_quality} size="small"/>
                </material_1.TableCell>
              </material_1.TableRow>
              <material_1.TableRow>
                <material_1.TableCell>Source Count</material_1.TableCell>
                <material_1.TableCell>{run.confidence.source_count}</material_1.TableCell>
              </material_1.TableRow>
              <material_1.TableRow>
                <material_1.TableCell>Source Reliability</material_1.TableCell>
                <material_1.TableCell>
                  <material_1.Chip label={run.confidence.source_reliability} size="small" color={run.confidence.source_reliability === 'verified' ? 'success' : 'default'}/>
                </material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableBody>
          </material_1.Table>
        </material_1.AccordionDetails>
      </material_1.Accordion>

      {/* Policy Decisions */}
      {run.policy_decisions.length > 0 && (<material_1.Accordion>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
            <material_1.Typography variant="h6">Policy Decisions</material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails>
            <material_1.Stack spacing={1}>
              {run.policy_decisions.map((pd) => (<material_1.Card key={pd.decision_id} variant="outlined">
                  <material_1.CardContent>
                    <material_1.Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                      <material_1.Typography variant="subtitle2">{pd.policy_name}</material_1.Typography>
                      <material_1.Chip label={pd.decision} size="small" color={pd.decision === 'allow' ? 'success' : 'error'}/>
                      <material_1.Chip label={pd.risk_level} size="small" color={getRiskColor(pd.risk_level)}/>
                    </material_1.Stack>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {pd.rationale}
                    </material_1.Typography>
                  </material_1.CardContent>
                </material_1.Card>))}
            </material_1.Stack>
          </material_1.AccordionDetails>
        </material_1.Accordion>)}

      {/* Provenance Links */}
      <material_1.Accordion>
        <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
          <material_1.Typography variant="h6">Provenance & Artifacts</material_1.Typography>
        </material_1.AccordionSummary>
        <material_1.AccordionDetails>
          <material_1.Stack spacing={2}>
            {run.provenance_links.provenance_chain_id && (<material_1.Box>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Provenance Chain
                </material_1.Typography>
                <material_1.Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {run.provenance_links.provenance_chain_id}
                </material_1.Typography>
              </material_1.Box>)}

            {run.provenance_links.claims.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Claims ({run.provenance_links.claims.length})
                </material_1.Typography>
                <material_1.Stack direction="row" spacing={1} flexWrap="wrap">
                  {run.provenance_links.claims.map((claim) => (<material_1.Chip key={claim.claim_id} label={`${claim.claim_type} (${(claim.confidence * 100).toFixed(0)}%)`} size="small" variant="outlined"/>))}
                </material_1.Stack>
              </material_1.Box>)}

            {run.outputs.artifacts.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Artifacts ({run.outputs.artifacts.length})
                </material_1.Typography>
                {run.outputs.artifacts.map((artifact) => (<material_1.Card key={artifact.artifact_id} variant="outlined" sx={{ mb: 1 }}>
                    <material_1.CardContent>
                      <material_1.Stack direction="row" spacing={2} alignItems="center">
                        <material_1.Chip label={artifact.artifact_type} size="small"/>
                        <material_1.Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                          {artifact.artifact_id.slice(0, 12)}...
                        </material_1.Typography>
                      </material_1.Stack>
                    </material_1.CardContent>
                  </material_1.Card>))}
              </material_1.Box>)}

            {run.audit_event_ids.length > 0 && (<material_1.Box>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Audit Trail
                </material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  {run.audit_event_ids.length} audit event(s) linked
                </material_1.Typography>
              </material_1.Box>)}
          </material_1.Stack>
        </material_1.AccordionDetails>
      </material_1.Accordion>

      {/* Assumptions & Limitations */}
      {(run.assumptions.length > 0 || run.limitations.length > 0) && (<material_1.Accordion>
          <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
            <material_1.Typography variant="h6">Assumptions & Limitations</material_1.Typography>
          </material_1.AccordionSummary>
          <material_1.AccordionDetails>
            <material_1.Stack spacing={2}>
              {run.assumptions.length > 0 && (<material_1.Box>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Assumptions
                  </material_1.Typography>
                  {run.assumptions.map((assumption) => (<material_1.Card key={assumption.assumption_id} variant="outlined" sx={{ mb: 1 }}>
                      <material_1.CardContent>
                        <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <material_1.Chip label={assumption.risk_if_false} size="small" color={getRiskColor(assumption.risk_if_false)}/>
                          {assumption.validated && <material_1.Chip label="Validated" size="small" color="success"/>}
                        </material_1.Stack>
                        <material_1.Typography variant="body2">{assumption.description}</material_1.Typography>
                      </material_1.CardContent>
                    </material_1.Card>))}
                </material_1.Box>)}

              {run.limitations.length > 0 && (<material_1.Box>
                  <material_1.Typography variant="subtitle2" gutterBottom>
                    Limitations
                  </material_1.Typography>
                  {run.limitations.map((limitation) => (<material_1.Card key={limitation.limitation_id} variant="outlined" sx={{ mb: 1 }}>
                      <material_1.CardContent>
                        <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <material_1.Chip label={limitation.category} size="small"/>
                          <material_1.Chip label={limitation.impact} size="small" color={getRiskColor(limitation.impact)}/>
                        </material_1.Stack>
                        <material_1.Typography variant="body2">{limitation.description}</material_1.Typography>
                        {limitation.mitigation && (<material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Mitigation: {limitation.mitigation}
                          </material_1.Typography>)}
                      </material_1.CardContent>
                    </material_1.Card>))}
                </material_1.Box>)}
            </material_1.Stack>
          </material_1.AccordionDetails>
        </material_1.Accordion>)}

      {/* Inputs/Outputs (Redacted) */}
      <material_1.Accordion>
        <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
          <material_1.Typography variant="h6">Inputs & Outputs</material_1.Typography>
        </material_1.AccordionSummary>
        <material_1.AccordionDetails>
          <material_1.Stack spacing={2}>
            <material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Inputs
              </material_1.Typography>
              <material_1.Card variant="outlined">
                <material_1.CardContent>
                  <pre style={{ fontSize: '0.85em', overflow: 'auto' }}>
                    {JSON.stringify(run.inputs.parameters, null, 2)}
                  </pre>
                  {(run.inputs.pii_fields_redacted.length > 0 || run.inputs.secret_fields_redacted.length > 0) && (<material_1.Alert severity="info" sx={{ mt: 1 }}>
                      {run.inputs.pii_fields_redacted.length} PII field(s) redacted,{' '}
                      {run.inputs.secret_fields_redacted.length} secret(s) redacted
                    </material_1.Alert>)}
                  <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Hash: {run.inputs.input_hash}
                  </material_1.Typography>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Box>

            <material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Outputs
              </material_1.Typography>
              <material_1.Card variant="outlined">
                <material_1.CardContent>
                  <pre style={{ fontSize: '0.85em', overflow: 'auto' }}>
                    {JSON.stringify(run.outputs.results, null, 2)}
                  </pre>
                  {(run.outputs.pii_fields_redacted.length > 0 || run.outputs.secret_fields_redacted.length > 0) && (<material_1.Alert severity="info" sx={{ mt: 1 }}>
                      {run.outputs.pii_fields_redacted.length} PII field(s) redacted,{' '}
                      {run.outputs.secret_fields_redacted.length} secret(s) redacted
                    </material_1.Alert>)}
                  <material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Hash: {run.outputs.output_hash}
                  </material_1.Typography>
                </material_1.CardContent>
              </material_1.Card>
            </material_1.Box>
          </material_1.Stack>
        </material_1.AccordionDetails>
      </material_1.Accordion>
    </material_1.Box>);
};
exports.default = RunDetailView;
