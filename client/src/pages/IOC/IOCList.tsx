import React, { useEffect, useState } from 'react';
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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Badge,
  Paper,
  ChipProps,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add,
  Upload,
  Block,
  Warning,
  Security,
  Language,
  Computer,
  Fingerprint,
  Email,
  Phone,
  Search,
  Share,
  Timeline,
} from '@mui/icons-material';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { useNavigate } from 'react-router-dom';

interface IOC {
  id: string;
  type:
    | 'IP'
    | 'DOMAIN'
    | 'URL'
    | 'FILE_HASH'
    | 'EMAIL'
    | 'PHONE'
    | 'REGISTRY'
    | 'CERTIFICATE';
  value: string;
  risk: number;
  status: 'ACTIVE' | 'INACTIVE' | 'INVESTIGATING' | 'FALSE_POSITIVE';
  source: string;
  firstSeen: string;
  lastSeen: string;
  hits: number;
  tags: string[];
  description?: string;
  tlp: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
}

const getIOCIcon = (type: IOC['type']) => {
  switch (type) {
    case 'IP':
      return <Language />;
    case 'DOMAIN':
      return <Language />;
    case 'URL':
      return <Language />;
    case 'FILE_HASH':
      return <Fingerprint />;
    case 'EMAIL':
      return <Email />;
    case 'PHONE':
      return <Phone />;
    case 'REGISTRY':
      return <Computer />;
    case 'CERTIFICATE':
      return <Security />;
    default:
      return <Security />;
  }
};

const getRiskColor = (risk: number): ChipProps['color'] => {
  if (risk >= 80) return 'error';
  if (risk >= 60) return 'warning';
  if (risk >= 40) return 'info';
  return 'success';
};

const getStatusColor = (status: IOC['status']): ChipProps['color'] => {
  switch (status) {
    case 'ACTIVE':
      return 'error';
    case 'INACTIVE':
      return 'default';
    case 'INVESTIGATING':
      return 'warning';
    case 'FALSE_POSITIVE':
      return 'success';
    default:
      return 'default';
  }
};

const getTLPColor = (tlp: IOC['tlp']) => {
  switch (tlp) {
    case 'RED':
      return '#FF0000';
    case 'AMBER':
      return '#FFC000';
    case 'GREEN':
      return '#33FF00';
    case 'WHITE':
      return '#FFFFFF';
    default:
      return '#FFFFFF';
  }
};

const IOC_TYPES: IOC['type'][] = [
  'IP',
  'DOMAIN',
  'URL',
  'FILE_HASH',
  'EMAIL',
  'PHONE',
  'REGISTRY',
  'CERTIFICATE',
];

const TLP_LEVELS: IOC['tlp'][] = ['WHITE', 'GREEN', 'AMBER', 'RED'];

const normalizeType = (value?: string): IOC['type'] => {
  const upper = (value || '').toUpperCase();
  return IOC_TYPES.includes(upper as IOC['type']) ? (upper as IOC['type']) : 'IP';
};

const normalizeTlp = (value?: string, fallback: IOC['tlp'] = 'GREEN') => {
  const upper = (value || '').toUpperCase();
  return TLP_LEVELS.includes(upper as IOC['tlp'])
    ? (upper as IOC['tlp'])
    : fallback;
};

