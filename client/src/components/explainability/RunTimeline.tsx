/**
 * Run Timeline Component
 *
 * Displays a chronological list of explainable runs (agent runs, predictions, negotiations).
 * Provides filtering and quick access to run details.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface ExplainableRun {
  run_id: string;
  run_type: string;
  actor: {
    actor_name: string;
    actor_type: string;
  };
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  explanation: {
    summary: string;
  };
  confidence: {
    overall_confidence: number;
    evidence_count: number;
  };
  capabilities_used: string[];
  policy_decisions: Array<{
    decision: string;
    policy_name: string;
  }>;
}

interface RunTimelineProps {
  tenantId: string;
  onRunSelect?: (runId: string) => void;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

const RunTimeline: React.FC<RunTimelineProps> = ({
  tenantId,
  onRunSelect,
  autoRefresh = false,
  refreshIntervalMs = 30000,
}) => {
  const [runs, setRuns] = useState<ExplainableRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    run_type: '',
    min_confidence: '',
    capability: '',
  });

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('tenant_id', tenantId);
      if (filter.run_type) params.append('run_type', filter.run_type);
      if (filter.min_confidence) params.append('min_confidence', filter.min_confidence);
      if (filter.capability) params.append('capability', filter.capability);

      const response = await fetch(`/api/explainability/runs?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setRuns(result.data || []);
      } else {
        setError(result.errors?.[0]?.message || 'Failed to fetch runs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filter, tenantId]);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchRuns, refreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshIntervalMs, fetchRuns]);

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircleIcon fontSize="small" />;
    if (confidence >= 0.5) return <WarningIcon fontSize="small" />;
    return <ErrorIcon fontSize="small" />;
  };

  const formatDuration = (ms: number | null): string => {
    if (ms === null) return 'In progress...';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Explainability Timeline
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Run Type</InputLabel>
              <Select
                value={filter.run_type}
                label="Run Type"
                onChange={(e) => setFilter({ ...filter, run_type: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="agent_run">Agent Run</MenuItem>
                <MenuItem value="prediction">Prediction</MenuItem>
                <MenuItem value="negotiation">Negotiation</MenuItem>
                <MenuItem value="policy_decision">Policy Decision</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Min Confidence"
              type="number"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
              value={filter.min_confidence}
              onChange={(e) => setFilter({ ...filter, min_confidence: e.target.value })}
              sx={{ width: 150 }}
            />

            <TextField
              label="Capability"
              value={filter.capability}
              onChange={(e) => setFilter({ ...filter, capability: e.target.value })}
              placeholder="e.g., graph_query"
              sx={{ flexGrow: 1 }}
            />

            <Tooltip title="Refresh">
              <IconButton onClick={fetchRuns} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Run List */}
      <Stack spacing={2}>
        {runs.length === 0 && !loading && (
          <Alert severity="info">No runs found. Try adjusting your filters.</Alert>
        )}

        {runs.map((run) => (
          <Card key={run.run_id} elevation={2}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flexGrow: 1 }}>
                  {/* Header */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6">{run.run_type.replace('_', ' ')}</Typography>
                    <Chip label={run.actor.actor_name} size="small" variant="outlined" />
                    <Chip
                      label={`${(run.confidence.overall_confidence * 100).toFixed(0)}%`}
                      size="small"
                      color={getConfidenceColor(run.confidence.overall_confidence)}
                      icon={getConfidenceIcon(run.confidence.overall_confidence)}
                    />
                  </Stack>

                  {/* Summary */}
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {run.explanation.summary}
                  </Typography>

                  {/* Metadata */}
                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Started: {formatTimestamp(run.started_at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Duration: {formatDuration(run.duration_ms)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Evidence: {run.confidence.evidence_count}
                    </Typography>
                  </Stack>

                  {/* Capabilities */}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {run.capabilities_used.map((cap) => (
                      <Chip key={cap} label={cap} size="small" />
                    ))}
                  </Stack>

                  {/* Policy Decisions */}
                  {run.policy_decisions.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {run.policy_decisions.map((pd, idx) => (
                        <Chip
                          key={idx}
                          label={`${pd.policy_name}: ${pd.decision}`}
                          size="small"
                          color={pd.decision === 'allow' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* Actions */}
                <Tooltip title="View Details">
                  <IconButton
                    onClick={() => onRunSelect && onRunSelect(run.run_id)}
                    color="primary"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default RunTimeline;
