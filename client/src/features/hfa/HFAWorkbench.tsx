import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Gavel,
  Warning as WarningIcon,
  Insights,
  AddCircle,
} from '@mui/icons-material';

interface DatasetSummary {
  id: string;
  name: string;
  description?: string;
  labelOptions?: string[];
  totalAnnotations: number;
  goldDecisions: number;
}

interface Metrics {
  datasetId: string;
  krippendorffAlpha: number;
  averageCohenKappa: number | null;
  unresolvedDisagreements: number;
  adjudicatedSamples: number;
  annotatedSamples: number;
  totalAnnotations: number;
  annotatorThroughput: Array<{ annotatorId: string; count: number }>;
  pairwiseKappa: Array<{ annotators: [string, string]; kappa: number; support: number }>;
}

interface LabelRecord {
  sampleId: string;
  annotatorId: string;
  label: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

interface Disagreement {
  sampleId: string;
  entropy: number;
  totalAnnotations: number;
  labelHistogram: Record<string, number>;
  annotations: LabelRecord[];
}

interface GoldDecision {
  sampleId: string;
  label: string;
  adjudicator: string;
  rationale?: string;
  decidedAt: string;
}

interface BiasAlert {
  id: string;
  annotatorId: string;
  type: string;
  magnitude: number;
  triggeredAt: string;
  resolved: boolean;
  resolvedAt?: string;
  details: string;
}

const API_ROOT = '/api/hfa';

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? response.statusText);
  }
  return (await response.json()) as T;
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(2);
};

const emptyMetrics = Object.freeze({
  datasetId: '',
  krippendorffAlpha: 0,
  averageCohenKappa: null,
  unresolvedDisagreements: 0,
  adjudicatedSamples: 0,
  annotatedSamples: 0,
  totalAnnotations: 0,
  annotatorThroughput: [],
  pairwiseKappa: [],
});

