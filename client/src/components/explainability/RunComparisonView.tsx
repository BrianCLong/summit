/**
 * Run Comparison View Component
 *
 * Side-by-side comparison of two runs showing deltas in inputs, outputs, and confidence.
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
  Grid,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Button,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  CompareArrows as CompareArrowsIcon,
} from '@mui/icons-material';

type DiffValue = { before: unknown; after: unknown };

interface RunSummary {
  run_type: string;
  explanation: { summary: string };
  confidence: { overall_confidence: number };
  actor: { actor_name: string };
  started_at: string;
}

interface RunComparison {
  run_a: RunSummary;
  run_b: RunSummary;
  deltas: {
    input_diff: Record<string, DiffValue>;
    output_diff: Record<string, DiffValue>;
    confidence_delta: number;
    duration_delta_ms: number | null;
    different_capabilities: string[];
    different_policies: string[];
  };
}

interface RunComparisonViewProps {
  runIdA?: string;
  runIdB?: string;
}

const RunComparisonView: React.FC<RunComparisonViewProps> = ({ runIdA, runIdB }) => {
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runA, setRunA] = useState(runIdA || '');
  const [runB, setRunB] = useState(runIdB || '');

  const handleCompare = useCallback(async (overrideA?: string, overrideB?: string) => {
    const compareA = overrideA ?? runA;
    const compareB = overrideB ?? runB;

    if (!compareA || !compareB) {
      setError('Please provide both run IDs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/explainability/compare?run_a=${compareA}&run_b=${compareB}`,
      );
      const result = await response.json();

      if (result.success) {
        setComparison(result.data);
      } else {
        setError(result.errors?.[0]?.message || 'Failed to compare runs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [runA, runB]);

  useEffect(() => {
    if (runIdA) setRunA(runIdA);
    if (runIdB) setRunB(runIdB);
  }, [runIdA, runIdB]);

  useEffect(() => {
    if (runIdA && runIdB) {
      void handleCompare(runIdA, runIdB);
    }
  }, [runIdA, runIdB, handleCompare]);

  const getConfidenceTrend = (delta: number) => {
    if (delta > 0.05) return <TrendingUpIcon color="success" />;
    if (delta < -0.05) return <TrendingDownIcon color="error" />;
    return <TrendingFlatIcon color="action" />;
  };

  const getDurationTrend = (deltaMs: number | null) => {
    if (deltaMs === null) return null;
    if (deltaMs < -100) return <TrendingUpIcon color="success" titleAccess="Faster" />;
    if (deltaMs > 100) return <TrendingDownIcon color="error" titleAccess="Slower" />;
    return <TrendingFlatIcon color="action" titleAccess="Similar" />;
  };

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Run Comparison
      </Typography>

      {/* Input Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Run A ID"
              value={runA}
              onChange={(e) => setRunA(e.target.value)}
              placeholder="Enter first run ID"
              sx={{ flexGrow: 1 }}
            />
            <CompareArrowsIcon />
            <TextField
              label="Run B ID"
              value={runB}
              onChange={(e) => setRunB(e.target.value)}
              placeholder="Enter second run ID"
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              onClick={() => void handleCompare()}
              disabled={loading || !runA || !runB}
            >
              Compare
            </Button>
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

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary Comparison */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Run A
                      </Typography>
                      <Typography variant="h6">{comparison.run_a.run_type}</Typography>
                      <Typography variant="body2">{comparison.run_a.explanation.summary}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Chip
                          label={`Confidence: ${(comparison.run_a.confidence.overall_confidence * 100).toFixed(0)}%`}
                          size="small"
                        />
                        <Chip
                          label={`${comparison.run_a.actor.actor_name}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Started: {formatTimestamp(comparison.run_a.started_at)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Run B
                      </Typography>
                      <Typography variant="h6">{comparison.run_b.run_type}</Typography>
                      <Typography variant="body2">{comparison.run_b.explanation.summary}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Chip
                          label={`Confidence: ${(comparison.run_b.confidence.overall_confidence * 100).toFixed(0)}%`}
                          size="small"
                        />
                        <Chip
                          label={`${comparison.run_b.actor.actor_name}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Started: {formatTimestamp(comparison.run_b.started_at)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Deltas */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deltas
              </Typography>

              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <strong>Confidence Change</strong>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {getConfidenceTrend(comparison.deltas.confidence_delta)}
                        <Typography>
                          {comparison.deltas.confidence_delta > 0 ? '+' : ''}
                          {(comparison.deltas.confidence_delta * 100).toFixed(1)}%
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>

                  {comparison.deltas.duration_delta_ms !== null && (
                    <TableRow>
                      <TableCell>
                        <strong>Duration Change</strong>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getDurationTrend(comparison.deltas.duration_delta_ms)}
                          <Typography>
                            {comparison.deltas.duration_delta_ms > 0 ? '+' : ''}
                            {(comparison.deltas.duration_delta_ms / 1000).toFixed(2)}s
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}

                  {comparison.deltas.different_capabilities.length > 0 && (
                    <TableRow>
                      <TableCell>
                        <strong>Different Capabilities</strong>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {comparison.deltas.different_capabilities.map((cap) => (
                            <Chip key={cap} label={cap} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}

                  {comparison.deltas.different_policies.length > 0 && (
                    <TableRow>
                      <TableCell>
                        <strong>Different Policies</strong>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {comparison.deltas.different_policies.map((policy) => (
                            <Chip key={policy} label={policy} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Input Differences */}
          {Object.keys(comparison.deltas.input_diff).length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Input Differences
                </Typography>
                <Table size="small">
                  <TableBody>
                    {Object.entries(comparison.deltas.input_diff).map(([key, diff]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <strong>{key}</strong>
                        </TableCell>
                        <TableCell>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Before (Run A)
                              </Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.before, null, 2)}
                              </pre>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                After (Run B)
                              </Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.after, null, 2)}
                              </pre>
                            </Grid>
                          </Grid>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Output Differences */}
          {Object.keys(comparison.deltas.output_diff).length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Output Differences
                </Typography>
                <Table size="small">
                  <TableBody>
                    {Object.entries(comparison.deltas.output_diff).map(([key, diff]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <strong>{key}</strong>
                        </TableCell>
                        <TableCell>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Before (Run A)
                              </Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.before, null, 2)}
                              </pre>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                After (Run B)
                              </Typography>
                              <pre style={{ fontSize: '0.85em', margin: 0 }}>
                                {JSON.stringify(diff.after, null, 2)}
                              </pre>
                            </Grid>
                          </Grid>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* No Differences */}
          {Object.keys(comparison.deltas.input_diff).length === 0 &&
            Object.keys(comparison.deltas.output_diff).length === 0 &&
            comparison.deltas.different_capabilities.length === 0 &&
            comparison.deltas.different_policies.length === 0 && (
              <Alert severity="info">
                Runs are identical in inputs, outputs, capabilities, and policies. Only temporal and
                confidence differences may exist.
              </Alert>
            )}
        </>
      )}

      {!comparison && !loading && !error && (
        <Alert severity="info">Enter two run IDs above to compare them.</Alert>
      )}
    </Box>
  );
};

export default RunComparisonView;
