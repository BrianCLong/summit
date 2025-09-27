import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AuditEvent,
  DryRunResult,
  RolloutManifest,
  RolloutResult,
  StatusResponse,
  createSampleManifest,
  fetchStatus,
  submitDryRun,
  submitRollout,
} from './api';

function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function manifestToString(manifest: RolloutManifest): string {
  return JSON.stringify(manifest, null, 2);
}

function parseManifest(input: string): RolloutManifest {
  const parsed = JSON.parse(input) as RolloutManifest;
  if (!parsed.id || !parsed.signature) {
    throw new Error('Manifest must include an id and signature');
  }
  return parsed;
}

interface MetricsPanelProps {
  title: string;
  metrics: RolloutResult['metrics'];
}

function MetricsPanel({ title, metrics }: MetricsPanelProps) {
  return (
    <Card variant="outlined">
      <CardHeader title={title} />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Block Rate</Typography>
            <Typography variant="h5">{formatNumber(metrics.canary.blockRate)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Control: {formatNumber(metrics.control.blockRate)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">FN Canary Catches</Typography>
            <Typography variant="h5">{formatNumber(metrics.canary.fnCanaryCatches)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Control: {formatNumber(metrics.control.fnCanaryCatches)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Latency (ms)</Typography>
            <Typography variant="h5">{formatNumber(metrics.canary.latencyMs)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Control: {formatNumber(metrics.control.latencyMs)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function AuditTrail({ entries }: { entries: AuditEvent[] }) {
  if (!entries.length) {
    return <Typography color="text.secondary">No audit activity recorded yet.</Typography>;
  }

  return (
    <Stack spacing={1} divider={<Divider flexItem orientation="horizontal" />}>
      {entries
        .slice()
        .reverse()
        .map((entry) => (
          <Box key={`${entry.manifestId}-${entry.timestamp}`}>
            <Typography variant="subtitle2">{entry.outcome.toUpperCase()}</Typography>
            <Typography variant="body2" color="text.secondary">
              Manifest {entry.manifestId} · Policy {entry.policyVersion} · {formatTimestamp(entry.timestamp)}
            </Typography>
            <Typography variant="body1">{entry.reason}</Typography>
          </Box>
        ))}
    </Stack>
  );
}

function BgprDashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifestInput, setManifestInput] = useState(() => manifestToString(createSampleManifest()));
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [rolloutResult, setRolloutResult] = useState<RolloutResult | null>(null);

  const latestMetrics = useMemo(() => {
    if (rolloutResult) {
      return rolloutResult.metrics;
    }
    if (dryRunResult) {
      return {
        canary: dryRunResult.metrics.canary,
        control: dryRunResult.metrics.control,
      };
    }
    return status?.lastResult?.metrics ?? null;
  }, [dryRunResult, rolloutResult, status]);

  useEffect(() => {
    const load = async () => {
      try {
        const nextStatus = await fetchStatus();
        setStatus(nextStatus);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    void load();
  }, []);

  const handleDryRun = async () => {
    try {
      setLoading(true);
      setError(null);
      const manifest = parseManifest(manifestInput);
      const result = await submitDryRun(manifest);
      setDryRunResult(result);
      const refreshed = await fetchStatus();
      setStatus(refreshed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollout = async () => {
    try {
      setLoading(true);
      setError(null);
      const manifest = parseManifest(manifestInput);
      const result = await submitRollout(manifest);
      setRolloutResult(result);
      const refreshed = await fetchStatus();
      setStatus(refreshed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h4">Blue/Green Policy Rollouts</Typography>
      <Typography variant="body1" color="text.secondary">
        Manage signed manifests, observe deterministic canary metrics, and rely on auto-revert guardrails.
      </Typography>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Rollout Manifest" subheader="Update signature after generating with your signing tool." />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  multiline
                  minRows={14}
                  value={manifestInput}
                  onChange={(event) => setManifestInput(event.target.value)}
                  fullWidth
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: 14 } }}
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" onClick={handleDryRun} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : 'Dry Run'}
                  </Button>
                  <Button variant="contained" onClick={handleRollout} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : 'Apply Rollout'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Current Status" />
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle1">Active Policy</Typography>
                <Typography variant="h6">{status?.currentPolicy ?? 'Loading...'}</Typography>
                <Divider />
                <Typography variant="subtitle1">Last Rollout Outcome</Typography>
                <Typography>
                  {status?.lastResult
                    ? status.lastResult.reverted
                      ? 'Auto-reverted'
                      : 'Rolled out'
                    : 'No rollouts yet'}
                </Typography>
                {status?.lastResult ? (
                  <Typography variant="body2" color="text.secondary">
                    {status.lastResult.auditEvent.reason}
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {latestMetrics ? <MetricsPanel title="Latest Metrics" metrics={latestMetrics} /> : null}

      <Card variant="outlined">
        <CardHeader title="Audit Trail" />
        <CardContent>
          <AuditTrail entries={status?.auditTrail ?? []} />
        </CardContent>
      </Card>
    </Box>
  );
}

export default BgprDashboard;

