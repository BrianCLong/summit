import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import {
  DisclosureArtifact,
  DisclosureJob,
  createDisclosureExport,
  getDisclosureJob,
  listDisclosureJobs,
  sendDisclosureAnalyticsEvent,
} from '../services/disclosures';

const artifactOptions: Array<{
  key: DisclosureArtifact;
  label: string;
  description: string;
}> = [
  {
    key: 'audit-trail',
    label: 'Audit trail',
    description:
      'Immutable, redacted event logs scoped to the selected tenant and timeframe.',
  },
  {
    key: 'sbom',
    label: 'SBOMs',
    description:
      'CycloneDX manifests for orchestrated runs and dependencies referenced in the window.',
  },
  {
    key: 'attestations',
    label: 'Attestations',
    description:
      'SLSA provenance statements and associated signatures for included artifacts.',
  },
  {
    key: 'policy-reports',
    label: 'Policy reports',
    description:
      'OPA decision logs, router verdicts, and compliance checkpoints.',
  },
];

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInputValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date.toISOString();
};

const DisclosurePackagerPage: React.FC = () => {
  const [tenantId, setTenantId] = useState('default');
  const [startTime, setStartTime] = useState(
    toLocalInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  );
  const [endTime, setEndTime] = useState(toLocalInputValue(new Date()));
  const [selectedArtifacts, setSelectedArtifacts] = useState<
    DisclosureArtifact[]
  >(artifactOptions.map((option) => option.key));
  const [callbackUrl, setCallbackUrl] = useState('');
  const [jobs, setJobs] = useState<DisclosureJob[]>([]);
  const [activeJob, setActiveJob] = useState<DisclosureJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const activeJobEta = useMemo(() => {
    if (!activeJob?.createdAt) return null;
    if (!activeJob.completedAt || activeJob.status === 'running')
      return 'Export is running — target p95 < 2 minutes for 10k events.';
    const started = new Date(activeJob.createdAt).getTime();
    const finished = new Date(activeJob.completedAt).getTime();
    const diffSeconds = Math.max(0, Math.round((finished - started) / 1000));
    return `Completed in ${diffSeconds}s`;
  }, [activeJob]);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string, tenant: string) => {
      clearPolling();

      const poll = async () => {
        try {
          const job = await getDisclosureJob(tenant, jobId);
          setActiveJob(job);
          setJobs((previous) => {
            const filtered = previous.filter((item) => item.id !== job.id);
            return [job, ...filtered];
          });

          if (job.status === 'running' || job.status === 'pending') {
            pollingRef.current = window.setTimeout(poll, 3000);
          } else {
            pollingRef.current = null;
          }
        } catch (pollError: unknown) {
          const message =
            pollError instanceof Error
              ? pollError.message
              : 'Unable to poll job status';
          setError(message);
          pollingRef.current = null;
        }
      };

      poll();
    },
    [clearPolling],
  );

  const refreshJobs = useCallback(
    async (tenant: string) => {
      try {
        const results = await listDisclosureJobs(tenant);
        setJobs(results);
        const running = results.find(
          (job) => job.status === 'running' || job.status === 'pending',
        );
        const nextActive = running ?? results[0] ?? null;
        setActiveJob(nextActive);
        if (running) {
          pollJob(running.id, tenant);
        } else {
          clearPolling();
        }
      } catch (refreshError: unknown) {
        const message =
          refreshError instanceof Error
            ? refreshError.message
            : 'Failed to load disclosure jobs';
        setError(message);
      }
    },
    [pollJob, clearPolling],
  );

  useEffect(() => {
    refreshJobs(tenantId);
    sendDisclosureAnalyticsEvent('view', tenantId, {
      page: 'disclosure-packager',
    }).catch(() => undefined);
    return () => {
      clearPolling();
    };
  }, [tenantId, refreshJobs, clearPolling]);

  const handleArtifactToggle = (artifact: DisclosureArtifact) => {
    setSelectedArtifacts((previous) => {
      if (previous.includes(artifact)) {
        return previous.filter((item) => item !== artifact);
      }
      return [...previous, artifact];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        tenantId,
        startTime: fromLocalInputValue(startTime),
        endTime: fromLocalInputValue(endTime),
        artifacts: selectedArtifacts,
        callbackUrl: callbackUrl || undefined,
      };

      const job = await createDisclosureExport(payload);
      setActiveJob(job);
      setJobs((previous) => [
        job,
        ...previous.filter((item) => item.id !== job.id),
      ]);
      sendDisclosureAnalyticsEvent('start', tenantId, {
        artifacts: selectedArtifacts.length,
      }).catch(() => undefined);
      pollJob(job.id, tenantId);
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit disclosure export';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  return (
    <Box sx={{ px: 4, py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Disclosure Packager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Export an immutable disclosure bundle for auditors with audit
            events, SBOMs, attestations, and policy evidence. Bundles are
            signed, checksumed, and stored with optional callbacks for
            automation.
          </Typography>
        </Box>

        <Grid container spacing={3} component="form" onSubmit={handleSubmit}>
          <Grid item xs={12} md={7}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Timeframe & tenant
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Start"
                          type="datetime-local"
                          value={startTime}
                          onChange={(event) => setStartTime(event.target.value)}
                          fullWidth
                          required
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="End"
                          type="datetime-local"
                          value={endTime}
                          onChange={(event) => setEndTime(event.target.value)}
                          fullWidth
                          required
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Tenant ID"
                          value={tenantId}
                          onChange={(event) => setTenantId(event.target.value)}
                          fullWidth
                          required
                          helperText="Tenant isolation enforced on every export request."
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Completion webhook (optional)"
                          placeholder="https://example.com/webhooks/disclosures"
                          value={callbackUrl}
                          onChange={(event) =>
                            setCallbackUrl(event.target.value)
                          }
                          fullWidth
                          helperText="POSTed when the bundle is signed."
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Artifacts
                    </Typography>
                    <Stack spacing={1}>
                      {artifactOptions.map((option) => (
                        <FormControlLabel
                          key={option.key}
                          control={
                            <Checkbox
                              checked={selectedArtifacts.includes(option.key)}
                              onChange={() => handleArtifactToggle(option.key)}
                            />
                          }
                          label={
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle1">
                                {option.label}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {option.description}
                              </Typography>
                            </Stack>
                          }
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting || selectedArtifacts.length === 0}
                    >
                      Launch export
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => refreshJobs(tenantId)}
                      disabled={isSubmitting}
                    >
                      Refresh status
                    </Button>
                    <Tooltip title="SLO: p95 export under 2 minutes for 10k events; ≥99% success rate.">
                      <InfoIcon color="action" />
                    </Tooltip>
                  </Stack>

                  {error && <Alert severity="error">{error}</Alert>}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">Export status</Typography>
                    {!activeJob && (
                      <Alert severity="info">
                        No exports in progress. Select a timeframe and tenant,
                        choose artifacts, and launch your first bundle. The
                        packager will stream large exports and surface warnings
                        if any artifact source is missing.
                      </Alert>
                    )}
                    {activeJob && (
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle1">
                          Job {activeJob.id}
                        </Typography>
                        <Chip
                          label={activeJob.status.toUpperCase()}
                          color={
                            activeJob.status === 'completed'
                              ? 'success'
                              : activeJob.status === 'failed'
                                ? 'error'
                                : 'info'
                          }
                          variant="outlined"
                        />
                        {activeJob.status !== 'completed' &&
                          activeJob.status !== 'failed' && <LinearProgress />}
                        {activeJobEta && (
                          <Typography variant="body2" color="text.secondary">
                            {activeJobEta}
                          </Typography>
                        )}
                        {activeJob.status === 'completed' && (
                          <Stack spacing={1}>
                            <Alert severity="success">
                              Signed bundle ready. SHA256:{' '}
                              <code>{activeJob.sha256}</code>
                            </Alert>
                            {activeJob.downloadUrl && (
                              <Button
                                startIcon={<DownloadIcon />}
                                variant="contained"
                                href={activeJob.downloadUrl}
                                sx={{ alignSelf: 'flex-start' }}
                              >
                                Download zip
                              </Button>
                            )}
                          </Stack>
                        )}
                        {activeJob.status === 'failed' && (
                          <Alert severity="error">
                            Export failed{' '}
                            {activeJob.error ? `— ${activeJob.error}` : ''}.
                            Retry or check webhook logs.
                          </Alert>
                        )}
                        {activeJob.warnings.length > 0 && (
                          <Stack spacing={1}>
                            <Typography variant="subtitle2">
                              Warnings
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              {activeJob.warnings.map((warning) => (
                                <Chip
                                  key={warning}
                                  label={warning}
                                  color="warning"
                                  variant="outlined"
                                  size="small"
                                />
                              ))}
                            </Stack>
                          </Stack>
                        )}
                        {Object.keys(activeJob.artifactStats).length > 0 && (
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2">
                              Artifacts included
                            </Typography>
                            {Object.entries(activeJob.artifactStats).map(
                              ([artifact, count]) => (
                                <Typography variant="body2" key={artifact}>
                                  • {artifact}: {count.toLocaleString()} records
                                </Typography>
                              ),
                            )}
                          </Stack>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="h6">Export history</Typography>
                    {latestJobs.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Exports appear here once they complete. Use this area to
                        confirm checksum values and runbook callbacks.
                      </Typography>
                    )}
                    {latestJobs.map((job) => (
                      <Box
                        key={job.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1.5,
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Chip
                              label={job.status.toUpperCase()}
                              size="small"
                              color={
                                job.status === 'completed'
                                  ? 'success'
                                  : job.status === 'failed'
                                    ? 'error'
                                    : 'info'
                              }
                            />
                            <Typography variant="subtitle2">
                              {new Date(job.createdAt).toLocaleString()}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Artifacts:{' '}
                            {Object.keys(job.artifactStats).length || 0} •
                            Warnings: {job.warnings.length}
                          </Typography>
                          {job.downloadUrl && job.status === 'completed' && (
                            <Link href={job.downloadUrl} underline="hover">
                              Download
                            </Link>
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">Empty-state guide</Typography>
                    <Typography variant="body2" color="text.secondary">
                      1. Confirm your tenant slug and timeframe (≤31 days).
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      2. Pick the required artifacts — audit events, SBOM,
                      attestations, and policy evidence are selected by default.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      3. Optional: register a webhook for downstream regulators
                      or trust portals.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      4. Launch the export and monitor the SLO indicator.
                      Completed bundles expose download links and SHA256
                      checksums.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        <Divider />

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance runbook quick-links
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Signed disclosure bundles satisfy SOC2/ISO export requirements.
              Verify the checksum and signature before providing to regulators.
              Use the webhook to notify your trust center or evidence locker
              automatically.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default DisclosurePackagerPage;
