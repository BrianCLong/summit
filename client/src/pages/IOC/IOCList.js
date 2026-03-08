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
exports.default = IOCList;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const x_data_grid_1 = require("@mui/x-data-grid");
const icons_material_1 = require("@mui/icons-material");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
const react_router_dom_1 = require("react-router-dom");
const getIOCIcon = (type) => {
    switch (type) {
        case 'IP':
            return <icons_material_1.Language />;
        case 'DOMAIN':
            return <icons_material_1.Language />;
        case 'URL':
            return <icons_material_1.Language />;
        case 'FILE_HASH':
            return <icons_material_1.Fingerprint />;
        case 'EMAIL':
            return <icons_material_1.Email />;
        case 'PHONE':
            return <icons_material_1.Phone />;
        case 'REGISTRY':
            return <icons_material_1.Computer />;
        case 'CERTIFICATE':
            return <icons_material_1.Security />;
        default:
            return <icons_material_1.Security />;
    }
};
const getRiskColor = (risk) => {
    if (risk >= 80)
        return 'error';
    if (risk >= 60)
        return 'warning';
    if (risk >= 40)
        return 'info';
    return 'success';
};
const getStatusColor = (status) => {
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
const getTLPColor = (tlp) => {
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
const IOC_TYPES = [
    'IP',
    'DOMAIN',
    'URL',
    'FILE_HASH',
    'EMAIL',
    'PHONE',
    'REGISTRY',
    'CERTIFICATE',
];
const TLP_LEVELS = ['WHITE', 'GREEN', 'AMBER', 'RED'];
const normalizeType = (value) => {
    const upper = (value || '').toUpperCase();
    return IOC_TYPES.includes(upper) ? upper : 'IP';
};
const normalizeTlp = (value, fallback = 'GREEN') => {
    const upper = (value || '').toUpperCase();
    return TLP_LEVELS.includes(upper)
        ? upper
        : fallback;
};
function IOCList() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [selectedTab, setSelectedTab] = (0, react_1.useState)(0);
    const [filterType, setFilterType] = (0, react_1.useState)('ALL');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('ALL');
    const [addDialogOpen, setAddDialogOpen] = (0, react_1.useState)(false);
    const [importDialogOpen, setImportDialogOpen] = (0, react_1.useState)(false);
    const { data: fetchedIocs, loading } = (0, useSafeQuery_1.useSafeQuery)({
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
                value: 'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\SystemUpdater',
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
    const [localIocs, setLocalIocs] = (0, react_1.useState)([]);
    const [importPayload, setImportPayload] = (0, react_1.useState)('');
    const [importTlp, setImportTlp] = (0, react_1.useState)('GREEN');
    const [importError, setImportError] = (0, react_1.useState)(null);
    const [newIoc, setNewIoc] = (0, react_1.useState)({
        type: 'IP',
        value: '',
        tlp: 'GREEN',
        source: '',
        tags: '',
        description: '',
    });
    (0, react_1.useEffect)(() => {
        if (fetchedIocs)
            setLocalIocs(fetchedIocs);
    }, [fetchedIocs]);
    const resetNewIoc = () => setNewIoc({
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
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `ioc-${Date.now()}`;
        const now = new Date().toISOString();
        const tags = newIoc.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        const next = {
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
            let incoming = [];
            if (raw.startsWith('[') || raw.startsWith('{')) {
                const parsed = JSON.parse(raw);
                const list = Array.isArray(parsed) ? parsed : [parsed];
                incoming = list.map((entry) => {
                    const item = entry && typeof entry === 'object'
                        ? entry
                        : {};
                    const status = typeof item.status === 'string' &&
                        ['ACTIVE', 'INACTIVE', 'INVESTIGATING', 'FALSE_POSITIVE'].includes(item.status)
                        ? item.status
                        : 'INVESTIGATING';
                    const tags = Array.isArray(item.tags)
                        ? item.tags.map((tag) => String(tag))
                        : String(item.tags || '')
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter(Boolean);
                    return {
                        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? crypto.randomUUID()
                            : `ioc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        type: normalizeType(typeof item.type === 'string' ? item.type : undefined),
                        value: String(item.value || ''),
                        risk: Number(item.risk || 50),
                        status,
                        source: typeof item.source === 'string' ? item.source : 'Imported',
                        firstSeen: typeof item.firstSeen === 'string'
                            ? item.firstSeen
                            : new Date().toISOString(),
                        lastSeen: typeof item.lastSeen === 'string'
                            ? item.lastSeen
                            : new Date().toISOString(),
                        hits: Number(item.hits || 0),
                        tags,
                        description: typeof item.description === 'string' ? item.description : undefined,
                        tlp: normalizeTlp(typeof item.tlp === 'string' ? item.tlp : undefined, importTlp),
                    };
                });
            }
            else {
                const lines = raw.split(/\r?\n/).filter(Boolean);
                const header = lines[0]?.toLowerCase().includes('type');
                const dataLines = header ? lines.slice(1) : lines;
                incoming = dataLines.map((line) => {
                    const [type, value, source, tlp, tags, description] = line
                        .split(',')
                        .map((part) => part.trim());
                    const now = new Date().toISOString();
                    return {
                        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
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
        }
        catch (err) {
            setImportError(err instanceof Error ? err.message : 'Failed to parse import payload.');
        }
    };
    const columns = [
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (<material_1.Stack direction="row" alignItems="center" spacing={1}>
          {getIOCIcon(params.value)}
          <material_1.Typography variant="body2">{params.value}</material_1.Typography>
        </material_1.Stack>),
        },
        {
            field: 'value',
            headerName: 'Indicator Value',
            flex: 1,
            renderCell: (params) => (<material_1.Box>
          <material_1.Typography variant="body2" sx={{
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    fontSize: '0.85rem',
                }}>
            {params.value}
          </material_1.Typography>
          {params.row.description && (<material_1.Typography variant="caption" color="text.secondary">
              {params.row.description}
            </material_1.Typography>)}
        </material_1.Box>),
        },
        {
            field: 'risk',
            headerName: 'Risk Score',
            width: 120,
            renderCell: (params) => (<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <material_1.LinearProgress variant="determinate" value={params.value} color={getRiskColor(params.value) ?? 'primary'} sx={{ width: 60, height: 8, borderRadius: 4 }}/>
          <material_1.Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {params.value}%
          </material_1.Typography>
        </material_1.Box>),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => (<material_1.Chip label={params.value} size="small" color={getStatusColor(params.value)} variant="outlined"/>),
        },
        {
            field: 'hits',
            headerName: 'Hits',
            width: 80,
            type: 'number',
            renderCell: (params) => (<material_1.Badge badgeContent={params.value} color={params.value > 10
                    ? 'error'
                    : params.value > 0
                        ? 'warning'
                        : 'default'} showZero>
          <icons_material_1.Timeline />
        </material_1.Badge>),
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
            renderCell: (params) => (<material_1.Chip label={params.value} size="small" sx={{
                    backgroundColor: getTLPColor(params.value),
                    color: params.value === 'WHITE' ? '#000' : '#fff',
                    fontWeight: 'bold',
                }}/>),
        },
        {
            field: 'tags',
            headerName: 'Tags',
            width: 200,
            renderCell: (params) => (<material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {params.value.slice(0, 2).map((tag) => (<material_1.Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }}/>))}
          {params.value.length > 2 && (<material_1.Chip label={`+${params.value.length - 2}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }}/>)}
        </material_1.Box>),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: () => (<material_1.Stack direction="row" spacing={1}>
          <material_1.Tooltip title="Block IOC">
            <material_1.IconButton size="small" color="error">
              <icons_material_1.Block />
            </material_1.IconButton>
          </material_1.Tooltip>
          <material_1.Tooltip title="Share IOC">
            <material_1.IconButton size="small">
              <icons_material_1.Share />
            </material_1.IconButton>
          </material_1.Tooltip>
        </material_1.Stack>),
        },
    ];
    const filteredIOCs = localIocs?.filter((ioc) => {
        if (selectedTab === 1 && ioc.status !== 'ACTIVE')
            return false;
        if (selectedTab === 2 && ioc.risk < 70)
            return false;
        if (selectedTab === 3 && ioc.status !== 'INVESTIGATING')
            return false;
        return true;
    }) || [];
    const activeIOCs = localIocs?.filter((i) => i.status === 'ACTIVE').length || 0;
    const highRiskIOCs = localIocs?.filter((i) => i.risk >= 70).length || 0;
    const totalHits = localIocs?.reduce((sum, ioc) => sum + ioc.hits, 0) || 0;
    const investigatingIOCs = localIocs?.filter((i) => i.status === 'INVESTIGATING').length || 0;
    return (<material_1.Box sx={{ m: 2 }}>
      {/* Stats Overview */}
      <material_1.Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Security color="error"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Active IOCs
                </material_1.Typography>
                <material_1.Typography variant="h4" color="error.main">
                  {activeIOCs}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Warning color="warning"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  High Risk
                </material_1.Typography>
                <material_1.Typography variant="h4" color="warning.main">
                  {highRiskIOCs}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Timeline color="info"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Total Hits
                </material_1.Typography>
                <material_1.Typography variant="h4" color="info.main">
                  {totalHits}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card sx={{ flex: 1, borderRadius: 3 }}>
          <material_1.CardContent>
            <material_1.Stack direction="row" alignItems="center" spacing={1}>
              <icons_material_1.Search color="primary"/>
              <material_1.Box>
                <material_1.Typography variant="subtitle2" color="text.secondary">
                  Investigating
                </material_1.Typography>
                <material_1.Typography variant="h4" color="primary.main">
                  {investigatingIOCs}
                </material_1.Typography>
              </material_1.Box>
            </material_1.Stack>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Stack>

      {/* Main IOC List */}
      <material_1.Card sx={{ borderRadius: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <material_1.Typography variant="h6">
              Indicators of Compromise (IOCs)
            </material_1.Typography>
            <material_1.Stack direction="row" spacing={2}>
              <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
                <material_1.InputLabel>IOC Type</material_1.InputLabel>
                <material_1.Select value={filterType} label="IOC Type" onChange={(e) => setFilterType(e.target.value)}>
                  <material_1.MenuItem value="ALL">All Types</material_1.MenuItem>
                  <material_1.MenuItem value="IP">IP Address</material_1.MenuItem>
                  <material_1.MenuItem value="DOMAIN">Domain</material_1.MenuItem>
                  <material_1.MenuItem value="URL">URL</material_1.MenuItem>
                  <material_1.MenuItem value="FILE_HASH">File Hash</material_1.MenuItem>
                  <material_1.MenuItem value="EMAIL">Email</material_1.MenuItem>
                  <material_1.MenuItem value="REGISTRY">Registry</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
              <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
                <material_1.InputLabel>Status</material_1.InputLabel>
                <material_1.Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <material_1.MenuItem value="ALL">All Status</material_1.MenuItem>
                  <material_1.MenuItem value="ACTIVE">Active</material_1.MenuItem>
                  <material_1.MenuItem value="INVESTIGATING">Investigating</material_1.MenuItem>
                  <material_1.MenuItem value="FALSE_POSITIVE">False Positive</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
              <material_1.Button variant="outlined" startIcon={<icons_material_1.Upload />} onClick={() => setImportDialogOpen(true)}>
                Import
              </material_1.Button>
              <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => setAddDialogOpen(true)}>
                Add IOC
              </material_1.Button>
            </material_1.Stack>
          </material_1.Stack>

          <material_1.Box sx={{ width: '100%' }}>
            <material_1.Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
              <material_1.Tab label={`All IOCs (${localIocs?.length || 0})`}/>
              <material_1.Tab label={`Active (${activeIOCs})`}/>
              <material_1.Tab label={`High Risk (${highRiskIOCs})`}/>
              <material_1.Tab label={`Under Investigation (${investigatingIOCs})`}/>
            </material_1.Tabs>
          </material_1.Box>

          <div style={{ height: 500, marginTop: 16 }}>
            <x_data_grid_1.DataGrid rows={filteredIOCs} columns={columns} disableRowSelectionOnClick density="compact" loading={loading} onRowDoubleClick={(params) => {
            navigate(`/ioc/${params.row.id}`);
        }} sx={{
            '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
            },
        }}/>
          </div>
        </material_1.CardContent>
      </material_1.Card>

      {/* Add IOC Dialog */}
      <material_1.Dialog open={addDialogOpen} onClose={closeAddDialog} maxWidth="md" fullWidth>
        <material_1.DialogTitle>Add New IOC</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Stack spacing={3} sx={{ mt: 1 }}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>IOC Type</material_1.InputLabel>
              <material_1.Select label="IOC Type" value={newIoc.type} onChange={(e) => setNewIoc((prev) => ({
            ...prev,
            type: e.target.value,
        }))}>
                <material_1.MenuItem value="IP">IP Address</material_1.MenuItem>
                <material_1.MenuItem value="DOMAIN">Domain Name</material_1.MenuItem>
                <material_1.MenuItem value="URL">URL</material_1.MenuItem>
                <material_1.MenuItem value="FILE_HASH">
                  File Hash (MD5/SHA1/SHA256)
                </material_1.MenuItem>
                <material_1.MenuItem value="EMAIL">Email Address</material_1.MenuItem>
                <material_1.MenuItem value="PHONE">Phone Number</material_1.MenuItem>
                <material_1.MenuItem value="REGISTRY">Registry Key</material_1.MenuItem>
                <material_1.MenuItem value="CERTIFICATE">Certificate</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.TextField fullWidth label="IOC Value" placeholder="Enter the indicator value..." value={newIoc.value} onChange={(e) => setNewIoc((prev) => ({ ...prev, value: e.target.value }))}/>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>TLP Classification</material_1.InputLabel>
              <material_1.Select label="TLP Classification" value={newIoc.tlp} onChange={(e) => setNewIoc((prev) => ({
            ...prev,
            tlp: e.target.value,
        }))}>
                <material_1.MenuItem value="WHITE">TLP:WHITE - Unlimited sharing</material_1.MenuItem>
                <material_1.MenuItem value="GREEN">TLP:GREEN - Community sharing</material_1.MenuItem>
                <material_1.MenuItem value="AMBER">TLP:AMBER - Limited sharing</material_1.MenuItem>
                <material_1.MenuItem value="RED">TLP:RED - No sharing</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.TextField fullWidth label="Source" placeholder="e.g., VirusTotal, Internal Analysis, ThreatConnect" value={newIoc.source} onChange={(e) => setNewIoc((prev) => ({ ...prev, source: e.target.value }))}/>
            <material_1.TextField fullWidth label="Tags" placeholder="e.g., APT29, Phishing, Malware (comma-separated)" value={newIoc.tags} onChange={(e) => setNewIoc((prev) => ({ ...prev, tags: e.target.value }))}/>
            <material_1.TextField fullWidth multiline rows={3} label="Description" placeholder="Describe the context and significance of this IOC..." value={newIoc.description} onChange={(e) => setNewIoc((prev) => ({ ...prev, description: e.target.value }))}/>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={closeAddDialog}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={handleAddIoc} disabled={!newIoc.value.trim()}>
            Add IOC
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Import IOC Dialog */}
      <material_1.Dialog open={importDialogOpen} onClose={closeImportDialog} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Import IOCs</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Stack spacing={3} sx={{ mt: 1 }}>
            <material_1.Alert severity="info">
              Upload a CSV file with columns: type, value, source, tlp, tags,
              description
            </material_1.Alert>
            {importError && <material_1.Alert severity="error">{importError}</material_1.Alert>}
            <material_1.Paper variant="outlined" sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: 'primary.main',
            cursor: 'pointer',
        }}>
              <icons_material_1.Upload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}/>
              <material_1.Typography variant="h6">
                Drop files here or click to browse
              </material_1.Typography>
              <material_1.Typography variant="body2" color="text.secondary">
                Supported formats: CSV, JSON, STIX
              </material_1.Typography>
            </material_1.Paper>
            <material_1.TextField fullWidth multiline minRows={4} label="Paste IOC data" placeholder="type,value,source,tlp,tags,description" value={importPayload} onChange={(e) => setImportPayload(e.target.value)}/>
            <material_1.TextField fullWidth select label="Default TLP Classification" value={importTlp} onChange={(e) => setImportTlp(e.target.value)}>
              <material_1.MenuItem value="WHITE">TLP:WHITE</material_1.MenuItem>
              <material_1.MenuItem value="GREEN">TLP:GREEN</material_1.MenuItem>
              <material_1.MenuItem value="AMBER">TLP:AMBER</material_1.MenuItem>
              <material_1.MenuItem value="RED">TLP:RED</material_1.MenuItem>
            </material_1.TextField>
          </material_1.Stack>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={closeImportDialog}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={handleImport}>
            Import
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