export default function IOCList() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: fetchedIocs, loading } = useSafeQuery<IOC[]>({
    queryKey: `ioc_list_${filterType}_${filterStatus}`,
    mock: [
      {
        id: 'ioc1',
        type: 'IP',
        value: '185.220.100.240',
        risk: 95,
        status: 'ACTIVE',
        source: 'ThreatConnect',
        firstSeen: '2025-08-25T10:30:00Z',
        lastSeen: '2025-08-27T02:15:00Z',
        hits: 47,
        tags: ['APT29', 'Cozy Bear', 'C2'],
        description: 'Known C2 infrastructure for APT29 operations',
        tlp: 'RED',
      },
      {
        id: 'ioc2',
        type: 'DOMAIN',
        value: 'secure-update-microsoft.com',
        risk: 88,
        status: 'ACTIVE',
        source: 'VirusTotal',
        firstSeen: '2025-08-24T14:20:00Z',
        lastSeen: '2025-08-27T01:45:00Z',
        hits: 23,
        tags: ['Phishing', 'Microsoft Impersonation'],
        description: 'Phishing domain impersonating Microsoft update service',
        tlp: 'AMBER',
      },
      {
        id: 'ioc3',
        type: 'FILE_HASH',
        value: 'a4b35de71ca20fe776dc72d12fb2886edc3a0050',
        risk: 72,
        status: 'INVESTIGATING',
        source: 'Internal Analysis',
        firstSeen: '2025-08-26T09:10:00Z',
        lastSeen: '2025-08-26T09:10:00Z',
        hits: 1,
        tags: ['Malware', 'Trojan'],
        description: 'Suspicious executable detected in endpoint',
        tlp: 'GREEN',
      },
      {
        id: 'ioc4',
        type: 'EMAIL',
        value: 'admin@secure-banking-alert.com',
        risk: 65,
        status: 'ACTIVE',
        source: 'PhishTank',
        firstSeen: '2025-08-25T16:00:00Z',
        lastSeen: '2025-08-27T00:30:00Z',
        hits: 12,
        tags: ['Banking', 'Phishing', 'Social Engineering'],
        description: 'Email address used in banking phishing campaigns',
        tlp: 'AMBER',
      },
      {
        id: 'ioc5',
        type: 'URL',
        value: 'https://drive-google-docs.tk/download?id=malicious',
        risk: 43,
        status: 'FALSE_POSITIVE',
        source: 'URLVoid',
        firstSeen: '2025-08-20T11:25:00Z',
        lastSeen: '2025-08-22T14:15:00Z',
        hits: 3,
        tags: ['URL', 'False Positive'],
        description: 'Initially flagged URL determined to be benign',
        tlp: 'WHITE',
      },
      {
        id: 'ioc6',
        type: 'REGISTRY',
         
        value:
          'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\SystemUpdater',
        risk: 80,
        status: 'ACTIVE',
        source: 'YARA Rule',
        firstSeen: '2025-08-26T20:45:00Z',
        lastSeen: '2025-08-27T03:20:00Z',
        hits: 8,
        tags: ['Persistence', 'Registry', 'AutoRun'],
        description: 'Suspicious registry key for persistence mechanism',
        tlp: 'RED',
      },
    ],
    deps: [filterType, filterStatus],
  });

  const [localIocs, setLocalIocs] = useState<IOC[]>([]);
  const [importPayload, setImportPayload] = useState('');
  const [importTlp, setImportTlp] = useState<IOC['tlp']>('GREEN');
  const [importError, setImportError] = useState<string | null>(null);
  const [newIoc, setNewIoc] = useState({
    type: 'IP' as IOC['type'],
    value: '',
    tlp: 'GREEN' as IOC['tlp'],
    source: '',
    tags: '',
    description: '',
  });

  useEffect(() => {
    if (fetchedIocs) setLocalIocs(fetchedIocs);
  }, [fetchedIocs]);

  const resetNewIoc = () =>
    setNewIoc({
      type: 'IP',
      value: '',
      tlp: 'GREEN',
      source: '',
      tags: '',
      description: '',
    });

  const closeAddDialog = () => {
    setAddDialogOpen(false);
    resetNewIoc();
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setImportError(null);
    setImportPayload('');
  };

  const handleAddIoc = () => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ioc-${Date.now()}`;
    const now = new Date().toISOString();
    const tags = newIoc.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const next: IOC = {
      id,
      type: newIoc.type,
      value: newIoc.value,
      risk: 50,
      status: 'INVESTIGATING',
      source: newIoc.source || 'Manual Entry',
      firstSeen: now,
      lastSeen: now,
      hits: 0,
      tags,
      description: newIoc.description || undefined,
      tlp: newIoc.tlp,
    };

    setLocalIocs((prev) => [next, ...prev]);
    closeAddDialog();
  };

  const handleImport = () => {
    setImportError(null);
    const raw = importPayload.trim();
    if (!raw) {
      setImportError('Provide IOC data to import.');
      return;
    }

    try {
      let incoming: IOC[] = [];
      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed: unknown = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        incoming = list.map((entry) => {
          const item =
            entry && typeof entry === 'object'
              ? (entry as Record<string, unknown>)
              : {};
          const status =
            typeof item.status === 'string' &&
            ['ACTIVE', 'INACTIVE', 'INVESTIGATING', 'FALSE_POSITIVE'].includes(
              item.status,
            )
              ? (item.status as IOC['status'])
              : 'INVESTIGATING';
          const tags = Array.isArray(item.tags)
            ? item.tags.map((tag) => String(tag))
            : String(item.tags || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
          return {
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `ioc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: normalizeType(
              typeof item.type === 'string' ? item.type : undefined,
            ),
            value: String(item.value || ''),
            risk: Number(item.risk || 50),
            status,
            source: typeof item.source === 'string' ? item.source : 'Imported',
            firstSeen:
              typeof item.firstSeen === 'string'
                ? item.firstSeen
                : new Date().toISOString(),
            lastSeen:
              typeof item.lastSeen === 'string'
                ? item.lastSeen
                : new Date().toISOString(),
            hits: Number(item.hits || 0),
            tags,
            description:
              typeof item.description === 'string' ? item.description : undefined,
            tlp: normalizeTlp(
              typeof item.tlp === 'string' ? item.tlp : undefined,
              importTlp,
            ),
          };
        });
      } else {
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const header = lines[0]?.toLowerCase().includes('type');
        const dataLines = header ? lines.slice(1) : lines;
        incoming = dataLines.map((line) => {
          const [type, value, source, tlp, tags, description] = line
            .split(',')
            .map((part) => part.trim());
          const now = new Date().toISOString();
          return {
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `ioc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: normalizeType(type),
            value: value || '',
            risk: 50,
            status: 'INVESTIGATING',
            source: source || 'Imported',
            firstSeen: now,
            lastSeen: now,
            hits: 0,
            tags: (tags || '')
              .split('|')
              .flatMap((tag) => tag.split(';'))
              .flatMap((tag) => tag.split(','))
              .map((tag) => tag.trim())
              .filter(Boolean),
            description: description || undefined,
            tlp: normalizeTlp(tlp, importTlp),
          };
        });
      }

      if (!incoming.length) {
        setImportError('No valid IOC entries detected.');
        return;
      }
      setLocalIocs((prev) => [...incoming, ...prev]);
      closeImportDialog();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to parse import payload.',
      );
    }
  };

  const columns: GridColDef<IOC>[] = [
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          {getIOCIcon(params.value)}
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      ),
    },
    {
      field: 'value',
      headerName: 'Indicator Value',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              fontSize: '0.85rem',
            }}
          >
            {params.value}
          </Typography>
          {params.row.description && (
            <Typography variant="caption" color="text.secondary">
              {params.row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'risk',
      headerName: 'Risk Score',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={params.value}
            color={(getRiskColor(params.value) as any) ?? 'primary'}
            sx={{ width: 60, height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {params.value}%
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
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
      field: 'hits',
      headerName: 'Hits',
      width: 80,
      type: 'number',
      renderCell: (params) => (
        <Badge
          badgeContent={params.value}
          color={
            params.value > 10
              ? 'error'
              : params.value > 0
                ? 'warning'
                : 'default'
          }
          showZero
        >
          <Timeline />
        </Badge>
      ),
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 140,
    },
    {
      field: 'tlp',
      headerName: 'TLP',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: getTLPColor(params.value),
            color: params.value === 'WHITE' ? '#000' : '#fff',
            fontWeight: 'bold',
          }}
        />
      ),
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {params.value.slice(0, 2).map((tag: string) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {params.value.length > 2 && (
            <Chip
              label={`+${params.value.length - 2}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: () => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Block IOC">
            <IconButton size="small" color="error">
              <Block />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share IOC">
            <IconButton size="small">
              <Share />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredIOCs =
    localIocs?.filter((ioc) => {
      if (selectedTab === 1 && ioc.status !== 'ACTIVE') return false;
      if (selectedTab === 2 && ioc.risk < 70) return false;
      if (selectedTab === 3 && ioc.status !== 'INVESTIGATING') return false;
      return true;
    }) || [];

  const activeIOCs =
    localIocs?.filter((i) => i.status === 'ACTIVE').length || 0;
  const highRiskIOCs = localIocs?.filter((i) => i.risk >= 70).length || 0;
  const totalHits = localIocs?.reduce((sum, ioc) => sum + ioc.hits, 0) || 0;
  const investigatingIOCs =
    localIocs?.filter((i) => i.status === 'INVESTIGATING').length || 0;

  return (
    <Box sx={{ m: 2 }}>
      {/* Stats Overview */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Security color="error" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Active IOCs
                </Typography>
                <Typography variant="h4" color="error.main">
                  {activeIOCs}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Warning color="warning" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  High Risk
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {highRiskIOCs}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Timeline color="info" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Hits
                </Typography>
                <Typography variant="h4" color="info.main">
                  {totalHits}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Search color="primary" />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Investigating
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {investigatingIOCs}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Main IOC List */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">
              Indicators of Compromise (IOCs)
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>IOC Type</InputLabel>
                <Select
                  value={filterType}
                  label="IOC Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="IP">IP Address</MenuItem>
                  <MenuItem value="DOMAIN">Domain</MenuItem>
                  <MenuItem value="URL">URL</MenuItem>
                  <MenuItem value="FILE_HASH">File Hash</MenuItem>
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="REGISTRY">Registry</MenuItem>
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
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INVESTIGATING">Investigating</MenuItem>
                  <MenuItem value="FALSE_POSITIVE">False Positive</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add IOC
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ width: '100%' }}>
            <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
              <Tab label={`All IOCs (${localIocs?.length || 0})`} />
              <Tab label={`Active (${activeIOCs})`} />
              <Tab label={`High Risk (${highRiskIOCs})`} />
              <Tab label={`Under Investigation (${investigatingIOCs})`} />
            </Tabs>
          </Box>

          <div style={{ height: 500, marginTop: 16 }}>
            <DataGrid
              rows={filteredIOCs}
              columns={columns}
              disableRowSelectionOnClick
              density="compact"
              loading={loading}
              onRowDoubleClick={(params) => {
                navigate(`/ioc/${params.row.id}`);
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

      {/* Add IOC Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={closeAddDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New IOC</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>IOC Type</InputLabel>
              <Select
                label="IOC Type"
                value={newIoc.type}
                onChange={(e) =>
                  setNewIoc((prev) => ({
                    ...prev,
                    type: e.target.value as IOC['type'],
                  }))
                }
              >
                <MenuItem value="IP">IP Address</MenuItem>
                <MenuItem value="DOMAIN">Domain Name</MenuItem>
                <MenuItem value="URL">URL</MenuItem>
                <MenuItem value="FILE_HASH">
                  File Hash (MD5/SHA1/SHA256)
                </MenuItem>
                <MenuItem value="EMAIL">Email Address</MenuItem>
                <MenuItem value="PHONE">Phone Number</MenuItem>
                <MenuItem value="REGISTRY">Registry Key</MenuItem>
                <MenuItem value="CERTIFICATE">Certificate</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="IOC Value"
              placeholder="Enter the indicator value..."
              value={newIoc.value}
              onChange={(e) =>
                setNewIoc((prev) => ({ ...prev, value: e.target.value }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>TLP Classification</InputLabel>
              <Select
                label="TLP Classification"
                value={newIoc.tlp}
                onChange={(e) =>
                  setNewIoc((prev) => ({
                    ...prev,
                    tlp: e.target.value as IOC['tlp'],
                  }))
                }
              >
                <MenuItem value="WHITE">TLP:WHITE - Unlimited sharing</MenuItem>
                <MenuItem value="GREEN">TLP:GREEN - Community sharing</MenuItem>
                <MenuItem value="AMBER">TLP:AMBER - Limited sharing</MenuItem>
                <MenuItem value="RED">TLP:RED - No sharing</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Source"
              placeholder="e.g., VirusTotal, Internal Analysis, ThreatConnect"
              value={newIoc.source}
              onChange={(e) =>
                setNewIoc((prev) => ({ ...prev, source: e.target.value }))
              }
            />
            <TextField
              fullWidth
              label="Tags"
              placeholder="e.g., APT29, Phishing, Malware (comma-separated)"
              value={newIoc.tags}
              onChange={(e) =>
                setNewIoc((prev) => ({ ...prev, tags: e.target.value }))
              }
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              placeholder="Describe the context and significance of this IOC..."
              value={newIoc.description}
              onChange={(e) =>
                setNewIoc((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddIoc}
            disabled={!newIoc.value.trim()}
          >
            Add IOC
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import IOC Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={closeImportDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import IOCs</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Upload a CSV file with columns: type, value, source, tlp, tags,
              description
            </Alert>
            {importError && <Alert severity="error">{importError}</Alert>}
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'primary.main',
                cursor: 'pointer',
              }}
            >
              <Upload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">
                Drop files here or click to browse
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: CSV, JSON, STIX
              </Typography>
            </Paper>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Paste IOC data"
              placeholder="type,value,source,tlp,tags,description"
              value={importPayload}
              onChange={(e) => setImportPayload(e.target.value)}
            />
            <TextField
              fullWidth
              select
              label="Default TLP Classification"
              value={importTlp}
              onChange={(e) => setImportTlp(e.target.value as IOC['tlp'])}
            >
              <MenuItem value="WHITE">TLP:WHITE</MenuItem>
              <MenuItem value="GREEN">TLP:GREEN</MenuItem>
              <MenuItem value="AMBER">TLP:AMBER</MenuItem>
              <MenuItem value="RED">TLP:RED</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImportDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImport}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
