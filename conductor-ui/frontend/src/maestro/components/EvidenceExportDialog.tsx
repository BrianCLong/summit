import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  FileDownloadOutlined as DownloadIcon,
  VerifiedUserOutlined as VerifyIcon,
  ArticleOutlined as DocumentIcon,
  CheckCircleOutlined as CheckIcon,
  WarningAmberOutlined as WarningIcon,
  ContentCopyOutlined as CopyIcon,
  FolderZipOutlined as BundleIcon,
} from '@mui/icons-material';

interface EvidenceExportDialogProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  nodeId?: string;
}

interface ExportOptions {
  format: 'json' | 'yaml' | 'zip';
  includeArtifacts: boolean;
  includeSBOM: boolean;
  includeAttestations: boolean;
  signBundle: boolean;
}

interface ExportResult {
  evidenceId: string;
  hash: string;
  signature?: string;
  downloadUrl: string;
  verifyUrl: string;
  artifacts?: {
    id: string;
    type: string;
    name: string;
    size: number;
  }[];
}

export const EvidenceExportDialog: React.FC<EvidenceExportDialogProps> = ({
  open,
  onClose,
  runId,
  nodeId,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    includeArtifacts: true,
    includeSBOM: true,
    includeAttestations: true,
    signBundle: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [verification, setVerification] = useState<object | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/maestro/v1/evidence/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runId,
          nodeId,
          format: options.format,
          includeArtifacts: options.includeArtifacts,
          sign: options.signBundle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      setExportResult(result);
      setActiveStep(2);

      // Auto-verify if signed
      if (result.signature) {
        await handleVerify(result.evidenceId, result.signature, result.hash);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (
    evidenceId?: string,
    signature?: string,
    expectedHash?: string,
  ) => {
    const id = evidenceId || exportResult?.evidenceId;
    if (!id) return;

    try {
      const response = await fetch(`/api/maestro/v1/evidence/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signature || exportResult?.signature,
          expectedHash: expectedHash || exportResult?.hash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.statusText}`);
      }

      const result = await response.json();
      setVerification(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleDownload = async () => {
    if (!exportResult?.downloadUrl) return;

    try {
      const response = await fetch(exportResult.downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${runId}-${Date.now()}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  };

  const renderConfigurationStep = () => (
    <Box sx={{ p: 2 }}>
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Export Format</FormLabel>
        <RadioGroup
          value={options.format}
          onChange={(e) =>
            setOptions({
              ...options,
              format: e.target.value as 'json' | 'yaml' | 'zip',
            })
          }
          row
        >
          <FormControlLabel value="json" control={<Radio />} label="JSON" />
          <FormControlLabel value="yaml" control={<Radio />} label="YAML" />
          <FormControlLabel
            value="zip"
            control={<Radio />}
            label="ZIP Bundle"
          />
        </RadioGroup>
      </FormControl>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Include Components
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={options.includeArtifacts}
              onChange={(e) =>
                setOptions({ ...options, includeArtifacts: e.target.checked })
              }
            />
          }
          label="Artifacts (logs, configs, outputs)"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={options.includeSBOM}
              onChange={(e) =>
                setOptions({ ...options, includeSBOM: e.target.checked })
              }
            />
          }
          label="Software Bill of Materials (SBOM)"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={options.includeAttestations}
              onChange={(e) =>
                setOptions({
                  ...options,
                  includeAttestations: e.target.checked,
                })
              }
            />
          }
          label="Security Attestations"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={options.signBundle}
              onChange={(e) =>
                setOptions({ ...options, signBundle: e.target.checked })
              }
            />
          }
          label="Digital Signature"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Evidence Bundle Contents:</strong>
        </Typography>
        <Typography variant="body2">
          • Decision trace and routing information
        </Typography>
        <Typography variant="body2">• Input parameters and context</Typography>
        <Typography variant="body2">• Output results and metadata</Typography>
        {options.includeArtifacts && (
          <Typography variant="body2">
            • Execution artifacts and logs
          </Typography>
        )}
        {options.signBundle && (
          <Typography variant="body2">
            • Cryptographic signature for integrity verification
          </Typography>
        )}
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => setActiveStep(1)}
          startIcon={<BundleIcon />}
        >
          Configure Export
        </Button>
      </Box>
    </Box>
  );

  const renderGenerationStep = () => (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Export Configuration
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2">Run ID:</Typography>
            <Typography variant="body2" fontFamily="monospace">
              {runId}
            </Typography>
          </Box>
          {nodeId && (
            <Box>
              <Typography variant="subtitle2">Node ID:</Typography>
              <Typography variant="body2" fontFamily="monospace">
                {nodeId}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="subtitle2">Format:</Typography>
            <Chip label={options.format.toUpperCase()} size="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2">Signature:</Typography>
            <Chip
              label={options.signBundle ? 'Enabled' : 'Disabled'}
              size="small"
              color={options.signBundle ? 'success' : 'default'}
            />
          </Box>
        </Box>
      </Paper>

      {loading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 3,
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2">Generating evidence bundle...</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button onClick={() => setActiveStep(0)}>Back</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={16} /> : <DocumentIcon />
          }
        >
          {loading ? 'Generating...' : 'Generate Bundle'}
        </Button>
      </Box>
    </Box>
  );

  const renderVerificationStep = () => (
    <Box sx={{ p: 2 }}>
      {exportResult && (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Evidence bundle generated successfully!</strong>
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Bundle Information
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Evidence ID:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontFamily="monospace">
                  {exportResult.evidenceId}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyToClipboard(exportResult.evidenceId)}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Content Hash:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {exportResult.hash}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyToClipboard(exportResult.hash)}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {exportResult.signature && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Digital Signature:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {exportResult.signature.substring(0, 64)}...
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() =>
                      handleCopyToClipboard(exportResult.signature || '')
                    }
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Paper>

          {verification && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Verification Status
              </Typography>

              <Alert
                severity={verification.valid ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  <strong>Overall Status:</strong>{' '}
                  {verification.valid ? 'Valid' : 'Invalid'}
                </Typography>
              </Alert>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {verification.verification.checks.hashMatch ? (
                      <CheckIcon color="success" />
                    ) : (
                      <WarningIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Hash Integrity"
                    secondary={
                      verification.verification.checks.hashMatch
                        ? 'Content verified'
                        : 'Hash mismatch'
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {verification.verification.checks.signatureValid ? (
                      <CheckIcon color="success" />
                    ) : (
                      <WarningIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Digital Signature"
                    secondary={
                      verification.verification.checks.signatureValid
                        ? 'Signature valid'
                        : 'Signature invalid'
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    {verification.verification.checks.timestampValid ? (
                      <CheckIcon color="success" />
                    ) : (
                      <WarningIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Timestamp"
                    secondary={
                      verification.verification.checks.timestampValid
                        ? 'Within valid range'
                        : 'Timestamp invalid'
                    }
                  />
                </ListItem>
              </List>

              {verification.verification.errors.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Issues found:</strong>
                  </Typography>
                  <ul>
                    {verification.verification.errors.map(
                      (error: string, index: number) => (
                        <li key={index}>
                          <Typography variant="body2">{error}</Typography>
                        </li>
                      ),
                    )}
                  </ul>
                </Alert>
              )}
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
            >
              Download Bundle
            </Button>

            {exportResult.signature && !verification && (
              <Button
                variant="outlined"
                onClick={() => handleVerify()}
                startIcon={<VerifyIcon />}
              >
                Verify Signature
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={() =>
                window.open(
                  `/api/maestro/v1/evidence/${exportResult.evidenceId}/artifacts`,
                  '_blank',
                )
              }
              startIcon={<DocumentIcon />}
            >
              View Artifacts
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BundleIcon />
          <Typography variant="h6">Export Evidence Bundle</Typography>
          {runId && <Chip label={`Run ${runId}`} size="small" />}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>Configure Export Options</StepLabel>
            <StepContent>
              {activeStep === 0 && renderConfigurationStep()}
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Generate Bundle</StepLabel>
            <StepContent>
              {activeStep === 1 && renderGenerationStep()}
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Verify & Download</StepLabel>
            <StepContent>
              {activeStep === 2 && renderVerificationStep()}
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      {activeStep === 2 && (
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setActiveStep(0);
              setExportResult(null);
              setVerification(null);
              setError(null);
            }}
            startIcon={<BundleIcon />}
          >
            Export Another
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
