import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTenant } from '@/contexts/TenantContext';

type ExportArtifact = 'audit-trail' | 'sbom' | 'attestations' | 'policy-reports';

type DisclosureScope = 'internal' | 'partner' | 'public';

interface DisclosureExportJob {
  id: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  warnings: string[];
  downloadUrl?: string;
  disclosure?: {
    scope: DisclosureScope;
  };
  retentionDays?: number;
}

const ARTIFACT_OPTIONS: Array<{ id: ExportArtifact; label: string }> = [
  { id: 'audit-trail', label: 'Audit Trail' },
  { id: 'sbom', label: 'SBOM Reports' },
  { id: 'attestations', label: 'SLSA Attestations' },
  { id: 'policy-reports', label: 'Policy Reports' },
];

const SCOPE_OPTIONS: Array<{ id: DisclosureScope; label: string; helper: string }> =
  [
    {
      id: 'internal',
      label: 'Internal',
      helper: 'Full compliance bundle with expanded redaction.',
    },
    {
      id: 'partner',
      label: 'Partner',
      helper: 'Selective disclosure for vetted partners.',
    },
    {
      id: 'public',
      label: 'Public',
      helper: 'Minimal, externally shareable disclosure set.',
    },
  ];

const ALLOWED_ARTIFACTS_BY_SCOPE: Record<DisclosureScope, ExportArtifact[]> = {
  internal: ['audit-trail', 'sbom', 'attestations', 'policy-reports'],
  partner: ['audit-trail', 'sbom', 'policy-reports'],
  public: ['sbom', 'policy-reports'],
};

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DataExportTools() {
  const { currentTenant, availableTenants, switchTenant } = useTenant();
  const [tenantId, setTenantId] = useState(currentTenant?.id ?? '');
  const [scope, setScope] = useState<DisclosureScope>('internal');
  const [artifacts, setArtifacts] = useState<ExportArtifact[]>(
    ARTIFACT_OPTIONS.map((option) => option.id),
  );
  const [allowedFields, setAllowedFields] = useState('');
  const [jobs, setJobs] = useState<DisclosureExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowedArtifacts = useMemo(
    () => ALLOWED_ARTIFACTS_BY_SCOPE[scope],
    [scope],
  );

  const defaultEnd = useMemo(() => formatDateTimeLocal(new Date()), []);
  const defaultStart = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    return formatDateTimeLocal(start);
  }, []);

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  useEffect(() => {
    if (currentTenant?.id && currentTenant.id !== tenantId) {
      setTenantId(currentTenant.id);
    }
  }, [currentTenant, tenantId]);

  useEffect(() => {
    setArtifacts((prev) => {
      const filtered = prev.filter((artifact) =>
        allowedArtifacts.includes(artifact),
      );
      return filtered.length > 0 ? filtered : allowedArtifacts;
    });
  }, [allowedArtifacts]);

  const loadJobs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/export/export', {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch export jobs');
      }
      const payload = (await response.json()) as { jobs: DisclosureExportJob[] };
      setJobs(payload.jobs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load export jobs');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const toggleArtifact = (artifact: ExportArtifact) => {
    if (!allowedArtifacts.includes(artifact)) {
      return;
    }
    setArtifacts((prev) =>
      prev.includes(artifact)
        ? prev.filter((item) => item !== artifact)
        : [...prev, artifact],
    );
  };

  const handleTenantChange = (nextTenant: string) => {
    setTenantId(nextTenant);
    switchTenant(nextTenant);
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      setError('Select a tenant before starting an export.');
      return;
    }

    const parsedAllowedFields = allowedFields
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);

    const payload = {
      tenantId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      artifacts,
      disclosure: {
        scope,
        ...(parsedAllowedFields.length
          ? { allowedFields: parsedAllowedFields }
          : {}),
      },
    };

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/export/export', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message?.error || 'Export request rejected');
      }
      const result = (await response.json()) as { job: DisclosureExportJob };
      setJobs((prev) => [result.job, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to start export');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Disclosure Export Workflow
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Initiate governed export bundles with selective disclosure and retention
        enforcement.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Tenant"
                value={tenantId}
                onChange={(event) => handleTenantChange(event.target.value)}
                fullWidth
              >
                {availableTenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                type="datetime-local"
                label="Start time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                type="datetime-local"
                label="End time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Disclosure scope"
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as DisclosureScope)
                }
                fullWidth
                helperText={
                  SCOPE_OPTIONS.find((option) => option.id === scope)?.helper
                }
              >
                {SCOPE_OPTIONS.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Allowed fields (comma separated)"
                value={allowedFields}
                onChange={(event) => setAllowedFields(event.target.value)}
                fullWidth
                helperText="Optional allowlist for selective disclosure filters."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Artifacts (allowed: {allowedArtifacts.length})
              </Typography>
              <FormGroup row>
                {ARTIFACT_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    control={
                      <Checkbox
                        checked={artifacts.includes(option.id)}
                        onChange={() => toggleArtifact(option.id)}
                        disabled={!allowedArtifacts.includes(option.id)}
                      />
                    }
                    label={option.label}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || artifacts.length === 0}
            >
              {submitting ? 'Starting export…' : 'Start export'}
            </Button>
            <Button variant="outlined" onClick={loadJobs} disabled={loading}>
              Refresh jobs
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Recent export jobs</Typography>
            {loading && <Typography>Loading…</Typography>}
          </Stack>
          {jobs.length === 0 && !loading ? (
            <Typography color="text.secondary">
              No export jobs queued for this tenant.
            </Typography>
          ) : (
            <Stack spacing={2} divider={<Divider flexItem />}>
              {jobs.map((job) => (
                <Box key={job.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2">{job.id}</Typography>
                    <Chip
                      size="small"
                      label={job.status}
                      color={
                        job.status === 'completed'
                          ? 'success'
                          : job.status === 'failed'
                            ? 'error'
                            : 'warning'
                      }
                    />
                    {job.disclosure?.scope && (
                      <Chip
                        size="small"
                        label={`Scope: ${job.disclosure.scope}`}
                      />
                    )}
                    {job.retentionDays ? (
                      <Chip
                        size="small"
                        label={`Retention: ${job.retentionDays}d`}
                      />
                    ) : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Created {new Date(job.createdAt).toLocaleString()}
                  </Typography>
                  {job.completedAt && (
                    <Typography variant="body2" color="text.secondary">
                      Completed {new Date(job.completedAt).toLocaleString()}
                    </Typography>
                  )}
                  {job.warnings?.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {job.warnings.map((warning) => (
                        <Chip key={warning} size="small" label={warning} />
                      ))}
                    </Stack>
                  )}
                  {job.downloadUrl && job.status === 'completed' && (
                    <Button
                      sx={{ mt: 1 }}
                      size="small"
                      variant="outlined"
                      href={job.downloadUrl}
                    >
                      Download bundle
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
