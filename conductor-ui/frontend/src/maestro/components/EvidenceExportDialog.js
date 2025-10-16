import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState } from 'react';
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
export const EvidenceExportDialog = ({ open, onClose, runId, nodeId }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [options, setOptions] = useState({
    format: 'json',
    includeArtifacts: true,
    includeSBOM: true,
    includeAttestations: true,
    signBundle: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [verification, setVerification] = useState(null);
  const steps = ['Configure Export', 'Generate Bundle', 'Verify & Download'];
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
  const handleVerify = async (evidenceId, signature, expectedHash) => {
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
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  };
  const renderConfigurationStep = () =>
    _jsxs(Box, {
      sx: { p: 2 },
      children: [
        _jsxs(FormControl, {
          component: 'fieldset',
          sx: { mb: 3 },
          children: [
            _jsx(FormLabel, { component: 'legend', children: 'Export Format' }),
            _jsxs(RadioGroup, {
              value: options.format,
              onChange: (e) =>
                setOptions({ ...options, format: e.target.value }),
              row: true,
              children: [
                _jsx(FormControlLabel, {
                  value: 'json',
                  control: _jsx(Radio, {}),
                  label: 'JSON',
                }),
                _jsx(FormControlLabel, {
                  value: 'yaml',
                  control: _jsx(Radio, {}),
                  label: 'YAML',
                }),
                _jsx(FormControlLabel, {
                  value: 'zip',
                  control: _jsx(Radio, {}),
                  label: 'ZIP Bundle',
                }),
              ],
            }),
          ],
        }),
        _jsxs(Box, {
          sx: { mb: 3 },
          children: [
            _jsx(Typography, {
              variant: 'subtitle2',
              gutterBottom: true,
              children: 'Include Components',
            }),
            _jsx(FormControlLabel, {
              control: _jsx(Checkbox, {
                checked: options.includeArtifacts,
                onChange: (e) =>
                  setOptions({
                    ...options,
                    includeArtifacts: e.target.checked,
                  }),
              }),
              label: 'Artifacts (logs, configs, outputs)',
            }),
            _jsx(FormControlLabel, {
              control: _jsx(Checkbox, {
                checked: options.includeSBOM,
                onChange: (e) =>
                  setOptions({ ...options, includeSBOM: e.target.checked }),
              }),
              label: 'Software Bill of Materials (SBOM)',
            }),
            _jsx(FormControlLabel, {
              control: _jsx(Checkbox, {
                checked: options.includeAttestations,
                onChange: (e) =>
                  setOptions({
                    ...options,
                    includeAttestations: e.target.checked,
                  }),
              }),
              label: 'Security Attestations',
            }),
            _jsx(FormControlLabel, {
              control: _jsx(Checkbox, {
                checked: options.signBundle,
                onChange: (e) =>
                  setOptions({ ...options, signBundle: e.target.checked }),
              }),
              label: 'Digital Signature',
            }),
          ],
        }),
        _jsxs(Alert, {
          severity: 'info',
          sx: { mb: 2 },
          children: [
            _jsx(Typography, {
              variant: 'body2',
              children: _jsx('strong', {
                children: 'Evidence Bundle Contents:',
              }),
            }),
            _jsx(Typography, {
              variant: 'body2',
              children: '\u2022 Decision trace and routing information',
            }),
            _jsx(Typography, {
              variant: 'body2',
              children: '\u2022 Input parameters and context',
            }),
            _jsx(Typography, {
              variant: 'body2',
              children: '\u2022 Output results and metadata',
            }),
            options.includeArtifacts &&
              _jsx(Typography, {
                variant: 'body2',
                children: '\u2022 Execution artifacts and logs',
              }),
            options.signBundle &&
              _jsx(Typography, {
                variant: 'body2',
                children:
                  '\u2022 Cryptographic signature for integrity verification',
              }),
          ],
        }),
        _jsxs(Box, {
          sx: { display: 'flex', justifyContent: 'flex-end', gap: 1 },
          children: [
            _jsx(Button, { onClick: onClose, children: 'Cancel' }),
            _jsx(Button, {
              variant: 'contained',
              onClick: () => setActiveStep(1),
              startIcon: _jsx(BundleIcon, {}),
              children: 'Configure Export',
            }),
          ],
        }),
      ],
    });
  const renderGenerationStep = () =>
    _jsxs(Box, {
      sx: { p: 2 },
      children: [
        _jsxs(Paper, {
          sx: { p: 2, mb: 2, bgcolor: 'grey.50' },
          children: [
            _jsx(Typography, {
              variant: 'h6',
              gutterBottom: true,
              children: 'Export Configuration',
            }),
            _jsxs(Box, {
              sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 },
              children: [
                _jsxs(Box, {
                  children: [
                    _jsx(Typography, {
                      variant: 'subtitle2',
                      children: 'Run ID:',
                    }),
                    _jsx(Typography, {
                      variant: 'body2',
                      fontFamily: 'monospace',
                      children: runId,
                    }),
                  ],
                }),
                nodeId &&
                  _jsxs(Box, {
                    children: [
                      _jsx(Typography, {
                        variant: 'subtitle2',
                        children: 'Node ID:',
                      }),
                      _jsx(Typography, {
                        variant: 'body2',
                        fontFamily: 'monospace',
                        children: nodeId,
                      }),
                    ],
                  }),
                _jsxs(Box, {
                  children: [
                    _jsx(Typography, {
                      variant: 'subtitle2',
                      children: 'Format:',
                    }),
                    _jsx(Chip, {
                      label: options.format.toUpperCase(),
                      size: 'small',
                    }),
                  ],
                }),
                _jsxs(Box, {
                  children: [
                    _jsx(Typography, {
                      variant: 'subtitle2',
                      children: 'Signature:',
                    }),
                    _jsx(Chip, {
                      label: options.signBundle ? 'Enabled' : 'Disabled',
                      size: 'small',
                      color: options.signBundle ? 'success' : 'default',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        loading &&
          _jsxs(Box, {
            sx: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 3,
            },
            children: [
              _jsx(CircularProgress, { sx: { mb: 2 } }),
              _jsx(Typography, {
                variant: 'body2',
                children: 'Generating evidence bundle...',
              }),
            ],
          }),
        error &&
          _jsx(Alert, { severity: 'error', sx: { mb: 2 }, children: error }),
        _jsxs(Box, {
          sx: { display: 'flex', justifyContent: 'space-between', mt: 2 },
          children: [
            _jsx(Button, { onClick: () => setActiveStep(0), children: 'Back' }),
            _jsx(Button, {
              variant: 'contained',
              onClick: handleExport,
              disabled: loading,
              startIcon: loading
                ? _jsx(CircularProgress, { size: 16 })
                : _jsx(DocumentIcon, {}),
              children: loading ? 'Generating...' : 'Generate Bundle',
            }),
          ],
        }),
      ],
    });
  const renderVerificationStep = () =>
    _jsx(Box, {
      sx: { p: 2 },
      children:
        exportResult &&
        _jsxs(_Fragment, {
          children: [
            _jsx(Alert, {
              severity: 'success',
              sx: { mb: 2 },
              children: _jsx(Typography, {
                variant: 'body2',
                children: _jsx('strong', {
                  children: 'Evidence bundle generated successfully!',
                }),
              }),
            }),
            _jsxs(Paper, {
              sx: { p: 2, mb: 2 },
              children: [
                _jsx(Typography, {
                  variant: 'h6',
                  gutterBottom: true,
                  children: 'Bundle Information',
                }),
                _jsxs(Box, {
                  sx: { mb: 2 },
                  children: [
                    _jsx(Typography, {
                      variant: 'subtitle2',
                      children: 'Evidence ID:',
                    }),
                    _jsxs(Box, {
                      sx: { display: 'flex', alignItems: 'center', gap: 1 },
                      children: [
                        _jsx(Typography, {
                          variant: 'body2',
                          fontFamily: 'monospace',
                          children: exportResult.evidenceId,
                        }),
                        _jsx(IconButton, {
                          size: 'small',
                          onClick: () =>
                            handleCopyToClipboard(exportResult.evidenceId),
                          children: _jsx(CopyIcon, { fontSize: 'small' }),
                        }),
                      ],
                    }),
                  ],
                }),
                _jsxs(Box, {
                  sx: { mb: 2 },
                  children: [
                    _jsx(Typography, {
                      variant: 'subtitle2',
                      children: 'Content Hash:',
                    }),
                    _jsxs(Box, {
                      sx: { display: 'flex', alignItems: 'center', gap: 1 },
                      children: [
                        _jsx(Typography, {
                          variant: 'body2',
                          fontFamily: 'monospace',
                          sx: { wordBreak: 'break-all' },
                          children: exportResult.hash,
                        }),
                        _jsx(IconButton, {
                          size: 'small',
                          onClick: () =>
                            handleCopyToClipboard(exportResult.hash),
                          children: _jsx(CopyIcon, { fontSize: 'small' }),
                        }),
                      ],
                    }),
                  ],
                }),
                exportResult.signature &&
                  _jsxs(Box, {
                    sx: { mb: 2 },
                    children: [
                      _jsx(Typography, {
                        variant: 'subtitle2',
                        children: 'Digital Signature:',
                      }),
                      _jsxs(Box, {
                        sx: { display: 'flex', alignItems: 'center', gap: 1 },
                        children: [
                          _jsxs(Typography, {
                            variant: 'body2',
                            fontFamily: 'monospace',
                            sx: { wordBreak: 'break-all' },
                            children: [
                              exportResult.signature.substring(0, 64),
                              '...',
                            ],
                          }),
                          _jsx(IconButton, {
                            size: 'small',
                            onClick: () =>
                              handleCopyToClipboard(
                                exportResult.signature || '',
                              ),
                            children: _jsx(CopyIcon, { fontSize: 'small' }),
                          }),
                        ],
                      }),
                    ],
                  }),
              ],
            }),
            verification &&
              _jsxs(Paper, {
                sx: { p: 2, mb: 2 },
                children: [
                  _jsx(Typography, {
                    variant: 'h6',
                    gutterBottom: true,
                    children: 'Verification Status',
                  }),
                  _jsx(Alert, {
                    severity: verification.valid ? 'success' : 'error',
                    sx: { mb: 2 },
                    children: _jsxs(Typography, {
                      variant: 'body2',
                      children: [
                        _jsx('strong', { children: 'Overall Status:' }),
                        ' ',
                        verification.valid ? 'Valid' : 'Invalid',
                      ],
                    }),
                  }),
                  _jsxs(List, {
                    dense: true,
                    children: [
                      _jsxs(ListItem, {
                        children: [
                          _jsx(ListItemIcon, {
                            children: verification.verification.checks.hashMatch
                              ? _jsx(CheckIcon, { color: 'success' })
                              : _jsx(WarningIcon, { color: 'error' }),
                          }),
                          _jsx(ListItemText, {
                            primary: 'Hash Integrity',
                            secondary: verification.verification.checks
                              .hashMatch
                              ? 'Content verified'
                              : 'Hash mismatch',
                          }),
                        ],
                      }),
                      _jsxs(ListItem, {
                        children: [
                          _jsx(ListItemIcon, {
                            children: verification.verification.checks
                              .signatureValid
                              ? _jsx(CheckIcon, { color: 'success' })
                              : _jsx(WarningIcon, { color: 'error' }),
                          }),
                          _jsx(ListItemText, {
                            primary: 'Digital Signature',
                            secondary: verification.verification.checks
                              .signatureValid
                              ? 'Signature valid'
                              : 'Signature invalid',
                          }),
                        ],
                      }),
                      _jsxs(ListItem, {
                        children: [
                          _jsx(ListItemIcon, {
                            children: verification.verification.checks
                              .timestampValid
                              ? _jsx(CheckIcon, { color: 'success' })
                              : _jsx(WarningIcon, { color: 'error' }),
                          }),
                          _jsx(ListItemText, {
                            primary: 'Timestamp',
                            secondary: verification.verification.checks
                              .timestampValid
                              ? 'Within valid range'
                              : 'Timestamp invalid',
                          }),
                        ],
                      }),
                    ],
                  }),
                  verification.verification.errors.length > 0 &&
                    _jsxs(Alert, {
                      severity: 'warning',
                      sx: { mt: 2 },
                      children: [
                        _jsx(Typography, {
                          variant: 'body2',
                          children: _jsx('strong', {
                            children: 'Issues found:',
                          }),
                        }),
                        _jsx('ul', {
                          children: verification.verification.errors.map(
                            (error, index) =>
                              _jsx(
                                'li',
                                {
                                  children: _jsx(Typography, {
                                    variant: 'body2',
                                    children: error,
                                  }),
                                },
                                index,
                              ),
                          ),
                        }),
                      ],
                    }),
                ],
              }),
            _jsxs(Box, {
              sx: { display: 'flex', gap: 1, flexWrap: 'wrap' },
              children: [
                _jsx(Button, {
                  variant: 'contained',
                  onClick: handleDownload,
                  startIcon: _jsx(DownloadIcon, {}),
                  children: 'Download Bundle',
                }),
                exportResult.signature &&
                  !verification &&
                  _jsx(Button, {
                    variant: 'outlined',
                    onClick: () => handleVerify(),
                    startIcon: _jsx(VerifyIcon, {}),
                    children: 'Verify Signature',
                  }),
                _jsx(Button, {
                  variant: 'outlined',
                  onClick: () =>
                    window.open(
                      `/api/maestro/v1/evidence/${exportResult.evidenceId}/artifacts`,
                      '_blank',
                    ),
                  startIcon: _jsx(DocumentIcon, {}),
                  children: 'View Artifacts',
                }),
              ],
            }),
          ],
        }),
    });
  return _jsxs(Dialog, {
    open: open,
    onClose: onClose,
    maxWidth: 'md',
    fullWidth: true,
    PaperProps: { sx: { minHeight: '60vh' } },
    children: [
      _jsx(DialogTitle, {
        children: _jsxs(Box, {
          sx: { display: 'flex', alignItems: 'center', gap: 1 },
          children: [
            _jsx(BundleIcon, {}),
            _jsx(Typography, {
              variant: 'h6',
              children: 'Export Evidence Bundle',
            }),
            runId && _jsx(Chip, { label: `Run ${runId}`, size: 'small' }),
          ],
        }),
      }),
      _jsx(DialogContent, {
        children: _jsxs(Stepper, {
          activeStep: activeStep,
          orientation: 'vertical',
          children: [
            _jsxs(Step, {
              children: [
                _jsx(StepLabel, { children: 'Configure Export Options' }),
                _jsx(StepContent, {
                  children: activeStep === 0 && renderConfigurationStep(),
                }),
              ],
            }),
            _jsxs(Step, {
              children: [
                _jsx(StepLabel, { children: 'Generate Bundle' }),
                _jsx(StepContent, {
                  children: activeStep === 1 && renderGenerationStep(),
                }),
              ],
            }),
            _jsxs(Step, {
              children: [
                _jsx(StepLabel, { children: 'Verify & Download' }),
                _jsx(StepContent, {
                  children: activeStep === 2 && renderVerificationStep(),
                }),
              ],
            }),
          ],
        }),
      }),
      activeStep === 2 &&
        _jsxs(DialogActions, {
          children: [
            _jsx(Button, { onClick: onClose, children: 'Close' }),
            _jsx(Button, {
              variant: 'contained',
              onClick: () => {
                setActiveStep(0);
                setExportResult(null);
                setVerification(null);
                setError(null);
              },
              startIcon: _jsx(BundleIcon, {}),
              children: 'Export Another',
            }),
          ],
        }),
    ],
  });
};
