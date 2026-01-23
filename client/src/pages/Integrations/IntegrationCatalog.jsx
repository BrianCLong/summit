/**
 * Integration Catalog Page
 *
 * Browse and configure integrations with governance-aware approval workflows.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration)
 *
 * @module pages/Integrations/IntegrationCatalog
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Divider,
  Badge,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Add,
  CheckCircle,
  Error,
  Link,
  LinkOff,
  PlayArrow,
  Refresh,
  Approval,
  History,
} from '@mui/icons-material';
import {
  useIntegrationCatalog,
  useIntegrations,
  useIntegrationOperations,
  useIntegrationApprovals,
  useIntegrationAudit,
} from '../../hooks/useIntegrations';

// Category icons
const categoryIcons = {
  communication: '💬',
  project_management: '📋',
  source_control: '📦',
  monitoring: '📊',
  security: '🔒',
  cloud: '☁️',
  data: '🗄️',
  custom: '⚙️',
};

// Risk level colors
const riskColors = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

// Status colors
const statusColors = {
  available: 'default',
  configured: 'info',
  connected: 'success',
  disconnected: 'warning',
  error: 'error',
  pending_approval: 'secondary',
};

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`integration-tabpanel-${index}`}
      aria-labelledby={`integration-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Setup Dialog Component
function SetupDialog({ open, manifest, onClose, onSetup }) {
  const { setup, loading, error } = useIntegrationOperations();
  const [name, setName] = useState('');
  const [config, setConfig] = useState({});

  React.useEffect(() => {
    if (manifest) {
      setName(`${manifest.name} Integration`);
      setConfig({});
    }
  }, [manifest]);

  const handleSetup = async () => {
    try {
      await setup(manifest.id, name, config);
      onSetup?.();
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  if (!manifest) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5">
            {categoryIcons[manifest.category]} Set Up {manifest.name}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {manifest.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={manifest.category}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Risk: ${manifest.riskLevel}`}
                size="small"
                color={riskColors[manifest.riskLevel]}
              />
              {manifest.riskLevel === 'high' || manifest.riskLevel === 'critical' ? (
                <Chip
                  icon={<Approval />}
                  label="Requires Approval"
                  size="small"
                  color="warning"
                />
              ) : null}
            </Box>
          </Box>

          <Divider />

          <TextField
            fullWidth
            label="Integration Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="A friendly name for this integration instance"
          />

          <Typography variant="subtitle1">Configuration</Typography>

          {manifest.configSchema?.properties ? (
            Object.entries(manifest.configSchema.properties).map(([key, schema]) => (
              <Box key={key}>
                {schema.type === 'boolean' ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2">{key}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {schema.description}
                      </Typography>
                    </Box>
                    <Switch
                      checked={config[key] ?? schema.default ?? false}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                    />
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    label={key}
                    type={schema.secret ? 'password' : 'text'}
                    helperText={schema.description}
                    value={config[key] ?? ''}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    required={manifest.configSchema.required?.includes(key)}
                  />
                )}
              </Box>
            ))
          ) : (
            <Alert severity="info">No configuration required for this integration.</Alert>
          )}

          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Capabilities
            </Typography>
            {manifest.capabilities?.map((cap) => (
              <Box key={cap.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  size="small"
                  label={cap.direction}
                  color={cap.direction === 'inbound' ? 'info' : 'primary'}
                  variant="outlined"
                />
                <Typography variant="body2">{cap.name}</Typography>
                {cap.requiresApproval && (
                  <Chip size="small" label="Needs Approval" color="warning" />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSetup}
          disabled={loading || !name}
          startIcon={loading ? <CircularProgress size={16} /> : <Add />}
        >
          {loading ? 'Setting Up...' : 'Set Up Integration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Configured Integration Card
function IntegrationCard({ integration, manifest, onConnect, onDisconnect, onExecute }) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect(integration.id);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      await onDisconnect(integration.id);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6">
            {categoryIcons[manifest?.category] || '⚙️'} {integration.name}
          </Typography>
          <Chip
            label={integration.status}
            size="small"
            color={statusColors[integration.status]}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {manifest?.description}
        </Typography>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={manifest?.category}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Health: ${integration.connectionHealth}`}
            size="small"
            color={integration.connectionHealth === 'healthy' ? 'success' : 'warning'}
          />
        </Box>

        {integration.errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {integration.errorMessage}
          </Alert>
        )}

        {integration.status === 'pending_approval' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            This integration requires approval before it can be connected.
          </Alert>
        )}
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        {integration.status === 'connected' ? (
          <>
            <Button
              size="small"
              startIcon={<LinkOff />}
              onClick={handleDisconnect}
              disabled={connecting}
            >
              Disconnect
            </Button>
            <Button
              size="small"
              startIcon={<PlayArrow />}
              onClick={() => onExecute(integration)}
            >
              Execute
            </Button>
          </>
        ) : integration.status === 'pending_approval' ? (
          <Button size="small" disabled startIcon={<Approval />}>
            Awaiting Approval
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            startIcon={connecting ? <CircularProgress size={16} /> : <Link />}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

// Approval Queue Component
function ApprovalQueue() {
  const { approvals, loading, error, processing, approve, reject } = useIntegrationApprovals();
  const comment = '';

  if (loading) return <LinearProgress />;

  if (error) return <Alert severity="error">{error}</Alert>;

  if (approvals.length === 0) {
    return (
      <Alert severity="info">No pending approvals.</Alert>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Resource</TableCell>
            <TableCell>Requested By</TableCell>
            <TableCell>Risk Level</TableCell>
            <TableCell>Requested At</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {approvals.map((approval) => (
            <TableRow key={approval.id}>
              <TableCell>
                <Chip
                  label={approval.type.replace('_', ' ')}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{approval.resourceType}</TableCell>
              <TableCell>{approval.requestedBy}</TableCell>
              <TableCell>
                <Chip
                  label={approval.riskAssessment.level}
                  size="small"
                  color={riskColors[approval.riskAssessment.level]}
                />
              </TableCell>
              <TableCell>
                {new Date(approval.requestedAt).toLocaleString()}
              </TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  color="success"
                  onClick={() => approve(approval.id, comment)}
                  disabled={processing}
                  sx={{ mr: 1 }}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => reject(approval.id, comment)}
                  disabled={processing}
                >
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Audit Log Component
function AuditLog() {
  const { auditLog, loading, error } = useIntegrationAudit();

  if (loading) return <LinearProgress />;

  if (error) return <Alert severity="error">{error}</Alert>;

  if (auditLog.length === 0) {
    return <Alert severity="info">No audit entries found.</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Actor</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Verdict</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {auditLog.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                {new Date(entry.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>{entry.action}</TableCell>
              <TableCell>{entry.actorId}</TableCell>
              <TableCell>
                {entry.success ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : (
                  <Error color="error" fontSize="small" />
                )}
              </TableCell>
              <TableCell>{entry.duration}ms</TableCell>
              <TableCell>
                <Chip
                  label={entry.governanceVerdict}
                  size="small"
                  color={entry.governanceVerdict === 'ALLOW' ? 'success' : 'warning'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Main Component
export default function IntegrationCatalog() {
  const { integrations: availableIntegrations, loading: catalogLoading } = useIntegrationCatalog();
  const {
    integrations: configuredIntegrations,
    loading: integrationsLoading,
    refresh: refreshIntegrations,
  } = useIntegrations();
  const { approvals } = useIntegrationApprovals();
  const { connect, disconnect } = useIntegrationOperations();

  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [setupManifest, setSetupManifest] = useState(null);

  // Create manifest lookup
  const manifestMap = useMemo(() => {
    const map = {};
    availableIntegrations.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [availableIntegrations]);

  // Filter available integrations
  const filteredAvailable = useMemo(() => {
    return availableIntegrations.filter((m) => {
      if (searchTerm && !m.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (categoryFilter && m.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [availableIntegrations, searchTerm, categoryFilter]);

  const handleConnect = async (id) => {
    await connect(id);
    refreshIntegrations();
  };

  const handleDisconnect = async (id) => {
    await disconnect(id);
    refreshIntegrations();
  };

  const handleSetupComplete = () => {
    refreshIntegrations();
  };

  const loading = catalogLoading || integrationsLoading;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Integrations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect Summit to external services with governance-aware approval workflows.
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Catalog" />
          <Tab label={`Configured (${configuredIntegrations.length})`} />
          <Tab
            label={
              <Badge badgeContent={approvals.length} color="warning">
                Approvals
              </Badge>
            }
          />
          <Tab label="Audit Log" icon={<History />} iconPosition="start" />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Catalog Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ width: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="communication">Communication</MenuItem>
              <MenuItem value="project_management">Project Management</MenuItem>
              <MenuItem value="source_control">Source Control</MenuItem>
              <MenuItem value="monitoring">Monitoring</MenuItem>
              <MenuItem value="security">Security</MenuItem>
              <MenuItem value="cloud">Cloud</MenuItem>
              <MenuItem value="data">Data</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Available Integrations */}
        <Grid container spacing={3}>
          {filteredAvailable.map((manifest) => (
            <Grid item xs={12} sm={6} md={4} key={manifest.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="h5">
                      {categoryIcons[manifest.category]}
                    </Typography>
                    <Box>
                      <Typography variant="h6">{manifest.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        v{manifest.version}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {manifest.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={manifest.category} size="small" />
                    <Chip
                      label={`Risk: ${manifest.riskLevel}`}
                      size="small"
                      color={riskColors[manifest.riskLevel]}
                    />
                    {manifest.capabilities?.length > 0 && (
                      <Chip
                        label={`${manifest.capabilities.length} capabilities`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setSetupManifest(manifest)}
                  >
                    Set Up
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Configured Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button startIcon={<Refresh />} onClick={refreshIntegrations}>
            Refresh
          </Button>
        </Box>

        {configuredIntegrations.length === 0 ? (
          <Alert severity="info">
            No integrations configured yet. Browse the catalog to set up your first integration.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {configuredIntegrations.map((integration) => (
              <Grid item xs={12} sm={6} md={4} key={integration.id}>
                <IntegrationCard
                  integration={integration}
                  manifest={manifestMap[integration.manifestId]}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onExecute={setExecuteIntegration}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Approvals Tab */}
      <TabPanel value={tabValue} index={2}>
        <ApprovalQueue />
      </TabPanel>

      {/* Audit Log Tab */}
      <TabPanel value={tabValue} index={3}>
        <AuditLog />
      </TabPanel>

      {/* Setup Dialog */}
      <SetupDialog
        open={!!setupManifest}
        manifest={setupManifest}
        onClose={() => setSetupManifest(null)}
        onSetup={handleSetupComplete}
      />
    </Container>
  );
}
