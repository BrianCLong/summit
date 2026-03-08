"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HuntList;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const x_data_grid_1 = require("@mui/x-data-grid");
const icons_material_1 = require("@mui/icons-material");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const react_router_dom_1 = require("react-router-dom");
const getStatusColor = (status) => {
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
const getStatusIcon = (status) => {
    switch (status) {
        case 'RUNNING':
            return <icons_material_1.PlayArrow />;
        case 'SCHEDULED':
            return <icons_material_1.Schedule />;
        case 'COMPLETED':
            return <icons_material_1.CheckCircle />;
        case 'FAILED':
            return <icons_material_1.Error />;
        case 'PAUSED':
            return <icons_material_1.Stop />;
        default:
            return null;
    }
};
const getSeverityColor = (severity) => {
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
function HuntList() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [selectedTab, setSelectedTab] = (0, react_1.useState)(0);
    const [filterType, setFilterType] = (0, react_1.useState)('ALL');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('ALL');
    const [createDialogOpen, setCreateDialogOpen] = (0, react_1.useState)(false);
    const { data: fetchedHunts, loading } = (0, useSafeQuery_1.useSafeQuery)({
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
                description: 'Hunting for known APT29 indicators including file hashes, domains, and network signatures',
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
                description: 'Detecting periodic outbound connections that may indicate C2 communication',
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
                description: 'Machine learning based detection of unusual financial transaction patterns',
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
                description: 'Behavioral analysis for detecting insider threats attempting credential harvesting',
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
                description: 'Detection of malicious PowerShell usage leveraging built-in Windows tools',
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
                description: 'Detecting data exfiltration through DNS tunneling techniques',
            },
        ],
        deps: [filterType, filterStatus],
    });
    const [localHunts, setLocalHunts] = (0, react_1.useState)([]);
    const [newHunt, setNewHunt] = (0, react_1.useState)({
        name: '',
        type: 'IOC',
        tactic: 'Initial Access',
        description: '',
    });
    (0, react_1.useEffect)(() => {
        if (fetchedHunts)
            setLocalHunts(fetchedHunts);
    }, [fetchedHunts]);
    const resetNewHunt = () => setNewHunt({
        name: '',
        type: 'IOC',
        tactic: 'Initial Access',
        description: '',
    });
    const closeCreateDialog = () => {
        setCreateDialogOpen(false);
        resetNewHunt();
    };
    const handleCreateHunt = () => {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `hunt-${Date.now()}`;
        const now = new Date().toISOString();
        const next = {
            id,
            name: newHunt.name,
            status: 'SCHEDULED',
            type: newHunt.type,
            tactic: newHunt.tactic,
            lastRun: now,
            findings: 0,
            severity: 'MEDIUM',
            description: newHunt.description || 'New hunt created',
        };
        setLocalHunts((prev) => [next, ...prev]);
        closeCreateDialog();
    };
    const columns = [
        {
            field: 'name',
            headerName: 'Hunt Name',
            flex: 1,
            renderCell: (params) => (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon(params.row.status)}
          <material_1.Box>
            <material_1.Typography variant="body2" sx={{ fontWeight: 500 }}>
              {params.value}
            </material_1.Typography>
            <material_1.Typography variant="caption" color="text.secondary">
              {params.row.description}
            </material_1.Typography>
          </material_1.Box>
        </material_1.Box>),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 140,
            renderCell: (params) => (<material_1.Chip label={params.value} size="small" variant="outlined" icon={params.value === 'MITRE_ATT&CK' ? <icons_material_1.Security /> : undefined}/>),
        },
        {
            field: 'tactic',
            headerName: 'MITRE Tactic',
            width: 160,
            renderCell: (params) => (<material_1.Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {params.value}
        </material_1.Typography>),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (<material_1.Chip label={params.value} size="small" color={getStatusColor(params.value)} variant="outlined"/>),
        },
        {
            field: 'findings',
            headerName: 'Findings',
            width: 100,
            type: 'number',
            renderCell: (params) => (<material_1.Badge badgeContent={params.value} color={params.value > 0 ? 'error' : 'default'} showZero>
          <icons_material_1.Assessment />
        </material_1.Badge>),
        },
        {
            field: 'severity',
            headerName: 'Severity',
            width: 100,
            renderCell: (params) => (<material_1.Chip label={params.value} size="small" color={getSeverityColor(params.value)} variant="filled"/>),
        },
        {
            field: 'lastRun',
            headerName: 'Last Run',
            width: 160,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valueFormatter: (params) => new Date(params.value).toLocaleString(),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params) => (<material_1.Stack direction="row" spacing={1}>
          <material_1.Tooltip title={params.row.status === 'RUNNING' ? 'Stop Hunt' : 'Start Hunt'}>
            <material_1.IconButton size="small">
              {params.row.status === 'RUNNING' ? <icons_material_1.Stop /> : <icons_material_1.PlayArrow />}
            </material_1.IconButton>
          </material_1.Tooltip>
          <material_1.Tooltip title="View Timeline">
            <material_1.IconButton size="small">
              <icons_material_1.Timeline />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Stack>),
        },
    ];
    const filteredHunts = localHunts?.filter((hunt) => {
        if (selectedTab === 1 && hunt.status !== 'RUNNING')
            return false;
        if (selectedTab === 2 && hunt.status !== 'SCHEDULED')
            return false;
        if (selectedTab === 3 && hunt.findings === 0)
            return false;
        return true;
    }) || [];
    const runningHunts = localHunts?.filter((h) => h.status === 'RUNNING').length || 0;
    const totalFindings = localHunts?.reduce((sum, hunt) => sum + hunt.findings, 0) || 0;
    const criticalHunts = localHunts?.filter((h) => h.severity === 'CRITICAL').length || 0;
    const failedHunts = localHunts?.filter((h) => h.status === 'FAILED').length || 0;
    return (<material_1.Box sx={{ m: 2 }}>
      {/* Stats Overview */}
      <material_1.Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.PlayArrow color="primary"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Active Hunts
                </material_1.Typography>
                <material_1.Typography variant="h4" color="primary">
                  {runningHunts}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Assessment color="warning"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Total Findings
                </material_1.Typography>
                <material_1.Typography variant="h4" color="warning.main">
                  {totalFindings}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Security color="error"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Critical Hunts
                </material_1.Typography>
                <material_1.Typography variant="h4" color="error.main">
                  {criticalHunts}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Error color="error"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Failed Hunts
                </material_1.Typography>
                <material_1.Typography variant="h4" color="error.main">
                  {failedHunts}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Stack>

      {/* Main Hunt List */}
      <material_1.Card sx={{ borderRadius: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <material_1.Typography variant="h6">Threat Hunting Operations</material_1.Typography>
            <material_1.Stack direction="row" spacing={2}>
              <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
                <material_1.InputLabel>Hunt Type</material_1.InputLabel>
                <material_1.Select value={filterType} label="Hunt Type" onChange={(e) => setFilterType(e.target.value)}>
                  <material_1.MenuItem value="ALL">All Types</material_1.MenuItem>
                  <material_1.MenuItem value="IOC">IOC Hunt</material_1.MenuItem>
                  <material_1.MenuItem value="BEHAVIORAL">Behavioral</material_1.MenuItem>
                  <material_1.MenuItem value="NETWORK">Network</material_1.MenuItem>
                  <material_1.MenuItem value="FINANCIAL">Financial</material_1.MenuItem>
                  <material_1.MenuItem value="MITRE_ATT&CK">MITRE ATT&CK</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
              <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
                <material_1.InputLabel>Status</material_1.InputLabel>
                <material_1.Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <material_1.MenuItem value="ALL">All Status</material_1.MenuItem>
                  <material_1.MenuItem value="RUNNING">Running</material_1.MenuItem>
                  <material_1.MenuItem value="SCHEDULED">Scheduled</material_1.MenuItem>
                  <material_1.MenuItem value="COMPLETED">Completed</material_1.MenuItem>
                  <material_1.MenuItem value="FAILED">Failed</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
              <material_1.Tooltip title="Refresh Hunt Status">
                <material_1.IconButton>
                  <icons_material_1.Refresh />
                </material_1.IconButton>
              </material_1.Tooltip>
              <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => setCreateDialogOpen(true)}>
                Create Hunt
              </material_1.Button>
            </material_1.Stack>
          </material_1.Stack>

          <material_1.Box sx={{ width: '100%' }}>
            <material_1.Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
              <material_1.Tab label={`All Hunts (${localHunts?.length || 0})`}/>
              <material_1.Tab label={`Running (${runningHunts})`}/>
              <material_1.Tab label={`Scheduled (${localHunts?.filter((h) => h.status === 'SCHEDULED').length || 0})`}/>
              <material_1.Tab label={`With Findings (${localHunts?.filter((h) => h.findings > 0).length || 0})`}/>
            </material_1.Tabs>
          </material_1.Box>

          <div style={{ height: 500, marginTop: 16 }}>
            <x_data_grid_1.DataGrid rows={filteredHunts} columns={columns} disableRowSelectionOnClick density="compact" loading={loading} onRowDoubleClick={(params) => {
            navigate(`/hunts/${params.row.id}`);
        }} sx={{
            '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
            },
        }}/>
          </div>
        </material_1.CardContent>
      </material_1.Card>

      {/* Create Hunt Dialog */}
      <material_1.Dialog open={createDialogOpen} onClose={closeCreateDialog} maxWidth="md" fullWidth>
        <material_1.DialogTitle>Create New Threat Hunt</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Stack spacing={3} sx={{ mt: 1 }}>
            <material_1.TextField fullWidth label="Hunt Name" placeholder="e.g., APT28 IOC Hunt - Fancy Bear Campaign" value={newHunt.name} onChange={(e) => setNewHunt((prev) => ({ ...prev, name: e.target.value }))}/>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Hunt Type</material_1.InputLabel>
              <material_1.Select label="Hunt Type" value={newHunt.type} onChange={(e) => setNewHunt((prev) => ({
            ...prev,
            type: e.target.value,
        }))}>
                <material_1.MenuItem value="IOC">IOC-based Hunt</material_1.MenuItem>
                <material_1.MenuItem value="BEHAVIORAL">Behavioral Analysis</material_1.MenuItem>
                <material_1.MenuItem value="NETWORK">Network Traffic Analysis</material_1.MenuItem>
                <material_1.MenuItem value="FINANCIAL">
                  Financial Anomaly Detection
                </material_1.MenuItem>
                <material_1.MenuItem value="MITRE_ATT&CK">MITRE ATT&CK Framework</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>MITRE ATT&CK Tactic</material_1.InputLabel>
              <material_1.Select label="MITRE ATT&CK Tactic" value={newHunt.tactic} onChange={(e) => setNewHunt((prev) => ({ ...prev, tactic: e.target.value }))}>
                <material_1.MenuItem value="Initial Access">Initial Access</material_1.MenuItem>
                <material_1.MenuItem value="Execution">Execution</material_1.MenuItem>
                <material_1.MenuItem value="Persistence">Persistence</material_1.MenuItem>
                <material_1.MenuItem value="Privilege Escalation">
                  Privilege Escalation
                </material_1.MenuItem>
                <material_1.MenuItem value="Defense Evasion">Defense Evasion</material_1.MenuItem>
                <material_1.MenuItem value="Credential Access">Credential Access</material_1.MenuItem>
                <material_1.MenuItem value="Discovery">Discovery</material_1.MenuItem>
                <material_1.MenuItem value="Lateral Movement">Lateral Movement</material_1.MenuItem>
                <material_1.MenuItem value="Collection">Collection</material_1.MenuItem>
                <material_1.MenuItem value="Command and Control">
                  Command and Control
                </material_1.MenuItem>
                <material_1.MenuItem value="Exfiltration">Exfiltration</material_1.MenuItem>
                <material_1.MenuItem value="Impact">Impact</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.TextField fullWidth multiline rows={3} label="Description" placeholder="Describe the hunt objectives and methodology..." value={newHunt.description} onChange={(e) => setNewHunt((prev) => ({
            ...prev,
            description: e.target.value,
        }))}/>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={closeCreateDialog}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={handleCreateHunt} disabled={!newHunt.name.trim()}>
            Create Hunt
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
