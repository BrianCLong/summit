/**
 * Security Dashboard Page
 *
 * Key management, PII scanning, and security overview.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC6.7 (Encryption)
 *
 * @module pages/Security/SecurityDashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Key,
  Refresh,
  Add,
  RotateRight,
  Warning,
  Search,
  Shield,
  Lock,
  Timeline,
} from '@mui/icons-material';
import { KeyManagementAPI, PIIDetectionAPI } from '../../services/security-api';

// Status colors
const statusColors = {
  active: 'success',
  rotating: 'warning',
  retired: 'default',
  compromised: 'error',
  destroyed: 'error',
};

// Purpose icons
const purposeIcons = {
  encryption: <Lock />,
  signing: <Shield />,
  authentication: <Key />,
  key_wrapping: <Lock />,
};

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Key Inventory Component
function KeyInventory() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [rotateKey, setRotateKey] = useState(null);
  const [expiringKeys, setExpiringKeys] = useState([]);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const [keysResponse, expiringResponse] = await Promise.all([
        KeyManagementAPI.listKeys(),
        KeyManagementAPI.getExpiringKeys(14),
      ]);
      setKeys(keysResponse.data || []);
      setExpiringKeys(expiringResponse.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRotate = async (keyId, reason) => {
    try {
      await KeyManagementAPI.rotateKey(keyId, reason);
      setRotateKey(null);
      fetchKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Expiring Keys Warning */}
      {expiringKeys.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {expiringKeys.length} key(s) expiring within 14 days. Consider rotating them.
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {keys.filter((k) => k.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Keys
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {expiringKeys.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expiring Soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {keys.filter((k) => k.status === 'retired').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Retired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {keys.filter((k) => k.status === 'compromised').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compromised
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setGenerateOpen(true)}
        >
          Generate Key
        </Button>
        <Button startIcon={<Refresh />} onClick={fetchKeys}>
          Refresh
        </Button>
      </Box>

      {/* Keys Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Purpose</TableCell>
              <TableCell>Algorithm</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {purposeIcons[key.purpose] || <Key />}
                    <Typography variant="body2">{key.purpose}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{key.algorithm}</TableCell>
                <TableCell>v{key.version}</TableCell>
                <TableCell>
                  <Chip
                    label={key.status}
                    size="small"
                    color={statusColors[key.status]}
                  />
                </TableCell>
                <TableCell>
                  {new Date(key.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {key.expiresAt ? (
                    <Tooltip title={new Date(key.expiresAt).toLocaleString()}>
                      <span>
                        {new Date(key.expiresAt).toLocaleDateString()}
                      </span>
                    </Tooltip>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell align="right">
                  {key.status === 'active' && (
                    <Tooltip title="Rotate Key">
                      <IconButton
                        size="small"
                        onClick={() => setRotateKey(key)}
                      >
                        <RotateRight />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Generate Key Dialog */}
      <GenerateKeyDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={fetchKeys}
      />

      {/* Rotate Key Dialog */}
      <RotateKeyDialog
        open={!!rotateKey}
        keyData={rotateKey}
        onClose={() => setRotateKey(null)}
        onRotate={handleRotate}
      />
    </Box>
  );
}

// Generate Key Dialog
function GenerateKeyDialog({ open, onClose, onSuccess }) {
  const [purpose, setPurpose] = useState('encryption');
  const [algorithm, setAlgorithm] = useState('AES-256-GCM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      await KeyManagementAPI.generateKey(purpose, algorithm);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate New Encryption Key</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Purpose</InputLabel>
            <Select
              value={purpose}
              label="Purpose"
              onChange={(e) => setPurpose(e.target.value)}
            >
              <MenuItem value="encryption">Encryption</MenuItem>
              <MenuItem value="signing">Signing</MenuItem>
              <MenuItem value="authentication">Authentication</MenuItem>
              <MenuItem value="key_wrapping">Key Wrapping</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Algorithm</InputLabel>
            <Select
              value={algorithm}
              label="Algorithm"
              onChange={(e) => setAlgorithm(e.target.value)}
            >
              <MenuItem value="AES-256-GCM">AES-256-GCM</MenuItem>
              <MenuItem value="RSA-2048">RSA-2048</MenuItem>
              <MenuItem value="RSA-4096">RSA-4096</MenuItem>
              <MenuItem value="ECDSA-P256">ECDSA-P256</MenuItem>
              <MenuItem value="HMAC-SHA256">HMAC-SHA256</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Add />}
        >
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Rotate Key Dialog
function RotateKeyDialog({ open, keyData, onClose, onRotate }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRotate = async () => {
    setLoading(true);
    try {
      await onRotate(keyData?.id, reason);
    } finally {
      setLoading(false);
    }
  };

  if (!keyData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rotate Key</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Rotating a key creates a new version and marks the current key for retirement.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Key: {keyData.purpose} ({keyData.algorithm}) v{keyData.version}
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Reason for Rotation"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Scheduled rotation, Security incident"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleRotate}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <RotateRight />}
        >
          Rotate Key
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// PII Scanner Component
function PIIScanner() {
  const [inputData, setInputData] = useState('');
  const [scanType, setScanType] = useState('object');
  const [includeValue, setIncludeValue] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    try {
      setScanning(true);
      setError(null);

      let data;
      if (scanType === 'object') {
        data = JSON.parse(inputData);
      } else {
        data = inputData;
      }

      const response = await PIIDetectionAPI.scan(data, scanType, includeValue);
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PII Scanner
              </Typography>

              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={scanType}
                    label="Type"
                    onChange={(e) => setScanType(e.target.value)}
                  >
                    <MenuItem value="object">JSON Object</MenuItem>
                    <MenuItem value="text">Plain Text</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={includeValue}
                    onChange={(e) => setIncludeValue(e.target.checked)}
                  />
                  <Typography variant="body2">Show Masked Values</Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={10}
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder={
                  scanType === 'object'
                    ? '{\n  "email": "john@example.com",\n  "phone": "555-123-4567"\n}'
                    : 'Enter text to scan for PII...'
                }
                sx={{ mb: 2, fontFamily: 'monospace' }}
              />

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Button
                variant="contained"
                onClick={handleScan}
                disabled={scanning || !inputData}
                startIcon={scanning ? <CircularProgress size={16} /> : <Search />}
              >
                {scanning ? 'Scanning...' : 'Scan for PII'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scan Results
              </Typography>

              {!result ? (
                <Typography color="text.secondary">
                  Enter data and click scan to detect PII.
                </Typography>
              ) : (
                <Box>
                  {/* Risk Score */}
                  <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography variant="h2" color={result.riskScore > 50 ? 'error.main' : 'success.main'}>
                      {Math.round(result.riskScore)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Risk Score
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Detections */}
                  {result.detections.length === 0 ? (
                    <Alert severity="success">No PII detected!</Alert>
                  ) : (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        {result.detections.length} PII Detection(s)
                      </Typography>
                      <List dense>
                        {result.detections.map((d, i) => (
                          <ListItem key={i}>
                            <ListItemIcon>
                              <Warning color={d.sensitivity === 'critical' ? 'error' : 'warning'} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Chip label={d.category} size="small" />
                                  <Chip
                                    label={d.sensitivity}
                                    size="small"
                                    color={d.sensitivity === 'critical' ? 'error' : 'warning'}
                                  />
                                </Box>
                              }
                              secondary={
                                <>
                                  {d.path && <span>Path: {d.path}</span>}
                                  {d.value && <span> | Value: {d.value}</span>}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recommendations
                      </Typography>
                      {result.recommendations.map((rec, i) => (
                        <Alert key={i} severity="info" sx={{ mb: 1 }}>
                          {rec}
                        </Alert>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Main Component
export default function SecurityDashboard() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Security & Privacy
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage encryption keys, scan for PII, and monitor security posture.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<Key />} label="Key Management" iconPosition="start" />
          <Tab icon={<Shield />} label="PII Scanner" iconPosition="start" />
          <Tab icon={<Timeline />} label="Audit History" iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <KeyInventory />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <PIIScanner />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <RotationHistory />
      </TabPanel>
    </Container>
  );
}

// Rotation History Component
function RotationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await KeyManagementAPI.getRotationHistory();
        setHistory(response.data || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <LinearProgress />;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Event</TableCell>
            <TableCell>Key ID</TableCell>
            <TableCell>Version</TableCell>
            <TableCell>Actor</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No rotation events found.
              </TableCell>
            </TableRow>
          ) : (
            history.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Chip
                    label={event.eventType}
                    size="small"
                    color={
                      event.eventType === 'compromised'
                        ? 'error'
                        : event.eventType === 'rotated'
                        ? 'primary'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {event.keyId.substring(0, 8)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  {event.previousVersion ? `v${event.previousVersion}` : ''}
                  {event.previousVersion && event.newVersion ? ' → ' : ''}
                  {event.newVersion ? `v${event.newVersion}` : ''}
                </TableCell>
                <TableCell>{event.actorId}</TableCell>
                <TableCell>{event.reason || '-'}</TableCell>
                <TableCell>
                  {new Date(event.timestamp).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
