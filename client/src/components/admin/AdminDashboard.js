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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboard;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const styles_1 = require("@mui/material/styles");
const initialUsers = [
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
const auditLog = [
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
const defaultFeatureFlags = [
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
const defaultConfigToggles = [
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
function StatusChip({ status, dataTestId }) {
    const theme = (0, styles_1.useTheme)();
    const palette = {
        Healthy: { bg: theme.palette.success.light, color: theme.palette.success.main },
        Degraded: { bg: theme.palette.warning.light, color: theme.palette.warning.main },
        Maintenance: { bg: theme.palette.info.light, color: theme.palette.info.main },
        Active: { bg: theme.palette.success.light, color: theme.palette.success.main },
        Suspended: { bg: theme.palette.error.light, color: theme.palette.error.main },
    };
    const match = palette[status] ?? {
        bg: theme.palette.grey[100],
        color: theme.palette.text.primary,
    };
    return (<material_1.Chip size="small" label={status} sx={{
            backgroundColor: match.bg,
            color: match.color,
            fontWeight: 600,
            textTransform: 'capitalize',
        }} data-testid={dataTestId}/>);
}
function SectionHeader({ icon, title, subtitle, }) {
    return (<material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      {icon}
      <material_1.Box>
        <material_1.Typography variant="h6">{title}</material_1.Typography>
        {subtitle && (<material_1.Typography variant="body2" color="text.secondary">
            {subtitle}
          </material_1.Typography>)}
      </material_1.Box>
    </material_1.Stack>);
}
function AdminDashboard() {
    const [users, setUsers] = (0, react_1.useState)(initialUsers);
    const [selectedUserIds, setSelectedUserIds] = (0, react_1.useState)([]);
    const [flags, setFlags] = (0, react_1.useState)(defaultFeatureFlags);
    const [config, setConfig] = (0, react_1.useState)(defaultConfigToggles);
    const [auditSeverity, setAuditSeverity] = (0, react_1.useState)('all');
    const [impersonatedUser, setImpersonatedUser] = (0, react_1.useState)('');
    const filteredAudit = (0, react_1.useMemo)(() => {
        if (auditSeverity === 'all')
            return auditLog;
        return auditLog.filter((entry) => entry.severity === auditSeverity);
    }, [auditSeverity]);
    const toggleUserSelection = (userId) => {
        setSelectedUserIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
    };
    const updateUserRoles = (userId, roles) => {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roles } : u)));
    };
    const updateBatchStatus = (status) => {
        setUsers((prev) => prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, status } : u)));
        setSelectedUserIds([]);
    };
    const toggleFlag = (flagKey) => {
        setFlags((prev) => prev.map((f) => (f.key === flagKey ? { ...f, enabled: !f.enabled } : f)));
    };
    const toggleConfig = (key) => {
        setConfig((prev) => prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)));
    };
    const handleImpersonate = () => {
        const target = users.find((u) => u.email === impersonatedUser);
        if (!target)
            return;
        setSelectedUserIds([target.id]);
    };
    return (<material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <material_1.Box>
          <material_1.Typography variant="h4" gutterBottom>
            Summit Admin Control Center
          </material_1.Typography>
          <material_1.Typography variant="body1" color="text.secondary">
            Manage user governance, platform safety, and operational readiness from a single view.
          </material_1.Typography>
        </material_1.Box>
        <material_1.Chip color="primary" icon={<icons_material_1.GppGood fontSize="small"/>} label="Privileged access" variant="outlined"/>
      </material_1.Box>

      <Grid_1.default container spacing={2}>
        <Grid_1.default xs={12} md={7}>
          <material_1.Card variant="outlined">
            <material_1.CardHeader title={<SectionHeader icon={<icons_material_1.ManageAccounts />} title="User management" subtitle="Roles, status, and impersonation"/>}/>
            <material_1.CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <material_1.TextField label="Impersonate by email" value={impersonatedUser} onChange={(e) => setImpersonatedUser(e.target.value)} size="small" fullWidth/>
                <material_1.Button variant="outlined" onClick={handleImpersonate} disabled={!impersonatedUser}>
                  Select user
                </material_1.Button>
                <material_1.Button variant="contained" color="warning" onClick={() => updateBatchStatus('Suspended')} disabled={!selectedUserIds.length}>
                  Suspend
                </material_1.Button>
                <material_1.Button variant="outlined" color="success" onClick={() => updateBatchStatus('Active')} disabled={!selectedUserIds.length}>
                  Reinstate
                </material_1.Button>
              </material_1.Stack>

              <material_1.Divider />

              <Grid_1.default container spacing={2}>
                {users.map((user) => (<Grid_1.default xs={12} key={user.id}>
                    <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                      <material_1.Stack direction="row" spacing={1} alignItems="center">
                        <material_1.Checkbox inputProps={{ 'aria-label': `Select ${user.name}` }} checked={selectedUserIds.includes(user.id)} onChange={() => toggleUserSelection(user.id)}/>
                        <material_1.Box>
                          <material_1.Typography variant="subtitle1">{user.name}</material_1.Typography>
                          <material_1.Typography variant="body2" color="text.secondary">
                            {user.email}
                          </material_1.Typography>
                        </material_1.Box>
                      </material_1.Stack>

                      <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                        <material_1.FormControl size="small" sx={{ minWidth: 220 }}>
                          <material_1.InputLabel id={`roles-${user.id}`}>Roles for {user.name}</material_1.InputLabel>
                          <material_1.Select labelId={`roles-${user.id}`} multiple value={user.roles} label={`Roles for ${user.name}`} onChange={(e) => updateUserRoles(user.id, typeof e.target.value === 'string'
                ? e.target.value.split(',')
                : e.target.value)}>
                            {['Administrator', 'Analyst', 'Support', 'Viewer'].map((role) => (<material_1.MenuItem key={role} value={role}>
                                {role}
                              </material_1.MenuItem>))}
                          </material_1.Select>
                        </material_1.FormControl>
                        <material_1.Stack direction="row" spacing={1} flexWrap="wrap" sx={{ maxWidth: 220 }}>
                          {user.roles.map((role) => (<material_1.Chip key={role} size="small" label={role}/>))}
                        </material_1.Stack>
                        <StatusChip status={user.status} dataTestId={`status-${user.id}`}/>
                        <material_1.Typography variant="body2" color="text.secondary">
                          Last active {user.lastActive}
                        </material_1.Typography>
                      </material_1.Stack>
                    </material_1.Stack>
                  </Grid_1.default>))}
              </Grid_1.default>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        <Grid_1.default xs={12} md={5}>
          <material_1.Card variant="outlined" sx={{ height: '100%' }}>
            <material_1.CardHeader title={<SectionHeader icon={<icons_material_1.SettingsApplications />} title="Platform configuration" subtitle="Feature flags and guardrails"/>}/>
            <material_1.CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <material_1.Typography variant="subtitle2">Feature flags</material_1.Typography>
              <material_1.Stack divider={<material_1.Divider flexItem/>} spacing={1}>
                {flags.map((flag) => (<material_1.Stack key={flag.key} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <material_1.Box>
                      <material_1.Typography fontWeight={600}>{flag.label}</material_1.Typography>
                      {flag.description && (<material_1.Typography variant="body2" color="text.secondary">
                          {flag.description}
                        </material_1.Typography>)}
                    </material_1.Box>
                    <material_1.Switch inputProps={{ 'aria-label': `Feature flag: ${flag.label}` }} checked={flag.enabled} onChange={() => toggleFlag(flag.key)}/>
                  </material_1.Stack>))}
              </material_1.Stack>

              <material_1.Divider sx={{ my: 1 }}/>

              <material_1.Typography variant="subtitle2">Configuration toggles</material_1.Typography>
              <material_1.Stack divider={<material_1.Divider flexItem/>} spacing={1}>
                {config.map((item) => (<material_1.Stack key={item.key} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <material_1.Box>
                      <material_1.Typography fontWeight={600}>{item.label}</material_1.Typography>
                      {item.description && (<material_1.Typography variant="body2" color="text.secondary">
                          {item.description}
                        </material_1.Typography>)}
                    </material_1.Box>
                    <material_1.Switch inputProps={{ 'aria-label': `Config toggle: ${item.label}` }} checked={item.enabled} onChange={() => toggleConfig(item.key)}/>
                  </material_1.Stack>))}
              </material_1.Stack>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>

      <Grid_1.default container spacing={2}>
        <Grid_1.default xs={12} md={6}>
          <material_1.Card variant="outlined">
            <material_1.CardHeader title={<SectionHeader icon={<icons_material_1.Assessment />} title="Audit log" subtitle="Filter by severity"/>}/>
            <material_1.CardContent>
              <material_1.FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
                <material_1.InputLabel id="audit-severity">Severity</material_1.InputLabel>
                <material_1.Select labelId="audit-severity" value={auditSeverity} label="Severity" onChange={(e) => setAuditSeverity(e.target.value)}>
                  <material_1.MenuItem value="all">All</material_1.MenuItem>
                  <material_1.MenuItem value="info">Info</material_1.MenuItem>
                  <material_1.MenuItem value="warning">Warning</material_1.MenuItem>
                  <material_1.MenuItem value="security">Security</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>

              <material_1.Stack spacing={1} divider={<material_1.Divider flexItem/>}>
                {filteredAudit.map((entry) => (<material_1.Box key={entry.id}>
                    <material_1.Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <StatusChip status={entry.severity}/>
                      <material_1.Typography fontWeight={600}>{entry.action}</material_1.Typography>
                    </material_1.Stack>
                    <material_1.Typography variant="body2" color="text.secondary">
                      {entry.actor} • {new Date(entry.timestamp).toLocaleString()}
                    </material_1.Typography>
                  </material_1.Box>))}
              </material_1.Stack>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        <Grid_1.default xs={12} md={6}>
          <material_1.Card variant="outlined">
            <material_1.CardHeader title={<SectionHeader icon={<icons_material_1.AutoGraph />} title="Usage & licensing" subtitle="Resource posture and entitlements"/>}/>
            <material_1.CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid_1.default container spacing={1}>
                {resourceUsage.map((item) => (<Grid_1.default xs={12} sm={6} key={item.name}>
                    <material_1.Card variant="outlined">
                      <material_1.CardContent>
                        <material_1.Typography variant="subtitle1">{item.name}</material_1.Typography>
                        <material_1.Typography variant="body2" color="text.secondary">
                          CPU {item.cpu}% · Memory {item.memory}% · I/O {item.io}%
                        </material_1.Typography>
                      </material_1.CardContent>
                    </material_1.Card>
                  </Grid_1.default>))}
              </Grid_1.default>

              <material_1.Divider />

              <material_1.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <material_1.Box sx={{ flexGrow: 1 }}>
                  <material_1.Typography variant="subtitle1">{licenseDetails.plan} license</material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    {licenseDetails.seatsUsed}/{licenseDetails.seatsTotal} seats in use · Expires {licenseDetails.expiresOn}
                  </material_1.Typography>
                  <material_1.Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {licenseDetails.compliance.map((item) => (<material_1.Chip key={item} size="small" label={item}/>))}
                  </material_1.Stack>
                </material_1.Box>
                <material_1.Button variant="outlined" color="primary">
                  Manage license
                </material_1.Button>
              </material_1.Stack>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>

      <material_1.Card variant="outlined">
        <material_1.CardHeader title={<SectionHeader icon={<icons_material_1.AdminPanelSettings />} title="System health" subtitle="Signals from core services"/>}/>
        <material_1.CardContent>
          <Grid_1.default container spacing={2}>
            {serviceHealth.map((svc) => (<Grid_1.default xs={12} sm={6} md={3} key={svc.name}>
                <material_1.Card variant="outlined">
                  <material_1.CardContent>
                    <material_1.Stack spacing={0.5}>
                      <material_1.Stack direction="row" spacing={1} alignItems="center">
                        <icons_material_1.CloudDone fontSize="small" color="action"/>
                        <material_1.Typography fontWeight={600}>{svc.name}</material_1.Typography>
                      </material_1.Stack>
                      <StatusChip status={svc.status}/>
                      <material_1.Typography variant="body2" color="text.secondary">
                        Latency {svc.latency}
                      </material_1.Typography>
                      <material_1.Typography variant="body2" color="text.secondary">
                        Uptime {svc.uptime}
                      </material_1.Typography>
                    </material_1.Stack>
                  </material_1.CardContent>
                </material_1.Card>
              </Grid_1.default>))}
          </Grid_1.default>
          <material_1.Alert icon={<icons_material_1.Storage fontSize="small"/>} // reusing icon to avoid extra imports
     severity="info" sx={{ mt: 2 }}>
            Capture anomalies early: schedule a quarterly disaster recovery exercise and verify backups.
          </material_1.Alert>
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Box>);
}