const HFAWorkbench: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics as Metrics);
  const [disagreements, setDisagreements] = useState<Disagreement[]>([]);
  const [gold, setGold] = useState<GoldDecision[]>([]);
  const [alerts, setAlerts] = useState<BiasAlert[]>([]);
  const [status, setStatus] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [creatingDataset, setCreatingDataset] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetLabels, setDatasetLabels] = useState('approve,reject,skip');
  const [singleLabelDraft, setSingleLabelDraft] = useState({
    sampleId: '',
    annotatorId: '',
    label: '',
  });
  const [bulkPayload, setBulkPayload] = useState('');
  const [adjudicator, setAdjudicator] = useState('lead-arbiter');
  const [adjudicationDrafts, setAdjudicationDrafts] = useState<Record<string, { label: string; rationale: string }>>({});
  const [exportPreview, setExportPreview] = useState('');
  const [importPayload, setImportPayload] = useState('');
  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId),
    [datasets, selectedDatasetId],
  );

  const showStatus = (severity: 'success' | 'error' | 'info', message: string) => {
    setStatus({ severity, message });
  };

  const loadDatasets = async () => {
    try {
      const response = await fetchJson<{ datasets: DatasetSummary[] }>(`${API_ROOT}/datasets`);
      setDatasets(response.datasets);
      if (!selectedDatasetId && response.datasets.length > 0) {
        setSelectedDatasetId(response.datasets[0].id);
      }
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  const loadDatasetDetails = async (datasetId: string) => {
    if (!datasetId) {
      return;
    }
    try {
      const response = await fetchJson<{
        dataset: DatasetSummary & { labelOptions?: string[] };
        metrics: Metrics;
        disagreements: Disagreement[];
      }>(`${API_ROOT}/datasets/${datasetId}`);
      setMetrics(response.metrics);
      setDisagreements(response.disagreements);
      const goldResponse = await fetchJson<{ gold: GoldDecision[] }>(`${API_ROOT}/datasets/${datasetId}/gold`);
      setGold(goldResponse.gold);
      const alertsResponse = await fetchJson<{ alerts: BiasAlert[] }>(`${API_ROOT}/datasets/${datasetId}/bias-alerts`);
      setAlerts(alertsResponse.alerts);
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  useEffect(() => {
    loadDatasets().catch((error) => {
      showStatus('error', (error as Error).message);
    });
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      loadDatasetDetails(selectedDatasetId).catch((error) => {
        showStatus('error', (error as Error).message);
      });
    }
  }, [selectedDatasetId]);

  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      showStatus('error', 'Dataset name is required');
      return;
    }
    setCreatingDataset(true);
    try {
      const labelOptions = datasetLabels
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean);
      const response = await fetchJson<{ dataset: DatasetSummary }>(`${API_ROOT}/datasets`, {
        method: 'POST',
        body: JSON.stringify({
          name: datasetName,
          description: datasetDescription,
          labelOptions,
        }),
      });
      showStatus('success', `Dataset "${response.dataset.name}" created`);
      setDatasetName('');
      setDatasetDescription('');
      await loadDatasets();
      setSelectedDatasetId(response.dataset.id);
    } catch (error) {
      showStatus('error', (error as Error).message);
    } finally {
      setCreatingDataset(false);
    }
  };

  const handleSingleIngest = async () => {
    if (!selectedDatasetId) {
      showStatus('error', 'Select a dataset before ingesting labels');
      return;
    }
    if (!singleLabelDraft.sampleId || !singleLabelDraft.annotatorId || !singleLabelDraft.label) {
      showStatus('error', 'Sample, annotator, and label are required');
      return;
    }
    try {
      await fetchJson(`${API_ROOT}/datasets/${selectedDatasetId}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labels: [singleLabelDraft] }),
      });
      showStatus('success', 'Label recorded');
      setSingleLabelDraft({ sampleId: '', annotatorId: '', label: '' });
      await loadDatasetDetails(selectedDatasetId);
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  const handleBulkIngest = async () => {
    if (!selectedDatasetId) {
      showStatus('error', 'Select a dataset before ingesting labels');
      return;
    }
    try {
      const parsed = JSON.parse(bulkPayload) as LabelRecord[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Paste an array of label records');
      }
      await fetchJson(`${API_ROOT}/datasets/${selectedDatasetId}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labels: parsed }),
      });
      showStatus('success', `Ingested ${parsed.length} label(s)`);
      setBulkPayload('');
      await loadDatasetDetails(selectedDatasetId);
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  const handleAdjudicate = async (sampleId: string) => {
    if (!selectedDatasetId) {
      showStatus('error', 'Select a dataset first');
      return;
    }
    const draft = adjudicationDrafts[sampleId];
    if (!draft?.label) {
      showStatus('error', 'Select a gold label before adjudicating');
      return;
    }
    try {
      const response = await fetchJson<{
        metrics: Metrics;
        disagreements: Disagreement[];
        gold: GoldDecision[];
      }>(`${API_ROOT}/datasets/${selectedDatasetId}/adjudicate`, {
        method: 'POST',
        body: JSON.stringify({
          sampleId,
          label: draft.label,
          adjudicator,
          rationale: draft.rationale,
        }),
      });
      setMetrics(response.metrics);
      setDisagreements(response.disagreements);
      setGold(response.gold);
      showStatus('success', `Adjudicated ${sampleId}`);
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  const handleExport = async () => {
    if (!selectedDatasetId) {
      showStatus('error', 'Select a dataset to export');
      return;
    }
    try {
      const payload = await fetchJson(`${API_ROOT}/datasets/${selectedDatasetId}/export`);
      const pretty = JSON.stringify(payload, null, 2);
      setExportPreview(pretty);
      navigator.clipboard?.writeText(pretty).catch(() => {
        // Clipboard might be unavailable in some environments; ignore errors
      });
      showStatus('success', 'Export ready (copied to clipboard when permitted)');
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importPayload);
      const response = await fetchJson<{ dataset: DatasetSummary }>(`${API_ROOT}/import`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      showStatus('success', `Imported dataset ${response.dataset.name}`);
      setImportPayload('');
      await loadDatasets();
      setSelectedDatasetId(response.dataset.id);
    } catch (error) {
      showStatus('error', (error as Error).message);
    }
  };

  const labelOptions = useMemo(() => {
    if (selectedDataset?.labelOptions?.length) {
      return selectedDataset.labelOptions;
    }
    const fromDisagreements = disagreements.flatMap((item) => Object.keys(item.labelHistogram));
    const fromGold = gold.map((decision) => decision.label);
    return Array.from(new Set([...fromDisagreements, ...fromGold]));
  }, [selectedDataset, disagreements, gold]);

  return (
    <Box>
      <Typography variant="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Insights color="primary" /> Human Feedback Arbitration Workbench
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Ingest annotator labels, measure agreement, triage disagreements, and maintain an auditable gold set with drift monitoring.
      </Typography>

      {status && (
        <Alert severity={status.severity} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Datasets</Typography>
                <IconButton aria-label="refresh datasets" onClick={() => loadDatasets()}>
                  <RefreshIcon />
                </IconButton>
              </Stack>
              <TextField
                select
                fullWidth
                label="Select dataset"
                value={selectedDatasetId}
                onChange={(event) => setSelectedDatasetId(event.target.value)}
                sx={{ mb: 2 }}
              >
                {datasets.map((dataset) => (
                  <MenuItem key={dataset.id} value={dataset.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">{dataset.name}</Typography>
                      <Chip label={`${dataset.totalAnnotations} labels`} size="small" color="primary" />
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>

              <Divider sx={{ my: 2 }}>Create</Divider>

              <Stack spacing={2}>
                <TextField
                  label="Dataset name"
                  value={datasetName}
                  onChange={(event) => setDatasetName(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={datasetDescription}
                  onChange={(event) => setDatasetDescription(event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Label options (comma separated)"
                  value={datasetLabels}
                  onChange={(event) => setDatasetLabels(event.target.value)}
                  helperText="Used to populate adjudication selectors"
                />
                <Button
                  variant="contained"
                  startIcon={<AddCircle />}
                  onClick={handleCreateDataset}
                  disabled={creatingDataset}
                >
                  Create dataset
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Agreement Snapshot
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Krippendorff's α
                      </Typography>
                      <Typography variant="h4">{formatNumber(metrics.krippendorffAlpha)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Mean Cohen's κ
                      </Typography>
                      <Typography variant="h4">{formatNumber(metrics.averageCohenKappa)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Unresolved disagreements
                      </Typography>
                      <Typography variant="h4">{metrics.unresolvedDisagreements}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Adjudicated samples
                      </Typography>
                      <Typography variant="h4">{metrics.adjudicatedSamples}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {metrics.annotatorThroughput.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Annotator throughput
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {metrics.annotatorThroughput.map((entry) => (
                      <Chip
                        key={entry.annotatorId}
                        label={`${entry.annotatorId}: ${entry.count}`}
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ingest labels
              </Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Sample ID"
                    value={singleLabelDraft.sampleId}
                    onChange={(event) =>
                      setSingleLabelDraft((prev) => ({ ...prev, sampleId: event.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Annotator"
                    value={singleLabelDraft.annotatorId}
                    onChange={(event) =>
                      setSingleLabelDraft((prev) => ({ ...prev, annotatorId: event.target.value }))
                    }
                    fullWidth
                  />
                </Stack>
                <TextField
                  select
                  label="Label"
                  value={singleLabelDraft.label}
                  onChange={(event) =>
                    setSingleLabelDraft((prev) => ({ ...prev, label: event.target.value }))
                  }
                >
                  {labelOptions.length === 0 && <MenuItem value="">Add labels via settings</MenuItem>}
                  {labelOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" onClick={handleSingleIngest}>
                  Record label
                </Button>
                <Divider>Bulk JSON</Divider>
                <TextField
                  label="[{ ...labelRecord }]"
                  value={bulkPayload}
                  onChange={(event) => setBulkPayload(event.target.value)}
                  multiline
                  minRows={4}
                  placeholder='[
  { "sampleId": "doc-1", "annotatorId": "ann-a", "label": "approve" }
]'
                />
                <Button variant="outlined" onClick={handleBulkIngest}>
                  Ingest bulk
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Bias & drift alerts</Typography>
                <WarningIcon color="warning" />
              </Stack>
              {alerts.length === 0 ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  No active alerts detected.
                </Alert>
              ) : (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      severity={alert.resolved ? 'info' : 'warning'}
                      icon={<WarningIcon />}
                    >
                      <strong>{alert.annotatorId}</strong> · {alert.type.toUpperCase()} ·{' '}
                      {alert.details} (m={formatNumber(alert.magnitude)})
                      {!alert.resolved ? '' : ` · resolved ${new Date(alert.resolvedAt ?? '').toLocaleString()}`}
                    </Alert>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gavel /> Active disagreements
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <TextField
                    label="Adjudicator"
                    value={adjudicator}
                    onChange={(event) => setAdjudicator(event.target.value)}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => selectedDatasetId && loadDatasetDetails(selectedDatasetId)}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Stack>
              {disagreements.length === 0 ? (
                <Alert severity="info">No disagreements to review.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sample</TableCell>
                      <TableCell>Labels</TableCell>
                      <TableCell>Entropy</TableCell>
                      <TableCell width="25%">Adjudication</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {disagreements.map((item) => (
                      <TableRow key={item.sampleId} hover>
                        <TableCell>
                          <Typography variant="subtitle2">{item.sampleId}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.totalAnnotations} annotations
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            {Object.entries(item.labelHistogram).map(([label, count]) => (
                              <Chip key={label} label={`${label}: ${count}`} color="primary" variant="outlined" />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>{formatNumber(item.entropy)}</TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={adjudicationDrafts[item.sampleId]?.label ?? ''}
                              onChange={(event) =>
                                setAdjudicationDrafts((prev) => ({
                                  ...prev,
                                  [item.sampleId]: {
                                    label: event.target.value,
                                    rationale: prev[item.sampleId]?.rationale ?? '',
                                  },
                                }))
                              }
                            >
                              {labelOptions.map((option) => (
                                <MenuItem key={`${item.sampleId}-${option}`} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              placeholder="Rationale"
                              fullWidth
                              size="small"
                              value={adjudicationDrafts[item.sampleId]?.rationale ?? ''}
                              onChange={(event) =>
                                setAdjudicationDrafts((prev) => ({
                                  ...prev,
                                  [item.sampleId]: {
                                    label: prev[item.sampleId]?.label ?? '',
                                    rationale: event.target.value,
                                  },
                                }))
                              }
                            />
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Gavel />}
                              onClick={() => handleAdjudicate(item.sampleId)}
                            >
                              Set gold
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gold set overview
              </Typography>
              {gold.length === 0 ? (
                <Alert severity="info">No adjudications yet.</Alert>
              ) : (
                <Stack spacing={1}>
                  {gold.map((decision) => (
                    <Alert
                      key={decision.sampleId}
                      severity="success"
                      icon={<Gavel />}
                    >
                      <strong>{decision.sampleId}</strong> → {decision.label} · {decision.adjudicator}
                    </Alert>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Audit packs
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
                    Export dataset
                  </Button>
                  <Button variant="outlined" startIcon={<UploadIcon />} onClick={handleImport}>
                    Import dataset
                  </Button>
                </Stack>
                <TextField
                  label="Export preview"
                  value={exportPreview}
                  onChange={(event) => setExportPreview(event.target.value)}
                  multiline
                  minRows={4}
                  placeholder="Exports appear here after running an export"
                />
                <TextField
                  label="Import payload"
                  value={importPayload}
                  onChange={(event) => setImportPayload(event.target.value)}
                  multiline
                  minRows={4}
                  placeholder="Paste a previously exported dataset payload"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HFAWorkbench;
