import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Grid,
  Stack,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import TimelineIcon from '@mui/icons-material/Timeline';
import DifferenceIcon from '@mui/icons-material/Difference';
import ShieldIcon from '@mui/icons-material/Shield';
import LineageGraph from './LineageGraph';
import ReplayManifestButton from './ReplayManifestButton';
import type {
  SnapshotSummary,
  LineageSnapshot,
  LineageDiff,
  DiffStatus,
  ReplayManifest,
} from './types';
import './eltm.css';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const secondsToReadable = (seconds: number) => {
  if (seconds < 90) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
};

const legendConfig: Array<{ status: DiffStatus; label: string }> = [
  { status: 'unchanged', label: 'Unchanged' },
  { status: 'added', label: 'Added' },
  { status: 'removed', label: 'Removed' },
  { status: 'changed', label: 'Changed' },
];

const statusChipSx: Record<DiffStatus, Record<string, unknown>> = {
  unchanged: { borderColor: '#90a4ae', color: '#546e7a', backgroundColor: '#eceff1' },
  added: { borderColor: '#2e7d32', color: '#2e7d32', backgroundColor: '#e8f5e9' },
  removed: { borderColor: '#c62828', color: '#c62828', backgroundColor: '#ffebee' },
  changed: { borderColor: '#ed6c02', color: '#ed6c02', backgroundColor: '#fff3e0' },
};

