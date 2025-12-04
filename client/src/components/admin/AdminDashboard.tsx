import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  Assessment,
  AutoGraph,
  CloudDone,
  GppGood,
  ManageAccounts,
  SettingsApplications,
  Storage,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

type UserRecord = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'Active' | 'Suspended';
  lastActive: string;
};

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  severity: 'info' | 'warning' | 'security';
  timestamp: string;
};

type FeatureFlag = { key: string; label: string; description?: string; enabled: boolean };

type ConfigToggle = { key: string; label: string; description?: string; enabled: boolean };

const initialUsers: UserRecord[] = [
  {
    id: 'user-1',
    name: 'Alice Carter',
    email: 'alice.carter@summit.gov',
    roles: ['Administrator', 'Analyst'],
    status: 'Active',
    lastActive: '5m ago',
  },
  {
    id: 'user-2',
    name: 'Marcus Lee',
    email: 'marcus.lee@summit.gov',
    roles: ['Support'],
    status: 'Active',
    lastActive: '14m ago',
  },
  {
    id: 'user-3',
    name: 'Priya Desai',
    email: 'priya.desai@summit.gov',
    roles: ['Viewer'],
    status: 'Suspended',
    lastActive: '2d ago',
  },
];

const auditLog: AuditEntry[] = [
  {
    id: 'audit-1',
    actor: 'alice.carter',
    action: 'Updated feature flag rollout',
    severity: 'info',
    timestamp: '2026-02-05T12:30:00Z',
  },
  {
    id: 'audit-2',
    actor: 'system',
    action: 'Weekly backup completed',
    severity: 'info',
    timestamp: '2026-02-05T11:45:00Z',
  },
  {
    id: 'audit-3',
    actor: 'marcus.lee',
    action: 'Privilege escalation blocked',
    severity: 'security',
    timestamp: '2026-02-05T10:12:00Z',
  },
  {
    id: 'audit-4',
    actor: 'automation',
    action: 'Configuration baseline drift detected',
    severity: 'warning',
    timestamp: '2026-02-05T09:45:00Z',
  },
];

const defaultFeatureFlags: FeatureFlag[] = [
  {
    key: 'copilot-insights',
    label: 'Copilot Insights',
    description: 'Enables analyst copilots with investigation summaries.',
    enabled: true,
  },
  {
    key: 'graph-heuristics',
    label: 'Advanced graph heuristics',
    description: 'Experimental path ranking and clustering.',
    enabled: false,
  },
  {
    key: 'safe-mode',
    label: 'Safety guardrails',
    description: 'Extra validation before executing orchestrations.',
    enabled: true,
  },
];

const defaultConfigToggles: ConfigToggle[] = [
  {
    key: 'alerts',
    label: 'Critical alerting',
    description: 'Delivery of sev0 notifications to duty officers.',
    enabled: true,
  },
  {
    key: 'geoip',
    label: 'GeoIP enrichment',
    description: 'IP intelligence appended to inbound events.',
    enabled: true,
  },
  {
    key: 'device-trust',
    label: 'Device trust validation',
    description: 'Block untrusted devices from privileged actions.',
    enabled: false,
  },
];

const serviceHealth = [
  { name: 'API Gateway', status: 'Healthy', latency: '142ms', uptime: '99.99%' },
  { name: 'Graph Engine', status: 'Degraded', latency: '610ms', uptime: '99.1%' },
  { name: 'Event Bus', status: 'Healthy', latency: '89ms', uptime: '100%' },
  { name: 'Ingestion', status: 'Maintenance', latency: '—', uptime: 'n/a' },
];

const resourceUsage = [
  { name: 'Application', cpu: 68, memory: 72, io: 38 },
  { name: 'Database', cpu: 44, memory: 81, io: 55 },
  { name: 'Analytics', cpu: 57, memory: 64, io: 41 },
];

const licenseDetails = {
  plan: 'Enterprise',
  seatsUsed: 148,
  seatsTotal: 200,
  expiresOn: '2027-01-01',
  compliance: ['SOC 2', 'FedRAMP Ready'],
};

