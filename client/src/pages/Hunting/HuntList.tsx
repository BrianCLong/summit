import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Box,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ChipProps,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  PlayArrow,
  Stop,
  Schedule,
  CheckCircle,
  Error,
  Add,
  Refresh,
  Timeline,
  Security,
  Assessment,
} from '@mui/icons-material';
import { useSafeQuery } from '../../hooks/useSafeQuery';

interface Hunt {
  id: string;
  name: string;
  status: 'RUNNING' | 'SCHEDULED' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  type: 'IOC' | 'BEHAVIORAL' | 'NETWORK' | 'FINANCIAL' | 'MITRE_ATT&CK';
  tactic: string;
  lastRun: string;
  findings: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  progress?: number;
  description: string;
}

const getStatusColor = (status: Hunt['status']): ChipProps['color'] => {
  switch (status) {
    case 'RUNNING':
      return 'primary';
    case 'SCHEDULED':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'PAUSED':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: Hunt['status']) => {
  switch (status) {
    case 'RUNNING':
      return <PlayArrow />;
    case 'SCHEDULED':
      return <Schedule />;
    case 'COMPLETED':
      return <CheckCircle />;
    case 'FAILED':
      return <Error />;
    case 'PAUSED':
      return <Stop />;
    default:
      return null;
  }
};

const getSeverityColor = (severity: Hunt['severity']): ChipProps['color'] => {
  switch (severity) {
    case 'CRITICAL':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
      return 'success';
    default:
      return 'default';
  }
};

export default function HuntList() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: hunts, loading } = useSafeQuery<Hunt[]>({
    queryKey: `hunt_list_${filterType}_${filterStatus}`,
    mock: [
      {
        id: 'hunt1',
        name: 'APT29 IOC Hunt - Cozy Bear Indicators',
        status: 'RUNNING',
        type: 'IOC',
        tactic: 'Initial Access',
        lastRun: '2025-08-27T02:30:00Z',
        findings: 12,
        severity: 'HIGH',
        progress: 65,
        description:
          'Hunting for known APT29 indicators including file hashes, domains, and network signatures',
      },
      {
        id: 'hunt2',
        name: 'Suspicious Network Beaconing',
        status: 'COMPLETED',
        type: 'NETWORK',
        tactic: 'Command and Control',
        lastRun: '2025-08-27T01:15:00Z',
        findings: 3,
        severity: 'MEDIUM',
        description:
          'Detecting periodic outbound connections that may indicate C2 communication',
      },
      {
        id: 'hunt3',
        name: 'Financial Transaction Anomaly Detection',
        status: 'SCHEDULED',
        type: 'FINANCIAL',
        tactic: 'Impact',
        lastRun: '2025-08-26T22:00:00Z',
        findings: 0,
        severity: 'LOW',
        description:
          'Machine learning based detection of unusual financial transaction patterns',
      },
      {
        id: 'hunt4',
        name: 'Insider Threat - Credential Access',
        status: 'FAILED',
        type: 'BEHAVIORAL',
        tactic: 'Credential Access',
        lastRun: '2025-08-26T20:45:00Z',
        findings: 0,
        severity: 'CRITICAL',
        description:
          'Behavioral analysis for detecting insider threats attempting credential harvesting',
      },
      {
        id: 'hunt5',
        name: 'Living Off The Land - PowerShell',
        status: 'RUNNING',
        type: 'MITRE_ATT&CK',
        tactic: 'Defense Evasion',
        lastRun: '2025-08-27T03:00:00Z',
        findings: 8,
        severity: 'HIGH',
        progress: 25,
        description:
          'Detection of malicious PowerShell usage leveraging built-in Windows tools',
      },
      {
        id: 'hunt6',
        name: 'Data Exfiltration via DNS',
        status: 'PAUSED',
        type: 'NETWORK',
        tactic: 'Exfiltration',
        lastRun: '2025-08-26T18:30:00Z',
        findings: 2,
        severity: 'MEDIUM',
        description:
          'Detecting data exfiltration through DNS tunneling techniques',
      },
    ],
    deps: [filterType, filterStatus],
  });

  const columns: GridColDef<Hunt>[] = [
    {
      field: 'name',
      headerName: 'Hunt Name',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon(params.row.status)}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.description}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          icon={params.value === 'MITRE_ATT&CK' ? <Security /> : undefined}
        />
      ),
    },
    {
      field: 'tactic',
      headerName: 'MITRE Tactic',
      width: 160,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={getStatusColor(params.value)}
          variant="outlined"
        />
      ),
    },
    {
      field: 'findings',
      headerName: 'Findings',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Badge
          badgeContent={params.value}
          color={params.value > 0 ? 'error' : 'default'}
          showZero
        >
          <Assessment />
        </Badge>
      ),
    },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={getSeverityColor(params.value)}
          variant="filled"
        />
      ),
    },
    {
      field: 'lastRun',
      headerName: 'Last Run',
      width: 160,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip
            title={params.row.status === 'RUNNING' ? 'Stop Hunt' : 'Start Hunt'}
          >
            <IconButton size="small">
              {params.row.status === 'RUNNING' ? <Stop /> : <PlayArrow />}
            </IconButton>
          </Tooltip>
          <Tooltip title="View Timeline">
            <IconButton size="small">
              <Timeline />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredHunts =
    hunts?.filter((hunt) => {
      if (selectedTab === 1 && hunt.status !== 'RUNNING') return false;
      if (selectedTab === 2 && hunt.status !== 'SCHEDULED') return false;
      if (selectedTab === 3 && hunt.findings === 0) return false;
      return true;
    }) || [];

  const runningHunts = hunts?.filter((h) => h.status === 'RUNNING').length || 0;
  const totalFindings =
    hunts?.reduce((sum, hunt) => sum + hunt.findings, 0) || 0;
  const criticalHunts =
    hunts?.filter((h) => h.severity === 'CRITICAL').length || 0;
  const failedHunts = hunts?.filter((h) => h.status === 'FAILED').length || 0;

  return (
    <Box sx={{ m: 2 }}>
      {/* Stats Overview */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PlayArrow color="primary" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Hunts
                </Typography>
                <Typography variant="h4" color="primary">
                  {runningHunts}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Assessment color="warning" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Findings
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {totalFindings}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Security color="error" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Critical Hunts
                </Typography>
                <Typography variant="h4" color="error.main">
                  {criticalHunts}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Error color="error" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Failed Hunts
                </Typography>
                <Typography variant="h4" color="error.main">
                  {failedHunts}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Main Hunt List */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">Threat Hunting Operations</Typography>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Hunt Type</InputLabel>
                <Select
                  value={filterType}
                  label="Hunt Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="IOC">IOC Hunt</MenuItem>
                  <MenuItem value="BEHAVIORAL">Behavioral</MenuItem>
                  <MenuItem value="NETWORK">Network</MenuItem>
                  <MenuItem value="FINANCIAL">Financial</MenuItem>
                  <MenuItem value="MITRE_ATT&CK">MITRE ATT&CK</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="RUNNING">Running</MenuItem>
                  <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Refresh Hunt Status">
                <IconButton>
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Hunt
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ width: '100%' }}>
            <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
              <Tab label={`All Hunts (${hunts?.length || 0})`} />
              <Tab label={`Running (${runningHunts})`} />
              <Tab
                label={`Scheduled (${hunts?.filter((h) => h.status === 'SCHEDULED').length || 0})`}
              />
              <Tab
                label={`With Findings (${hunts?.filter((h) => h.findings > 0).length || 0})`}
              />
            </Tabs>
          </Box>

          <div style={{ height: 500, marginTop: 16 }}>
            <DataGrid
              rows={filteredHunts}
              columns={columns}
              disableRowSelectionOnClick
              density="compact"
              loading={loading}
              onRowDoubleClick={(_params) => {
                // TODO: Navigate to hunt detail page
              }}
              sx={{
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Hunt Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Threat Hunt</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Hunt Name"
              placeholder="e.g., APT28 IOC Hunt - Fancy Bear Campaign"
            />
            <FormControl fullWidth>
              <InputLabel>Hunt Type</InputLabel>
              <Select label="Hunt Type">
                <MenuItem value="IOC">IOC-based Hunt</MenuItem>
                <MenuItem value="BEHAVIORAL">Behavioral Analysis</MenuItem>
                <MenuItem value="NETWORK">Network Traffic Analysis</MenuItem>
                <MenuItem value="FINANCIAL">
                  Financial Anomaly Detection
                </MenuItem>
                <MenuItem value="MITRE_ATT&CK">MITRE ATT&CK Framework</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>MITRE ATT&CK Tactic</InputLabel>
              <Select label="MITRE ATT&CK Tactic">
                <MenuItem value="Initial Access">Initial Access</MenuItem>
                <MenuItem value="Execution">Execution</MenuItem>
                <MenuItem value="Persistence">Persistence</MenuItem>
                <MenuItem value="Privilege Escalation">
                  Privilege Escalation
                </MenuItem>
                <MenuItem value="Defense Evasion">Defense Evasion</MenuItem>
                <MenuItem value="Credential Access">Credential Access</MenuItem>
                <MenuItem value="Discovery">Discovery</MenuItem>
                <MenuItem value="Lateral Movement">Lateral Movement</MenuItem>
                <MenuItem value="Collection">Collection</MenuItem>
                <MenuItem value="Command and Control">
                  Command and Control
                </MenuItem>
                <MenuItem value="Exfiltration">Exfiltration</MenuItem>
                <MenuItem value="Impact">Impact</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              placeholder="Describe the hunt objectives and methodology..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setCreateDialogOpen(false);
              // TODO: Create hunt logic here
            }}
          >
            Create Hunt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
