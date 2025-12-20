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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Security,
  Warning,
  CheckCircle,
  Person,
  Lock,
  Shield,
  Visibility,
  Settings,
  Assessment,
  Timeline,
  Computer,
  PhoneIphone,
  LocationOn,
  AccessTime,
  ExpandMore,
  Add,
  Edit,
  Delete,
  VpnLock,
  Fingerprint,
  Key,
  History,
  Analytics,
  AdminPanelSettings,
  Groups,
  PersonAdd,
  LockOpen,
} from '@mui/icons-material';

// Mock data for demonstration (in real app this would come from GraphQL)
const mockSecurityStats = {
  users: {
    total: 45,
    active: 38,
    locked: 2,
    mfaEnabled: 25,
  },
  sessions: {
    active: 52,
    total: 847,
  },
  events: {
    recent: 234,
    byType: {
      LOGIN_SUCCESS: 156,
      LOGIN_FAILED: 23,
      PERMISSION_DENIED: 8,
      SUSPICIOUS_ACTIVITY: 3,
      MFA_ENABLED: 12,
      ADMIN_ACTION: 32,
    },
    byRisk: {
      LOW: 187,
      MEDIUM: 34,
      HIGH: 11,
      CRITICAL: 2,
    },
  },
  audit: {
    total: 15847,
    recent: 342,
  },
};

const mockSecurityEvents = [
  {
    id: 'sec-1',
    eventType: 'SUSPICIOUS_ACTIVITY',
    userId: 'user-123',
    riskLevel: 'HIGH',
    description: 'Multiple failed login attempts from unknown IP',
    timestamp: '2025-08-26T17:30:00Z',
    ipAddress: '192.168.1.100',
    resolved: false,
    metadata: { attempts: 7, country: 'Unknown' },
  },
  {
    id: 'sec-2',
    eventType: 'LOGIN_SUCCESS',
    userId: 'user-456',
    riskLevel: 'MEDIUM',
    description: 'Login from new device type',
    timestamp: '2025-08-26T17:25:00Z',
    ipAddress: '10.0.0.45',
    resolved: true,
    metadata: { newDevice: true, deviceType: 'TABLET' },
  },
  {
    id: 'sec-3',
    eventType: 'ADMIN_ACTION',
    userId: 'user-admin',
    riskLevel: 'LOW',
    description: 'User permissions updated',
    timestamp: '2025-08-26T17:20:00Z',
    ipAddress: '10.0.0.10',
    resolved: true,
    metadata: { targetUser: 'user-789', action: 'permissions_updated' },
  },
  {
    id: 'sec-4',
    eventType: 'MFA_ENABLED',
    userId: 'user-789',
    riskLevel: 'LOW',
    description: 'Multi-factor authentication enabled',
    timestamp: '2025-08-26T17:15:00Z',
    ipAddress: '10.0.0.25',
    resolved: true,
    metadata: { method: 'TOTP' },
  },
  {
    id: 'sec-5',
    eventType: 'PERMISSION_DENIED',
    userId: 'user-555',
    riskLevel: 'MEDIUM',
    description: 'Access denied to classified investigation',
    timestamp: '2025-08-26T17:10:00Z',
    ipAddress: '10.0.0.67',
    resolved: false,
    metadata: {
      resource: 'investigation-secret-001',
      clearanceRequired: 'SECRET',
    },
  },
];

