/**
 * Run Detail View Component
 *
 * Displays comprehensive details of a single explainable run.
 * Answers: What ran? Why? What did it produce? Can I trust it?
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';

interface ExplainableRun {
  run_id: string;
  run_type: string;
  tenant_id: string;
  actor: {
    actor_type: string;
    actor_id: string;
    actor_name: string;
    actor_role: string | null;
    authentication_method: string;
  };
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  inputs: {
    parameters: Record<string, unknown>;
    input_hash: string;
    pii_fields_redacted: string[];
    secret_fields_redacted: string[];
  };
  outputs: {
    results: Record<string, unknown>;
    output_hash: string;
    pii_fields_redacted: string[];
    secret_fields_redacted: string[];
    artifacts: Array<{
      artifact_id: string;
      artifact_type: string;
      artifact_uri: string;
    }>;
    side_effects: Array<{
      effect_type: string;
      target: string;
      action: string;
      reversible: boolean;
    }>;
  };
  explanation: {
    summary: string;
    reasoning_steps: Array<{
      step_number: number;
      description: string;
      confidence: number;
      rationale: string;
    }>;
    why_triggered: string;
    why_this_approach: string;
    alternatives_considered: Array<{
      approach: string;
      why_not_chosen: string;
    }>;
  };
  confidence: {
    overall_confidence: number;
    confidence_basis: string;
    evidence_count: number;
    evidence_quality: string;
    source_count: number;
    source_reliability: string;
    validated: boolean;
  };
  assumptions: Array<{
    assumption_id: string;
    description: string;
    risk_if_false: string;
    validated: boolean;
  }>;
  limitations: Array<{
    limitation_id: string;
    category: string;
    description: string;
    impact: string;
    mitigation: string | null;
  }>;
  policy_decisions: Array<{
    decision_id: string;
    policy_name: string;
    decision: string;
    rationale: string;
    risk_level: string;
  }>;
  capabilities_used: string[];
  provenance_links: {
    provenance_chain_id: string | null;
    claims: Array<{ claim_id: string; claim_type: string; confidence: number }>;
    evidence: Array<{ evidence_id: string; evidence_type: string }>;
    sources: Array<{ source_id: string; source_type: string }>;
    sbom_id: string | null;
  };
  audit_event_ids: string[];
  redacted_fields: string[];
  version: string;
}

interface RunDetailViewProps {
  runId: string;
  onClose?: () => void;
}

const RunDetailView: React.FC<RunDetailViewProps> = ({ runId, onClose: _onClose }) => {
  const [run, setRun] = useState<ExplainableRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRunDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/explainability/runs/${runId}`);
      const result = await response.json();

      if (result.success) {
        setRun(result.data);
      } else {
        setError(result.errors?.[0]?.message || 'Failed to fetch run details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void fetchRunDetails();
  }, [fetchRunDetails]);

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const getRiskColor = (risk: string): 'error' | 'warning' | 'info' | 'default' => {
    const riskLower = risk.toLowerCase();
    if (riskLower === 'critical') return 'error';
    if (riskLower === 'high') return 'warning';
    if (riskLower === 'medium') return 'info';
    return 'default';
  };

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading run details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (!run) {
    return <Alert severity="info">Run not found</Alert>;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4">{run.run_type.replace('_', ' ')}</Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`Confidence: ${(run.confidence.overall_confidence * 100).toFixed(0)}%`}
                color={getConfidenceColor(run.confidence.overall_confidence)}
                icon={
                  run.confidence.overall_confidence >= 0.8 ? (
                    <CheckCircleIcon />
                  ) : run.confidence.overall_confidence >= 0.5 ? (
                    <WarningIcon />
                  ) : (
                    <ErrorIcon />
                  )
                }
              />
              {run.confidence.validated && (
                <Chip label="Validated" color="success" icon={<VerifiedIcon />} />
              )}
            </Stack>
          </Stack>

          <Typography variant="h6" gutterBottom>
            {run.explanation.summary}
          </Typography>

          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Actor
              </Typography>
              <Typography variant="body2">
                {run.actor.actor_name} ({run.actor.actor_type})
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Started
              </Typography>
              <Typography variant="body2">{formatTimestamp(run.started_at)}</Typography>
            </Box>
            {run.completed_at && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body2">
                  {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">
                Run ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                {run.run_id.slice(0, 8)}...
              </Typography>
            </Box>
          </Stack>

          {run.redacted_fields.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {run.redacted_fields.length} field(s) redacted for privacy/security
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Explanation Details */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Explanation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Why Triggered
              </Typography>
              <Typography variant="body2">{run.explanation.why_triggered}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Why This Approach
              </Typography>
              <Typography variant="body2">{run.explanation.why_this_approach}</Typography>
            </Box>

            {run.explanation.reasoning_steps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Reasoning Steps
                </Typography>
                {run.explanation.reasoning_steps.map((step) => (
                  <Card key={step.step_number} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={`Step ${step.step_number}`} size="small" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {step.description}
                        </Typography>
                        <Chip
                          label={`${(step.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(step.confidence)}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {step.rationale}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {run.explanation.alternatives_considered.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Alternatives Considered
                </Typography>
                {run.explanation.alternatives_considered.map((alt, idx) => (
                  <Card key={idx} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography variant="body2" fontWeight="bold">
                        {alt.approach}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Not chosen: {alt.why_not_chosen}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Confidence & Trust */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Confidence & Trust Signals</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Overall Confidence</TableCell>
                <TableCell>
                  <Chip
                    label={`${(run.confidence.overall_confidence * 100).toFixed(0)}%`}
                    color={getConfidenceColor(run.confidence.overall_confidence)}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Confidence Basis</TableCell>
                <TableCell>{run.confidence.confidence_basis}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Evidence Count</TableCell>
                <TableCell>{run.confidence.evidence_count}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Evidence Quality</TableCell>
                <TableCell>
                  <Chip label={run.confidence.evidence_quality} size="small" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Source Count</TableCell>
                <TableCell>{run.confidence.source_count}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Source Reliability</TableCell>
                <TableCell>
                  <Chip
                    label={run.confidence.source_reliability}
                    size="small"
                    color={run.confidence.source_reliability === 'verified' ? 'success' : 'default'}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {/* Policy Decisions */}
      {run.policy_decisions.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Policy Decisions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {run.policy_decisions.map((pd) => (
                <Card key={pd.decision_id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">{pd.policy_name}</Typography>
                      <Chip
                        label={pd.decision}
                        size="small"
                        color={pd.decision === 'allow' ? 'success' : 'error'}
                      />
                      <Chip label={pd.risk_level} size="small" color={getRiskColor(pd.risk_level)} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {pd.rationale}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Provenance Links */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Provenance & Artifacts</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {run.provenance_links.provenance_chain_id && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Provenance Chain
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {run.provenance_links.provenance_chain_id}
                </Typography>
              </Box>
            )}

            {run.provenance_links.claims.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Claims ({run.provenance_links.claims.length})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {run.provenance_links.claims.map((claim) => (
                    <Chip
                      key={claim.claim_id}
                      label={`${claim.claim_type} (${(claim.confidence * 100).toFixed(0)}%)`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {run.outputs.artifacts.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Artifacts ({run.outputs.artifacts.length})
                </Typography>
                {run.outputs.artifacts.map((artifact) => (
                  <Card key={artifact.artifact_id} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={artifact.artifact_type} size="small" />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                          {artifact.artifact_id.slice(0, 12)}...
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {run.audit_event_ids.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Audit Trail
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {run.audit_event_ids.length} audit event(s) linked
                </Typography>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Assumptions & Limitations */}
      {(run.assumptions.length > 0 || run.limitations.length > 0) && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Assumptions & Limitations</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {run.assumptions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Assumptions
                  </Typography>
                  {run.assumptions.map((assumption) => (
                    <Card key={assumption.assumption_id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip label={assumption.risk_if_false} size="small" color={getRiskColor(assumption.risk_if_false)} />
                          {assumption.validated && <Chip label="Validated" size="small" color="success" />}
                        </Stack>
                        <Typography variant="body2">{assumption.description}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {run.limitations.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Limitations
                  </Typography>
                  {run.limitations.map((limitation) => (
                    <Card key={limitation.limitation_id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip label={limitation.category} size="small" />
                          <Chip label={limitation.impact} size="small" color={getRiskColor(limitation.impact)} />
                        </Stack>
                        <Typography variant="body2">{limitation.description}</Typography>
                        {limitation.mitigation && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Mitigation: {limitation.mitigation}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Inputs/Outputs (Redacted) */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Inputs & Outputs</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Inputs
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <pre style={{ fontSize: '0.85em', overflow: 'auto' }}>
                    {JSON.stringify(run.inputs.parameters, null, 2)}
                  </pre>
                  {(run.inputs.pii_fields_redacted.length > 0 || run.inputs.secret_fields_redacted.length > 0) && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {run.inputs.pii_fields_redacted.length} PII field(s) redacted,{' '}
                      {run.inputs.secret_fields_redacted.length} secret(s) redacted
                    </Alert>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Hash: {run.inputs.input_hash}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Outputs
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <pre style={{ fontSize: '0.85em', overflow: 'auto' }}>
                    {JSON.stringify(run.outputs.results, null, 2)}
                  </pre>
                  {(run.outputs.pii_fields_redacted.length > 0 || run.outputs.secret_fields_redacted.length > 0) && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {run.outputs.pii_fields_redacted.length} PII field(s) redacted,{' '}
                      {run.outputs.secret_fields_redacted.length} secret(s) redacted
                    </Alert>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Hash: {run.outputs.output_hash}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default RunDetailView;
