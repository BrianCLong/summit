import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Alert,
  Badge,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Menu,
  MenuItem as MenuItemComponent
} from '@mui/material';
import {
  Security,
  BugReport,
  Search,
  Timeline,
  Assessment,
  Warning,
  CheckCircle,
  Info,
  Block,
  Visibility,
  PlayArrow,
  Add,
  Edit,
  Delete,
  ExpandMore,
  MoreVert,
  TrendingUp,
  Computer,
  Language,
  Fingerprint,
  Shield,
  Psychology,
  Science,
  Analytics,
  Storage,
  CloudSync,
  Radar,
  GpsFixed,
  Public,
  VpnLock,
  Report,
  Flag,
  FilterList
} from '@mui/icons-material';

// Mock data for demonstration
const mockIOCs = [
  {
    id: 'ioc-1',
    type: 'ip',
    value: '185.220.101.42',
    description: 'Known C2 server for banking trojan',
    threatType: 'c2',
    severity: 'HIGH',
    confidence: 0.9,
    firstSeen: '2025-08-20T10:00:00Z',
    lastSeen: '2025-08-26T15:30:00Z',
    tags: ['banking_trojan', 'c2_server', 'emotet'],
    source: 'MISP',
    tlp: 'AMBER',
    isActive: true,
    falsePositive: false,
    detectionCount: 5,
    attribution: { group: 'TA542', country: 'RU', confidence: 0.8 }
  },
  {
    id: 'ioc-2',
    type: 'domain',
    value: 'evil-phishing-site.com',
    description: 'Phishing domain impersonating major bank',
    threatType: 'phishing',
    severity: 'CRITICAL',
    confidence: 0.95,
    firstSeen: '2025-08-25T08:00:00Z',
    lastSeen: '2025-08-26T17:00:00Z',
    tags: ['phishing', 'banking', 'credential_harvesting'],
    source: 'Anti-Phishing Working Group',
    tlp: 'WHITE',
    isActive: true,
    falsePositive: false,
    detectionCount: 12,
    attribution: { country: 'CN', confidence: 0.7 }
  },
  {
    id: 'ioc-3',
    type: 'file_hash',
    value: '44d88612fea8a8f36de82e1278abb02f',
    description: 'Ransomware payload (MD5)',
    threatType: 'ransomware',
    severity: 'CRITICAL',
    confidence: 1.0,
    firstSeen: '2025-08-24T12:00:00Z',
    lastSeen: '2025-08-26T16:45:00Z',
    tags: ['ransomware', 'lockbit', 'encryption'],
    source: 'VirusTotal',
    tlp: 'GREEN',
    isActive: true,
    falsePositive: false,
    detectionCount: 3,
    attribution: { group: 'LockBit', confidence: 1.0 }
  },
  {
    id: 'ioc-4',
    type: 'url',
    value: 'http://malicious-download.site/payload.exe',
    description: 'Malware download URL',
    threatType: 'malware',
    severity: 'HIGH',
    confidence: 0.85,
    firstSeen: '2025-08-23T14:30:00Z',
    lastSeen: '2025-08-25T09:15:00Z',
    tags: ['malware_download', 'trojan', 'initial_access'],
    source: 'URLVoid',
    tlp: 'AMBER',
    isActive: false,
    falsePositive: false,
    detectionCount: 1,
    attribution: { country: 'Unknown', confidence: 0.3 }
  }
];