const mockUsers = [
  {
    id: 'user-admin',
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@intelgraph.com',
    role: 'ADMIN',
    securityClearance: 'TOP_SECRET',
    isActive: true,
    mfaEnabled: true,
    lastLogin: '2025-08-26T17:30:00Z',
    failedLoginAttempts: 0,
    department: 'IT Security',
  },
  {
    id: 'user-analyst1',
    username: 'sarah.jones',
    fullName: 'Sarah Jones',
    email: 'sarah.jones@intelgraph.com',
    role: 'SECURITY_ANALYST',
    securityClearance: 'SECRET',
    isActive: true,
    mfaEnabled: true,
    lastLogin: '2025-08-26T17:25:00Z',
    failedLoginAttempts: 0,
    department: 'Threat Intelligence',
  },
  {
    id: 'user-analyst2',
    username: 'mike.chen',
    fullName: 'Mike Chen',
    email: 'mike.chen@intelgraph.com',
    role: 'ANALYST',
    securityClearance: 'CONFIDENTIAL',
    isActive: true,
    mfaEnabled: false,
    lastLogin: '2025-08-26T16:45:00Z',
    failedLoginAttempts: 1,
    department: 'Cyber Operations',
  },
  {
    id: 'user-locked',
    username: 'temp.user',
    fullName: 'Temporary User',
    email: 'temp.user@intelgraph.com',
    role: 'VIEWER',
    securityClearance: 'INTERNAL',
    isActive: false,
    mfaEnabled: false,
    lastLogin: '2025-08-26T14:30:00Z',
    failedLoginAttempts: 5,
    department: 'External Partners',
    lockedUntil: '2025-08-26T18:30:00Z',
  },
];

const SecurityDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'ANALYST',
    securityClearance: 'CONFIDENTIAL',
    department: '',
    mfaEnabled: false,
  });

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateUser = () => {
    console.log('Creating user:', newUser);
    setUserDialogOpen(false);
    setNewUser({
      username: '',
      fullName: '',
      email: '',
      role: 'ANALYST',
      securityClearance: 'CONFIDENTIAL',
      department: '',
      mfaEnabled: false,
    });
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
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

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <AdminPanelSettings color="error" />;
      case 'SECURITY_ANALYST':
        return <Shield color="warning" />;
      case 'SENIOR_ANALYST':
        return <Assessment color="info" />;
      case 'ANALYST':
        return <Person color="primary" />;
      case 'VIEWER':
        return <Visibility color="action" />;
      default:
        return <Person />;
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle color="success" />;
      case 'LOGIN_FAILED':
        return <Warning color="error" />;
      case 'SUSPICIOUS_ACTIVITY':
        return <Warning color="error" />;
      case 'PERMISSION_DENIED':
        return <Lock color="warning" />;
      case 'MFA_ENABLED':
        return <VpnLock color="success" />;
      case 'ADMIN_ACTION':
        return <Settings color="info" />;
      default:
        return <Security />;
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

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Security color="primary" />
            🛡️ Advanced Security & Access Control
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive security monitoring, user management, and access
            control dashboard
          </Typography>

          {/* Security Overview Statistics */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">Active Users</Typography>
                <Typography variant="h6" color="primary">
                  {mockSecurityStats.users.active}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of {mockSecurityStats.users.total}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">Active Sessions</Typography>
                <Typography variant="h6" color="success.main">
                  {mockSecurityStats.sessions.active}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  live connections
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">High Risk Events</Typography>
                <Typography variant="h6" color="warning.main">
                  {mockSecurityStats.events.byRisk.HIGH +
                    mockSecurityStats.events.byRisk.CRITICAL}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  need attention
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption">MFA Adoption</Typography>
                <Typography variant="h6" color="info.main">
                  {Math.round(
                    (mockSecurityStats.users.mfaEnabled /
                      mockSecurityStats.users.total) *
                      100,
                  )}
                  %
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  users protected
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setUserDialogOpen(true)}
            >
              Add User
            </Button>
            <Button variant="outlined" startIcon={<Shield />}>
              Security Scan
            </Button>
            <Button variant="outlined" startIcon={<Assessment />}>
              Generate Report
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab
              label="Security Events"
              icon={
                <Badge
                  badgeContent={
                    mockSecurityEvents.filter((e) => !e.resolved).length
                  }
                  color="error"
                >
                  <Warning />
                </Badge>
              }
            />
            <Tab
              label="User Management"
              icon={
                <Badge badgeContent={mockUsers.length} color="primary">
                  <Groups />
                </Badge>
              }
            />
            <Tab
              label="Access Control"
              icon={
                <Badge
                  badgeContent={mockSecurityStats.users.locked}
                  color="warning"
                >
                  <Lock />
                </Badge>
              }
            />
            <Tab
              label="Audit Logs"
              icon={
                <Badge badgeContent="99+" color="info">
                  <History />
                </Badge>
              }
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Security Events Tab */}
          {currentTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Recent Security Events
              </Typography>

              {/* Risk Level Summary */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {Object.entries(mockSecurityStats.events.byRisk).map(
                  ([level, count]) => (
                    <Grid item xs={6} sm={3} key={level}>
                      <Paper sx={{ p: 1, textAlign: 'center' }}>
                        <Chip
                          label={level}
                          color={getRiskColor(level)}
                          size="small"
                        />
                        <Typography variant="h6">{count}</Typography>
                      </Paper>
                    </Grid>
                  ),
                )}
              </Grid>

              {/* Events List */}
              <List>
                {mockSecurityEvents.map((event) => (
                  <ListItem
                    key={event.id}
                    divider
                    sx={{
                      bgcolor: event.resolved ? 'inherit' : 'action.hover',
                      borderLeft: event.resolved
                        ? 'none'
                        : `4px solid ${
                            event.riskLevel === 'CRITICAL'
                              ? 'error.main'
                              : event.riskLevel === 'HIGH'
                                ? 'warning.main'
                                : 'info.main'
                          }`,
                    }}
                  >
                    <ListItemIcon>{getEventIcon(event.eventType)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Typography variant="subtitle1">
                            {event.description}
                          </Typography>
                          <Chip
                            label={event.riskLevel}
                            color={getRiskColor(event.riskLevel)}
                            size="small"
                          />
                          {!event.resolved && (
                            <Chip
                              label="UNRESOLVED"
                              color="error"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            IP: {event.ipAddress} •{' '}
                            {formatTimeAgo(event.timestamp)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Event Type: {event.eventType.replace(/_/g, ' ')}
                          </Typography>
                        </Box>
                      }
                    />
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedEvent(event);
                        setEventDialogOpen(true);
                      }}
                    >
                      Details
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* User Management Tab */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                User Management
              </Typography>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Clearance</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>MFA</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          {getRoleIcon(user.role)}
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {user.fullName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {user.username} • {user.department}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.securityClearance}
                          color={
                            user.securityClearance === 'TOP_SECRET'
                              ? 'error'
                              : user.securityClearance === 'SECRET'
                                ? 'warning'
                                : user.securityClearance === 'CONFIDENTIAL'
                                  ? 'info'
                                  : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Chip
                            label={user.isActive ? 'ACTIVE' : 'LOCKED'}
                            color={user.isActive ? 'success' : 'error'}
                            size="small"
                          />
                          {user.failedLoginAttempts > 0 && (
                            <Chip
                              label={`${user.failedLoginAttempts} failures`}
                              color="warning"
                              size="small"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.mfaEnabled ? 'ENABLED' : 'DISABLED'}
                          color={user.mfaEnabled ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatTimeAgo(user.lastLogin)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<Edit />}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Access Control Tab */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Access Control Policies
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <LocationOn />
                        <Typography variant="h6">
                          Location Restrictions
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Configure geographic access controls
                      </Alert>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Allowed Countries"
                            secondary="United States, Canada, United Kingdom"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Blocked Countries"
                            secondary="None currently configured"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="VPN Required"
                            secondary="For external access: Enabled"
                          />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <AccessTime />
                        <Typography variant="h6">Time Restrictions</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Configure time-based access controls
                      </Alert>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Business Hours"
                            secondary="Monday-Friday: 06:00-22:00 EST"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Weekend Access"
                            secondary="Saturday-Sunday: 08:00-20:00 EST"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Emergency Override"
                            secondary="Available for ADMIN and SECURITY_ANALYST roles"
                          />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Computer />
                        <Typography variant="h6">Device Controls</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Manage approved devices and device types
                      </Alert>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Allowed Devices"
                            secondary="Desktop, Laptop, Tablet (managed devices only)"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Mobile Access"
                            secondary="Restricted to approved mobile devices"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Device Registration"
                            secondary="Required for all new devices"
                          />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Shield />
                        <Typography variant="h6">
                          Classification Controls
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Security clearance levels and data access controls
                      </Alert>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Clearance Level</TableCell>
                            <TableCell>Users</TableCell>
                            <TableCell>Data Access</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>TOP SECRET</TableCell>
                            <TableCell>3 users</TableCell>
                            <TableCell>All classified data</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>SECRET</TableCell>
                            <TableCell>8 users</TableCell>
                            <TableCell>SECRET and below</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>CONFIDENTIAL</TableCell>
                            <TableCell>22 users</TableCell>
                            <TableCell>CONFIDENTIAL and below</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>INTERNAL</TableCell>
                            <TableCell>12 users</TableCell>
                            <TableCell>Internal data only</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Audit Logs Tab */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Audit Trail
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">
                      Total Audit Events
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {mockSecurityStats.audit.total.toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">
                      Recent Events (24h)
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {mockSecurityStats.audit.recent}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">Failed Actions</Typography>
                    <Typography variant="h6" color="error.main">
                      47
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">Admin Actions</Typography>
                    <Typography variant="h6" color="warning.main">
                      156
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mb: 2 }}>
                Audit logs are automatically retained for 7 years for compliance
                purposes. All user actions, data access, and system changes are
                logged.
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                Recent Audit Events
              </Typography>
              <List>
                <ListItem divider>
                  <ListItemIcon>
                    <Key />
                  </ListItemIcon>
                  <ListItemText
                    primary="API key created for integration service"
                    secondary="admin • 2025-08-26 17:30:00 • IP: 10.0.0.10 • SUCCESS"
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  <ListItemText
                    primary="Investigation INV-001 evidence updated"
                    secondary="sarah.jones • 2025-08-26 17:25:00 • IP: 10.0.0.45 • SUCCESS"
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemIcon>
                    <Analytics />
                  </ListItemIcon>
                  <ListItemText
                    primary="ML analysis executed on dataset DS-456"
                    secondary="mike.chen • 2025-08-26 17:20:00 • IP: 10.0.0.67 • SUCCESS"
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemIcon>
                    <Warning />
                  </ListItemIcon>
                  <ListItemText
                    primary="Access denied to classified investigation"
                    secondary="temp.user • 2025-08-26 17:15:00 • IP: 192.168.1.100 • FAILED"
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, username: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={newUser.fullName}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, fullName: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={newUser.department}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newUser.role}
                  label="Role"
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <MenuItem value="VIEWER">Viewer</MenuItem>
                  <MenuItem value="ANALYST">Analyst</MenuItem>
                  <MenuItem value="SENIOR_ANALYST">Senior Analyst</MenuItem>
                  <MenuItem value="SECURITY_ANALYST">Security Analyst</MenuItem>
                  <MenuItem value="ADMIN">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Security Clearance</InputLabel>
                <Select
                  value={newUser.securityClearance}
                  label="Security Clearance"
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      securityClearance: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="PUBLIC">Public</MenuItem>
                  <MenuItem value="INTERNAL">Internal</MenuItem>
                  <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                  <MenuItem value="SECRET">Secret</MenuItem>
                  <MenuItem value="TOP_SECRET">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newUser.mfaEnabled}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        mfaEnabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Require Multi-Factor Authentication"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Security Event Details</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Event Type</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedEvent.eventType.replace(/_/g, ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Risk Level</Typography>
                  <Chip
                    label={selectedEvent.riskLevel}
                    color={getRiskColor(selectedEvent.riskLevel)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedEvent.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">IP Address</Typography>
                  <Typography variant="body1">
                    {selectedEvent.ipAddress}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Timestamp</Typography>
                  <Typography variant="body1">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">
                    Additional Details
                  </Typography>
                  <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
                    <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Close</Button>
          {selectedEvent && !selectedEvent.resolved && (
            <Button variant="contained" color="success">
              Mark Resolved
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityDashboard;