const EventLineageTimeMachine: React.FC = () => {
  const [summaries, setSummaries] = React.useState<SnapshotSummary[]>([]);
  const [timelineIndex, setTimelineIndex] = React.useState(0);
  const [loadingSnapshot, setLoadingSnapshot] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [diffError, setDiffError] = React.useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = React.useState(false);
  const [diffData, setDiffData] = React.useState<LineageDiff | null>(null);
  const [currentSnapshotId, setCurrentSnapshotId] = React.useState<string | null>(null);
  const [diffSelection, setDiffSelection] = React.useState<{ sourceId: string | null; targetId: string | null }>({
    sourceId: null,
    targetId: null,
  });
  const [manifestStatus, setManifestStatus] = React.useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const snapshotCacheRef = React.useRef<Record<string, LineageSnapshot>>({});
  const [, forceCacheRender] = React.useState(0);

  const ensureSnapshot = React.useCallback(
    async (id: string, signal?: AbortSignal) => {
      if (snapshotCacheRef.current[id]) {
        return snapshotCacheRef.current[id];
      }
      const response = await fetch(`/api/eltm/snapshots/${encodeURIComponent(id)}`, { signal });
      if (!response.ok) {
        throw new Error(`Failed to load snapshot ${id}`);
      }
      const payload = (await response.json()) as { snapshot: LineageSnapshot };
      if (!signal?.aborted) {
        snapshotCacheRef.current = { ...snapshotCacheRef.current, [id]: payload.snapshot };
        forceCacheRender((value) => value + 1);
      }
      return payload.snapshot;
    },
    [],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const loadSummaries = async () => {
      try {
        const response = await fetch('/api/eltm/snapshots', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load lineage timeline (${response.status})`);
        }
        const payload = (await response.json()) as { snapshots: SnapshotSummary[] };
        setSummaries(payload.snapshots);
        if (payload.snapshots.length) {
          const lastIndex = payload.snapshots.length - 1;
          setTimelineIndex(lastIndex);
          setDiffSelection({
            sourceId: payload.snapshots[Math.max(0, lastIndex - 1)]?.id ?? payload.snapshots[lastIndex].id,
            targetId: payload.snapshots[lastIndex].id,
          });
        }
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          const message = fetchError instanceof Error ? fetchError.message : 'Unable to load timeline';
          setError(message);
        }
      }
    };

    void loadSummaries();
    return () => controller.abort();
  }, [ensureSnapshot]);

  React.useEffect(() => {
    if (!summaries.length) return;
    const selected = summaries[timelineIndex];
    if (!selected) return;
    setCurrentSnapshotId(selected.id);
    if (snapshotCacheRef.current[selected.id]) {
      setLoadingSnapshot(false);
      return;
    }

    const controller = new AbortController();
    setLoadingSnapshot(true);
    setError(null);

    ensureSnapshot(selected.id, controller.signal)
      .catch((fetchError) => {
        if (!controller.signal.aborted) {
          const message = fetchError instanceof Error ? fetchError.message : 'Unable to load snapshot';
          setError(message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingSnapshot(false);
        }
      });

    return () => controller.abort();
  }, [summaries, timelineIndex, ensureSnapshot]);

  React.useEffect(() => {
    const { sourceId, targetId } = diffSelection;
    if (!sourceId || !targetId) return;
    const controller = new AbortController();
    setLoadingDiff(true);
    setDiffError(null);
    setDiffData(null);

    const loadDiff = async () => {
      try {
        await Promise.all([
          ensureSnapshot(sourceId, controller.signal),
          ensureSnapshot(targetId, controller.signal),
        ]);
        const response = await fetch('/api/eltm/diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId, targetId }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Diff computation failed (${response.status})`);
        }
        const payload = (await response.json()) as { diff: LineageDiff };
        if (!controller.signal.aborted) {
          setDiffData(payload.diff);
        }
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          const message = fetchError instanceof Error ? fetchError.message : 'Unable to compute diff';
          setDiffError(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDiff(false);
        }
      }
    };

    void loadDiff();
    return () => controller.abort();
  }, [diffSelection, ensureSnapshot]);

  const snapshotCache = snapshotCacheRef.current;
  const currentSnapshot = currentSnapshotId ? snapshotCache[currentSnapshotId] : undefined;
  const sourceSnapshot = diffSelection.sourceId ? snapshotCache[diffSelection.sourceId] : undefined;
  const targetSnapshot = diffSelection.targetId ? snapshotCache[diffSelection.targetId] : undefined;

  const sliderMarks = React.useMemo(
    () =>
      summaries.map((summary, index) => ({
        value: index,
        label:
          summaries.length <= 4 || index === 0 || index === summaries.length - 1
            ? formatDateLabel(summary.capturedAt)
            : '',
      })),
    [summaries],
  );

  const sliderValueText = (value: number) =>
    summaries[value] ? formatDateTime(summaries[value].capturedAt) : `${value}`;

  const handleTimelineChange = (_: Event, value: number | number[]) => {
    if (typeof value === 'number') {
      setTimelineIndex(value);
    }
  };

  const handleSourceChange = (event: SelectChangeEvent<string>) => {
    setDiffSelection((prev) => ({ ...prev, sourceId: event.target.value }));
  };

  const handleTargetChange = (event: SelectChangeEvent<string>) => {
    setDiffSelection((prev) => ({ ...prev, targetId: event.target.value }));
  };

  const currentNodeStatuses =
    diffData && currentSnapshotId === diffData.targetRunId
      ? diffData.targetNodeStatus
      : diffData && currentSnapshotId === diffData.sourceRunId
      ? diffData.sourceNodeStatus
      : undefined;

  const currentEdgeStatuses =
    diffData && currentSnapshotId === diffData.targetRunId
      ? diffData.targetEdgeStatus
      : diffData && currentSnapshotId === diffData.sourceRunId
      ? diffData.sourceEdgeStatus
      : undefined;

  const onManifestDownloaded = (manifest: ReplayManifest) => {
    setManifestStatus({
      severity: 'success',
      message: `Replay manifest locked to checksum ${manifest.artifactChecksum.slice(0, 12)}…`,
    });
  };

  const onManifestError = (message: string) => {
    setManifestStatus({ severity: 'error', message });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Event Lineage Time Machine
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 780 }}>
        Inspect causal lineage graphs for analytics jobs across commits, compare historical runs, and export
        replay manifests that lock every input, parameter, and policy to reproduce byte-identical artifacts.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          {error}
        </Alert>
      )}

      {manifestStatus && (
        <Alert severity={manifestStatus.severity} sx={{ mt: 2 }} role="status" aria-live="polite">
          {manifestStatus.message}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <TimelineIcon aria-hidden />
                <Typography variant="h6">Time slider</Typography>
              </Stack>
              <Box sx={{ mt: 3, px: { xs: 1, md: 4 } }}>
                <Slider
                  aria-label="Lineage snapshot timeline"
                  value={timelineIndex}
                  min={0}
                  max={Math.max(0, summaries.length - 1)}
                  marks={sliderMarks}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => sliderValueText(value as number)}
                  getAriaValueText={(value) => sliderValueText(value)}
                  onChange={handleTimelineChange}
                  sx={{ maxWidth: 900, mx: 'auto' }}
                />
              </Box>
              {summaries[timelineIndex] && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Selected run: <strong>{summaries[timelineIndex].label}</strong> ·
                  {' '}captured {formatDateTime(summaries[timelineIndex].capturedAt)} · commit{' '}
                  {summaries[timelineIndex].commitSha}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <ShieldIcon fontSize="small" />
                <Typography variant="h6">Run metadata</Typography>
              </Stack>
              {currentSnapshot ? (
                <List dense>
                  <ListItem>
                    <ListItemText primary="Job" secondary={currentSnapshot.jobName} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Commit" secondary={currentSnapshot.commitSha} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Triggered by" secondary={currentSnapshot.triggeredBy} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Captured"
                      secondary={formatDateTime(currentSnapshot.capturedAt)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Run duration"
                      secondary={secondsToReadable(currentSnapshot.metrics.runDurationSeconds)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Output records"
                      secondary={currentSnapshot.metrics.outputRecords.toLocaleString()}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Data freshness"
                      secondary={`${currentSnapshot.metrics.dataFreshnessHours}h`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Manifest checksum"
                      secondary={currentSnapshot.manifestChecksum}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography color="text.secondary">Select a run to view details.</Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <ReplayManifestButton
                runId={currentSnapshot?.id}
                onDownloaded={onManifestDownloaded}
                onError={onManifestError}
                disabled={!currentSnapshot}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Lineage graph
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {legendConfig.map(({ status, label }) => (
                  <Chip
                    key={status}
                    label={label}
                    className="eltm-legend-chip"
                    variant="outlined"
                    sx={statusChipSx[status]}
                    aria-label={`${label} legend item`}
                  />
                ))}
              </Stack>
              {loadingSnapshot && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 320,
                  }}
                >
                  <CircularProgress aria-label="Loading lineage snapshot" />
                </Box>
              )}
              {!loadingSnapshot && currentSnapshot && (
                <LineageGraph
                  snapshot={currentSnapshot}
                  nodeStatuses={currentNodeStatuses}
                  edgeStatuses={currentEdgeStatuses}
                  ariaLabel={`Lineage graph for run ${currentSnapshot.label}`}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <DifferenceIcon fontSize="small" />
                <Typography variant="h6">Side-by-side diff</Typography>
              </Stack>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="eltm-diff-source-label">Baseline run</InputLabel>
                    <Select
                      labelId="eltm-diff-source-label"
                      value={diffSelection.sourceId ?? ''}
                      label="Baseline run"
                      onChange={handleSourceChange}
                      aria-label="Select baseline run for diff"
                    >
                      {summaries.map((summary) => (
                        <MenuItem key={summary.id} value={summary.id}>
                          {summary.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="eltm-diff-target-label">Compare against</InputLabel>
                    <Select
                      labelId="eltm-diff-target-label"
                      value={diffSelection.targetId ?? ''}
                      label="Compare against"
                      onChange={handleTargetChange}
                      aria-label="Select comparison run for diff"
                    >
                      {summaries.map((summary) => (
                        <MenuItem key={summary.id} value={summary.id}>
                          {summary.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {diffError && (
                <Alert severity="error" sx={{ mb: 2 }} role="alert">
                  {diffError}
                </Alert>
              )}

              <Typography component="p" aria-live="polite" sx={{ mb: 2 }}>
                {diffData
                  ? `Diff summary: ${diffData.summary.addedNodes} nodes added, ${diffData.summary.removedNodes} removed, ${diffData.summary.changedNodes} changed.`
                  : 'Select two runs to compute lineage differences.'}
              </Typography>

              {loadingDiff && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress aria-label="Computing lineage diff" />
                </Box>
              )}

              {!loadingDiff && diffData && sourceSnapshot && targetSnapshot && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Baseline — {sourceSnapshot.label}
                    </Typography>
                    <LineageGraph
                      snapshot={sourceSnapshot}
                      nodeStatuses={diffData.sourceNodeStatus}
                      edgeStatuses={diffData.sourceEdgeStatus}
                      ariaLabel={`Baseline lineage graph for ${sourceSnapshot.label}`}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Comparison — {targetSnapshot.label}
                    </Typography>
                    <LineageGraph
                      snapshot={targetSnapshot}
                      nodeStatuses={diffData.targetNodeStatus}
                      edgeStatuses={diffData.targetEdgeStatus}
                      ariaLabel={`Comparison lineage graph for ${targetSnapshot.label}`}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        label={`+${diffData.summary.addedNodes} nodes`}
                        variant="outlined"
                        className="eltm-legend-chip"
                        sx={statusChipSx.added}
                      />
                      <Chip
                        label={`-${diffData.summary.removedNodes} nodes`}
                        variant="outlined"
                        className="eltm-legend-chip"
                        sx={statusChipSx.removed}
                      />
                      <Chip
                        label={`${diffData.summary.changedNodes} nodes changed`}
                        variant="outlined"
                        className="eltm-legend-chip"
                        sx={statusChipSx.changed}
                      />
                      <Chip
                        label={`Δ edges: +${diffData.summary.addedEdges} / -${diffData.summary.removedEdges}`}
                        variant="outlined"
                        className="eltm-legend-chip"
                        sx={statusChipSx.changed}
                      />
                    </Stack>
                    <List dense>
                      {diffData.nodeDiff.added.map((node) => (
                        <ListItem key={`added-${node.id}`}>
                          <ListItemText primary={`Added ${node.type} ${node.name}`} secondary={`Version ${node.version}`} />
                        </ListItem>
                      ))}
                      {diffData.nodeDiff.removed.map((node) => (
                        <ListItem key={`removed-${node.id}`}>
                          <ListItemText primary={`Removed ${node.type} ${node.name}`} secondary={`Version ${node.version}`} />
                        </ListItem>
                      ))}
                      {diffData.nodeDiff.changed.map((change) => (
                        <ListItem key={`changed-${change.nodeId}`}>
                          <ListItemText
                            primary={`Changed ${change.after.type} ${change.after.name}`}
                            secondary={`Fields: ${change.changedFields.join(', ')}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EventLineageTimeMachine;