const mockHunts = [
  {
    id: 'hunt-1',
    name: 'APT29 Activity Hunt',
    description: 'Hunting for APT29 TTPs in enterprise environment',
    hypothesis: 'APT29 may be using legitimate admin tools for lateral movement',
    huntType: 'PROACTIVE',
    priority: 'HIGH',
    status: 'ACTIVE',
    createdBy: 'threat-hunter-1',
    assignedTo: ['threat-hunter-1', 'analyst-2'],
    startDate: '2025-08-25T09:00:00Z',
    queries: [
      {
        id: 'query-1',
        name: 'Suspicious PowerShell Activity',
        description: 'Look for encoded PowerShell commands',
        query: 'index=windows EventCode=4688 | where CommandLine contains "-enc" OR CommandLine contains "-e "',
        queryType: 'SPLUNK',
        dataSource: 'Windows Event Logs',
        results: [{ timestamp: '2025-08-26T10:00:00Z', count: 23 }]
      },
      {
        id: 'query-2',
        name: 'Living Off The Land Binaries',
        description: 'Detect abuse of legitimate Windows binaries',
        query: 'index=sysmon EventID=1 | where Image matches ".*\\\\(wmic|powershell|rundll32)\\.exe"',
        queryType: 'SPLUNK',
        dataSource: 'Sysmon Logs',
        results: [{ timestamp: '2025-08-26T11:30:00Z', count: 47 }]
      }
    ],
    findings: [
      {
        id: 'finding-1',
        title: 'Suspicious PowerShell Execution',
        description: 'Base64 encoded PowerShell commands detected on multiple hosts',
        severity: 'HIGH',
        confidence: 0.8,
        status: 'CONFIRMED'
      }
    ],
    tags: ['apt29', 'cozy_bear', 'powershell', 'lateral_movement'],
    ttps: ['T1059.001', 'T1027', 'T1021.001'],
    createdAt: '2025-08-25T09:00:00Z'
  },
  {
    id: 'hunt-2',
    name: 'Cryptocurrency Mining Detection',
    description: 'Hunt for unauthorized cryptocurrency mining activity',
    hypothesis: 'Attackers may be using compromised systems for cryptocurrency mining',
    huntType: 'REACTIVE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    createdBy: 'security-analyst-1',
    assignedTo: ['security-analyst-1'],
    startDate: '2025-08-20T14:00:00Z',
    completedAt: '2025-08-24T16:00:00Z',
    queries: [
      {
        id: 'query-3',
        name: 'High CPU Usage Processes',
        description: 'Identify processes with sustained high CPU usage',
        query: 'SELECT process_name, cpu_percent FROM processes WHERE cpu_percent > 80',
        queryType: 'SQL',
        dataSource: 'OSQuery',
        results: [{ timestamp: '2025-08-21T15:00:00Z', count: 8 }]
      }
    ],
    findings: [
      {
        id: 'finding-2',
        title: 'Cryptomining Malware Detected',
        description: 'XMRig cryptocurrency miner found on 3 workstations',
        severity: 'MEDIUM',
        confidence: 0.95,
        status: 'RESOLVED'
      }
    ],
    tags: ['cryptomining', 'malware', 'resource_abuse'],
    ttps: ['T1496'],
    createdAt: '2025-08-20T14:00:00Z'
  }
];

const mockDetections = [
  {
    id: 'det-1',
    iocId: 'ioc-1',
    iocValue: '185.220.101.42',
    detectionTime: '2025-08-26T16:30:00Z',
    source: 'Firewall Logs',
    sourceIP: '10.0.1.45',
    hostname: 'workstation-025',
    severity: 'HIGH',
    status: 'NEW',
    description: 'Outbound connection to known C2 server',
    enrichment: {
      geolocation: { country: 'RU', city: 'Moscow' },
      reputation: { score: 15, category: 'MALICIOUS' }
    }
  },
  {
    id: 'det-2',
    iocId: 'ioc-2',
    iocValue: 'evil-phishing-site.com',
    detectionTime: '2025-08-26T15:45:00Z',
    source: 'Proxy Logs',
    sourceIP: '10.0.2.78',
    hostname: 'laptop-198',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    description: 'User accessed known phishing domain',
    enrichment: {
      reputation: { score: 5, category: 'MALICIOUS' },
      dns: [{ type: 'A', value: '192.168.100.50' }]
    }
  },
  {
    id: 'det-3',
    iocId: 'ioc-3',
    iocValue: '44d88612fea8a8f36de82e1278abb02f',
    detectionTime: '2025-08-26T14:20:00Z',
    source: 'Endpoint Detection',
    sourceIP: '10.0.3.112',
    hostname: 'server-042',
    severity: 'CRITICAL',
    status: 'CONFIRMED',
    description: 'Ransomware file hash detected in quarantine',
    enrichment: {
      sandbox: { verdict: 'MALICIOUS', score: 95 }
    }
  }
];