function StatusChip({ status, dataTestId }: { status: string; dataTestId?: string }) {
  const theme = useTheme();
  const palette = {
    Healthy: { bg: theme.palette.success.light, color: theme.palette.success.main },
    Degraded: { bg: theme.palette.warning.light, color: theme.palette.warning.main },
    Maintenance: { bg: theme.palette.info.light, color: theme.palette.info.main },
    Active: { bg: theme.palette.success.light, color: theme.palette.success.main },
    Suspended: { bg: theme.palette.error.light, color: theme.palette.error.main },
  } as const;
  const match = palette[status as keyof typeof palette] ?? {
    bg: theme.palette.grey[100],
    color: theme.palette.text.primary,
  };

  return (
    <Chip
      size="small"
      label={status}
      sx={{
        backgroundColor: match.bg,
        color: match.color,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
      data-testid={dataTestId}
    />
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      {icon}
      <Box>
        <Typography variant="h6">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>(defaultFeatureFlags);
  const [config, setConfig] = useState<ConfigToggle[]>(defaultConfigToggles);
  const [auditSeverity, setAuditSeverity] = useState<'all' | AuditEntry['severity']>('all');
  const [impersonatedUser, setImpersonatedUser] = useState('');

  const filteredAudit = useMemo(() => {
    if (auditSeverity === 'all') return auditLog;
    return auditLog.filter((entry) => entry.severity === auditSeverity);
  }, [auditSeverity]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const updateUserRoles = (userId: string, roles: string[]) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roles } : u)));
  };

  const updateBatchStatus = (status: UserRecord['status']) => {
    setUsers((prev) =>
      prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, status } : u)),
    );
    setSelectedUserIds([]);
  };

  const toggleFlag = (flagKey: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.key === flagKey ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const toggleConfig = (key: string) => {
    setConfig((prev) =>
      prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)),
    );
  };

  const handleImpersonate = () => {
    const target = users.find((u) => u.email === impersonatedUser);
    if (!target) return;
    setSelectedUserIds([target.id]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Summit Admin Control Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user governance, platform safety, and operational readiness from a single view.
          </Typography>
        </Box>
        <Chip
          color="primary"
          icon={<GppGood fontSize="small" />}
          label="Privileged access"
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardHeader
              title={<SectionHeader icon={<ManageAccounts />} title="User management" subtitle="Roles, status, and impersonation" />}
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <TextField
                  label="Impersonate by email"
                  value={impersonatedUser}
                  onChange={(e) => setImpersonatedUser(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button variant="outlined" onClick={handleImpersonate} disabled={!impersonatedUser}>
                  Select user
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => updateBatchStatus('Suspended')}
                  disabled={!selectedUserIds.length}
                >
                  Suspend
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => updateBatchStatus('Active')}
                  disabled={!selectedUserIds.length}
                >
                  Reinstate
                </Button>
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                {users.map((user) => (
                  <Grid item xs={12} key={user.id}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Checkbox
                          inputProps={{ 'aria-label': `Select ${user.name}` }}
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                        />
                        <Box>
                          <Typography variant="subtitle1">{user.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                          <InputLabel id={`roles-${user.id}`}>Roles for {user.name}</InputLabel>
                          <Select
                            labelId={`roles-${user.id}`}
                            multiple
                            value={user.roles}
                            label={`Roles for ${user.name}`}
                            onChange={(e) =>
                              updateUserRoles(
                                user.id,
                                typeof e.target.value === 'string'
                                  ? e.target.value.split(',')
                                  : (e.target.value as string[]),
                              )
                            }
                          >
                            {['Administrator', 'Analyst', 'Support', 'Viewer'].map((role) => (
                              <MenuItem key={role} value={role}>
                                {role}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ maxWidth: 220 }}>
                          {user.roles.map((role) => (
                            <Chip key={role} size="small" label={role} />
                          ))}
                        </Stack>
                        <StatusChip status={user.status} dataTestId={`status-${user.id}`} />
                        <Typography variant="body2" color="text.secondary">
                          Last active {user.lastActive}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader
              title={<SectionHeader icon={<SettingsApplications />} title="Platform configuration" subtitle="Feature flags and guardrails" />}
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2">Feature flags</Typography>
              <Stack divider={<Divider flexItem />} spacing={1}>
                {flags.map((flag) => (
                  <Stack
                    key={flag.key}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography fontWeight={600}>{flag.label}</Typography>
                      {flag.description && (
                        <Typography variant="body2" color="text.secondary">
                          {flag.description}
                        </Typography>
                      )}
                    </Box>
                    <Switch
                      inputProps={{ 'aria-label': `Feature flag: ${flag.label}` }}
                      checked={flag.enabled}
                      onChange={() => toggleFlag(flag.key)}
                    />
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2">Configuration toggles</Typography>
              <Stack divider={<Divider flexItem />} spacing={1}>
                {config.map((item) => (
                  <Stack
                    key={item.key}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography fontWeight={600}>{item.label}</Typography>
                      {item.description && (
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                    <Switch
                      inputProps={{ 'aria-label': `Config toggle: ${item.label}` }}
                      checked={item.enabled}
                      onChange={() => toggleConfig(item.key)}
                    />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader
              title={<SectionHeader icon={<Assessment />} title="Audit log" subtitle="Filter by severity" />}
            />
            <CardContent>
              <FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
                <InputLabel id="audit-severity">Severity</InputLabel>
                <Select
                  labelId="audit-severity"
                  value={auditSeverity}
                  label="Severity"
                  onChange={(e) => setAuditSeverity(e.target.value as typeof auditSeverity)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                </Select>
              </FormControl>

              <Stack spacing={1} divider={<Divider flexItem />}>
                {filteredAudit.map((entry) => (
                  <Box key={entry.id}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <StatusChip status={entry.severity} />
                      <Typography fontWeight={600}>{entry.action}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {entry.actor} • {new Date(entry.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader
              title={<SectionHeader icon={<AutoGraph />} title="Usage & licensing" subtitle="Resource posture and entitlements" />}
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={1}>
                {resourceUsage.map((item) => (
                  <Grid item xs={12} sm={6} key={item.name}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          CPU {item.cpu}% · Memory {item.memory}% · I/O {item.io}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Divider />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1">{licenseDetails.plan} license</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {licenseDetails.seatsUsed}/{licenseDetails.seatsTotal} seats in use · Expires {licenseDetails.expiresOn}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {licenseDetails.compliance.map((item) => (
                      <Chip key={item} size="small" label={item} />
                    ))}
                  </Stack>
                </Box>
                <Button variant="outlined" color="primary">
                  Manage license
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardHeader
          title={<SectionHeader icon={<AdminPanelSettings />} title="System health" subtitle="Signals from core services" />}
        />
        <CardContent>
          <Grid container spacing={2}>
            {serviceHealth.map((svc) => (
              <Grid item xs={12} sm={6} md={3} key={svc.name}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CloudDone fontSize="small" color="action" />
                        <Typography fontWeight={600}>{svc.name}</Typography>
                      </Stack>
                      <StatusChip status={svc.status} />
                      <Typography variant="body2" color="text.secondary">
                        Latency {svc.latency}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Uptime {svc.uptime}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Alert
            icon={<Storage fontSize="small" />} // reusing icon to avoid extra imports
            severity="info"
            sx={{ mt: 2 }}
          >
            Capture anomalies early: schedule a quarterly disaster recovery exercise and verify backups.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