const mockStats = {
  iocs: {
    total: 1247,
    active: 892,
    byType: { ip: 445, domain: 298, file_hash: 287, url: 156, email: 61 },
    bySeverity: { CRITICAL: 89, HIGH: 267, MEDIUM: 345, LOW: 546 },
    recentlyAdded: 23
  },
  hunts: {
    total: 45,
    active: 8,
    byStatus: { ACTIVE: 8, COMPLETED: 32, PLANNING: 3, ON_HOLD: 2 },
    avgDuration: 5.2
  },
  detections: {
    total: 3847,
    new: 45,
    byStatus: { NEW: 45, INVESTIGATING: 23, CONFIRMED: 12, FALSE_POSITIVE: 8 },
    recent24h: 67
  },
  feeds: {
    total: 12,
    active: 10,
    lastUpdate: Date.now() - 3600000 // 1 hour ago
  }
};

const ThreatHuntingDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedIOC, setSelectedIOC] = useState(null);
  const [selectedHunt, setSelectedHunt] = useState(null);
  const [iocDialogOpen, setIOCDialogOpen] = useState(false);
  const [huntDialogOpen, setHuntDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // New IOC form state
  const [newIOC, setNewIOC] = useState({
    type: 'ip',
    value: '',
    description: '',
    threatType: 'malware',
    severity: 'MEDIUM',
    confidence: 0.7,
    tags: [],
    source: 'Manual Entry',
    tlp: 'WHITE'
  });

  // New hunt form state
  const [newHunt, setNewHunt] = useState({
    name: '',
    description: '',
    hypothesis: '',
    huntType: 'PROACTIVE',
    priority: 'MEDIUM',
    assignedTo: [],
    tags: [],
    ttps: []
  });

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateIOC = () => {
    console.log('Creating IOC:', newIOC);
    setIOCDialogOpen(false);
    setNewIOC({
      type: 'ip',
      value: '',
      description: '',
      threatType: 'malware',
      severity: 'MEDIUM',
      confidence: 0.7,
      tags: [],
      source: 'Manual Entry',
      tlp: 'WHITE'
    });
  };

  const handleCreateHunt = () => {
    console.log('Creating hunt:', newHunt);
    setHuntDialogOpen(false);
    setNewHunt({
      name: '',
      description: '',
      hypothesis: '',
      huntType: 'PROACTIVE',
      priority: 'MEDIUM',
      assignedTo: [],
      tags: [],
      ttps: []
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getTLPColor = (tlp) => {
    switch (tlp) {
      case 'RED': return 'error';
      case 'AMBER': return 'warning';
      case 'GREEN': return 'success';
      case 'WHITE': return 'default';
      default: return 'default';
    }
  };

  const getIOCTypeIcon = (type) => {
    switch (type) {
      case 'ip': return <Public />;
      case 'domain': return <Language />;
      case 'file_hash': return <Fingerprint />;
      case 'url': return <Link />;
      case 'email': return <Email />;
      default: return <Security />;
    }
  };

  const getHuntStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <PlayArrow color="success" />;
      case 'COMPLETED': return <CheckCircle color="primary" />;
      case 'PLANNING': return <Psychology color="info" />;
      case 'ON_HOLD': return <Block color="warning" />;
      default: return <Timeline />;
    }
  };

  const getDetectionStatusColor = (status) => {
    switch (status) {
      case 'NEW': return 'error';
      case 'INVESTIGATING': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'FALSE_POSITIVE': return 'success';
      case 'RESOLVED': return 'default';
      default: return 'default';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filteredIOCs = mockIOCs.filter(ioc => {
    return (filterType === 'all' || ioc.type === filterType) &&
           (filterSeverity === 'all' || ioc.severity === filterSeverity);
  });

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Radar color="primary" />
            🎯 Advanced Threat Hunting & IOC Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive threat hunting platform with IOC management, automated detection, and intelligence correlation
          </Typography>
          
          {/* Statistics Overview */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">Active IOCs</Typography>
                <Typography variant="h6" color="primary">
                  {mockStats.iocs.active.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of {mockStats.iocs.total.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">Active Hunts</Typography>
                <Typography variant="h6" color="warning.main">
                  {mockStats.hunts.active}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mockStats.hunts.avgDuration}d avg
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">New Detections</Typography>
                <Typography variant="h6" color="error.main">
                  {mockStats.detections.new}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mockStats.detections.recent24h} in 24h
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">Intel Feeds</Typography>
                <Typography variant="h6" color="success.main">
                  {mockStats.feeds.active}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  feeds active
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => setIOCDialogOpen(true)}
            >
              Add IOC
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Search />} 
              onClick={() => setHuntDialogOpen(true)}
            >
              New Hunt
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<CloudSync />}
            >
              Sync Feeds
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab 
              label="IOC Management" 
              icon={<Badge badgeContent={mockStats.iocs.active} color="primary">
                <Shield />
              </Badge>}
            />
            <Tab 
              label="Threat Hunts" 
              icon={<Badge badgeContent={mockStats.hunts.active} color="warning">
                <Radar />
              </Badge>}
            />
            <Tab 
              label="Detections" 
              icon={<Badge badgeContent={mockStats.detections.new} color="error">
                <GpsFixed />
              </Badge>}
            />
            <Tab 
              label="Intelligence Feeds" 
              icon={<Badge badgeContent={mockStats.feeds.active} color="success">
                <CloudSync />
              </Badge>}
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* IOC Management Tab */}
          {currentTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Indicators of Compromise</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filterType}
                      label="Type"
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="ip">IP Address</MenuItem>
                      <MenuItem value="domain">Domain</MenuItem>
                      <MenuItem value="file_hash">File Hash</MenuItem>
                      <MenuItem value="url">URL</MenuItem>
                      <MenuItem value="email">Email</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={filterSeverity}
                      label="Severity"
                      onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                      <MenuItem value="all">All Severities</MenuItem>
                      <MenuItem value="CRITICAL">Critical</MenuItem>
                      <MenuItem value="HIGH">High</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                      <MenuItem value="LOW">Low</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* IOC Statistics */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>IOCs by Type</Typography>
                    {Object.entries(mockStats.iocs.byType).map(([type, count]) => (
                      <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getIOCTypeIcon(type)}
                          <Typography variant="body2">{type.toUpperCase()}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">{count}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>IOCs by Severity</Typography>
                    {Object.entries(mockStats.iocs.bySeverity).map(([severity, count]) => (
                      <Box key={severity} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Chip 
                          label={severity}
                          color={getSeverityColor(severity)}
                          size="small"
                        />
                        <Typography variant="body2" fontWeight="bold">{count}</Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>

              {/* IOCs List */}
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>IOC</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Threat Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>TLP</TableCell>
                    <TableCell>Detections</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredIOCs.map((ioc) => (
                    <TableRow key={ioc.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getIOCTypeIcon(ioc.type)}
                          <Box>
                            <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                              {ioc.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ioc.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={ioc.type.toUpperCase()} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={ioc.threatType.replace('_', ' ').toUpperCase()} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={ioc.severity}
                          color={getSeverityColor(ioc.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={ioc.tlp}
                          color={getTLPColor(ioc.tlp)}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge badgeContent={ioc.detectionCount} color="error">
                          <Button size="small">View</Button>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatTimeAgo(ioc.lastSeen)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            setSelectedIOC(ioc);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Threat Hunts Tab */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Active Threat Hunts</Typography>
              
              {/* Hunt Statistics */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {Object.entries(mockStats.hunts.byStatus).map(([status, count]) => (
                  <Grid item xs={6} sm={3} key={status}>
                    <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                        {getHuntStatusIcon(status)}
                        <Typography variant="caption">{status.replace('_', ' ')}</Typography>
                      </Box>
                      <Typography variant="h6">{count}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Hunts List */}
              <List>
                {mockHunts.map((hunt) => (
                  <ListItem 
                    key={hunt.id} 
                    divider
                    sx={{ 
                      bgcolor: hunt.status === 'ACTIVE' ? 'action.hover' : 'inherit',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      {getHuntStatusIcon(hunt.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{hunt.name}</Typography>
                          <Chip 
                            label={hunt.priority}
                            color={getSeverityColor(hunt.priority)}
                            size="small"
                          />
                          <Chip 
                            label={hunt.huntType}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {hunt.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Hypothesis: {hunt.hypothesis}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {hunt.tags.slice(0, 3).map((tag) => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Created: {formatTimeAgo(hunt.createdAt)} • {hunt.queries.length} queries • {hunt.findings.length} findings
                          </Typography>
                        </Box>
                      }
                    />
                    <Button 
                      size="small" 
                      onClick={() => {
                        setSelectedHunt(hunt);
                        setDetailDialogOpen(true);
                      }}
                    >
                      View Hunt
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Detections Tab */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>IOC Detections</Typography>
              
              {/* Detection Statistics */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {Object.entries(mockStats.detections.byStatus).map(([status, count]) => (
                  <Grid item xs={6} sm={3} key={status}>
                    <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                      <Chip 
                        label={status.replace('_', ' ')}
                        color={getDetectionStatusColor(status)}
                        size="small"
                      />
                      <Typography variant="h6" sx={{ mt: 0.5 }}>{count}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Detections List */}
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Detection</TableCell>
                    <TableCell>IOC</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockDetections.map((detection) => (
                    <TableRow key={detection.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {detection.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Host: {detection.hostname} ({detection.sourceIP})
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {detection.iocValue}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {detection.source}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={detection.severity}
                          color={getSeverityColor(detection.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={detection.status}
                          color={getDetectionStatusColor(detection.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatTimeAgo(detection.detectionTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button size="small">Investigate</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Intelligence Feeds Tab */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Threat Intelligence Feeds</Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Intelligence feeds automatically update IOCs and provide enrichment data for threat hunting activities.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CloudSync color="success" />
                        <Typography variant="h6">MISP Feed</Typography>
                        <Chip label="ACTIVE" color="success" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Malware Information Sharing Platform - Community threat intelligence
                      </Typography>
                      <Typography variant="caption" display="block">
                        Last Update: 1 hour ago
                      </Typography>
                      <Typography variant="caption" display="block">
                        IOCs Imported: 1,247 (today)
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }}>Configure</Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CloudSync color="success" />
                        <Typography variant="h6">AlienVault OTX</Typography>
                        <Chip label="ACTIVE" color="success" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Open Threat Exchange - Collaborative threat intelligence platform
                      </Typography>
                      <Typography variant="caption" display="block">
                        Last Update: 2 hours ago
                      </Typography>
                      <Typography variant="caption" display="block">
                        IOCs Imported: 892 (today)
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }}>Configure</Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CloudSync color="warning" />
                        <Typography variant="h6">VirusTotal</Typography>
                        <Chip label="RATE LIMITED" color="warning" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        VirusTotal Intelligence - File and URL analysis data
                      </Typography>
                      <Typography variant="caption" display="block">
                        Last Update: 6 hours ago
                      </Typography>
                      <Typography variant="caption" display="block">
                        IOCs Imported: 445 (today)
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }}>Configure</Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CloudSync color="error" />
                        <Typography variant="h6">Custom Feed</Typography>
                        <Chip label="ERROR" color="error" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Internal threat intelligence feed - Authentication failed
                      </Typography>
                      <Typography variant="caption" display="block">
                        Last Update: 24 hours ago
                      </Typography>
                      <Typography variant="caption" display="block">
                        IOCs Imported: 0 (today)
                      </Typography>
                      <Button size="small" color="error" sx={{ mt: 1 }}>Fix Configuration</Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create IOC Dialog */}
      <Dialog open={iocDialogOpen} onClose={() => setIOCDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New IOC</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>IOC Type</InputLabel>
                <Select
                  value={newIOC.type}
                  label="IOC Type"
                  onChange={(e) => setNewIOC(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="ip">IP Address</MenuItem>
                  <MenuItem value="domain">Domain</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                  <MenuItem value="file_hash">File Hash</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Threat Type</InputLabel>
                <Select
                  value={newIOC.threatType}
                  label="Threat Type"
                  onChange={(e) => setNewIOC(prev => ({ ...prev, threatType: e.target.value }))}
                >
                  <MenuItem value="malware">Malware</MenuItem>
                  <MenuItem value="phishing">Phishing</MenuItem>
                  <MenuItem value="c2">Command & Control</MenuItem>
                  <MenuItem value="exploit">Exploit</MenuItem>
                  <MenuItem value="ransomware">Ransomware</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="IOC Value"
                value={newIOC.value}
                onChange={(e) => setNewIOC(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Enter IP address, domain, hash, etc."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newIOC.description}
                onChange={(e) => setNewIOC(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the threat or context..."
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newIOC.severity}
                  label="Severity"
                  onChange={(e) => setNewIOC(prev => ({ ...prev, severity: e.target.value }))}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>TLP</InputLabel>
                <Select
                  value={newIOC.tlp}
                  label="TLP"
                  onChange={(e) => setNewIOC(prev => ({ ...prev, tlp: e.target.value }))}
                >
                  <MenuItem value="WHITE">TLP:WHITE</MenuItem>
                  <MenuItem value="GREEN">TLP:GREEN</MenuItem>
                  <MenuItem value="AMBER">TLP:AMBER</MenuItem>
                  <MenuItem value="RED">TLP:RED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Confidence"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={newIOC.confidence}
                onChange={(e) => setNewIOC(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIOCDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateIOC} variant="contained">Add IOC</Button>
        </DialogActions>
      </Dialog>

      {/* Create Hunt Dialog */}
      <Dialog open={huntDialogOpen} onClose={() => setHuntDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Threat Hunt</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hunt Name"
                value={newHunt.name}
                onChange={(e) => setNewHunt(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newHunt.description}
                onChange={(e) => setNewHunt(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hypothesis"
                multiline
                rows={2}
                value={newHunt.hypothesis}
                onChange={(e) => setNewHunt(prev => ({ ...prev, hypothesis: e.target.value }))}
                placeholder="What are you looking for and why?"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Hunt Type</InputLabel>
                <Select
                  value={newHunt.huntType}
                  label="Hunt Type"
                  onChange={(e) => setNewHunt(prev => ({ ...prev, huntType: e.target.value }))}
                >
                  <MenuItem value="PROACTIVE">Proactive</MenuItem>
                  <MenuItem value="REACTIVE">Reactive</MenuItem>
                  <MenuItem value="RESEARCH">Research</MenuItem>
                  <MenuItem value="VALIDATION">Validation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newHunt.priority}
                  label="Priority"
                  onChange={(e) => setNewHunt(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHuntDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateHunt} variant="contained">Create Hunt</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog (for IOCs and Hunts) */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          {selectedIOC ? `IOC Details: ${selectedIOC.value}` : 
           selectedHunt ? `Hunt Details: ${selectedHunt.name}` : 'Details'}
        </DialogTitle>
        <DialogContent>
          {selectedIOC && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Type & Value</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getIOCTypeIcon(selectedIOC.type)}
                    <Typography variant="body1" fontFamily="monospace">
                      {selectedIOC.value}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {selectedIOC.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Threat Classification</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip 
                      label={selectedIOC.severity}
                      color={getSeverityColor(selectedIOC.severity)}
                    />
                    <Chip 
                      label={selectedIOC.tlp}
                      color={getTLPColor(selectedIOC.tlp)}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2">
                    Threat Type: {selectedIOC.threatType.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Intelligence Context</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Source: {selectedIOC.source} | Confidence: {Math.round(selectedIOC.confidence * 100)}%
                  </Typography>
                  <Typography variant="body2">
                    First Seen: {new Date(selectedIOC.firstSeen).toLocaleString()} | 
                    Last Seen: {new Date(selectedIOC.lastSeen).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Tags</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedIOC.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
                {selectedIOC.attribution && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Attribution</Typography>
                    <Typography variant="body2">
                      {selectedIOC.attribution.group && `Group: ${selectedIOC.attribution.group} | `}
                      {selectedIOC.attribution.country && `Country: ${selectedIOC.attribution.country} | `}
                      Confidence: {Math.round(selectedIOC.attribution.confidence * 100)}%
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          
          {selectedHunt && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedHunt.description}
              </Typography>
              <Typography variant="subtitle2">Hypothesis</Typography>
              <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                {selectedHunt.hypothesis}
              </Typography>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Queries ({selectedHunt.queries.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedHunt.queries.map((query) => (
                    <Card key={query.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Typography variant="subtitle1">{query.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {query.description}
                        </Typography>
                        <Paper sx={{ p: 1, bgcolor: 'grey.100', mb: 1 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {query.query}
                          </Typography>
                        </Paper>
                        <Typography variant="caption">
                          {query.queryType} • {query.dataSource} • 
                          {query.results.length > 0 && ` Results: ${query.results[0].count}`}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Findings ({selectedHunt.findings.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedHunt.findings.map((finding) => (
                    <Card key={finding.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1">{finding.title}</Typography>
                          <Chip 
                            label={finding.severity}
                            color={getSeverityColor(finding.severity)}
                            size="small"
                          />
                          <Chip 
                            label={finding.status}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2">
                          {finding.description}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Confidence: {Math.round(finding.confidence * 100)}%
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          {selectedHunt && selectedHunt.status === 'ACTIVE' && (
            <Button variant="contained">Execute Queries</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThreatHuntingDashboard;