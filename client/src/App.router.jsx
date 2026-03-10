import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  LinearProgress,
  Divider,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Search,
  Timeline,
  Psychology,
  Map,
  Assessment,
  Settings,
  RocketLaunch,
  PendingActions,
  MilitaryTech,
  Notifications,
  Extension,
  Cable,
  Key,
  VerifiedUser,
  Science,
  Security,
  Assignment as AssignmentIcon,
  ChevronLeft,
  ChevronRight,
  Person,
  AccountTree,
  Hub,
  Fingerprint,
  Gavel,
  Shield,
  AutoAwesome,
  ExitToApp,
  AdminPanelSettings,
  BarChart,
  Policy,
} from '@mui/icons-material';
import { getIntelGraphTheme } from './theme/intelgraphTheme';
import { store } from './store';
import { apolloClient } from './services/apollo';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import LoginPage from './components/auth/LoginPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import RouteAnnouncer from './components/a11y/RouteAnnouncer';
import { useFeatureFlag, FeatureFlagProvider } from './hooks/useFeatureFlag';
import { getGraphqlHttpUrl } from './config/urls';

// ── Lazy-loaded heavy components ───────────────────────────────────────────
const InteractiveGraphExplorer = React.lazy(() =>
  import('./components/graph/InteractiveGraphExplorer')
);
const IntelligentCopilot = React.lazy(() =>
  import('./components/ai/IntelligentCopilot')
);
const LiveCollaborationPanel = React.lazy(() =>
  import('./components/collaboration/LiveCollaborationPanel')
);
const InvestigationTimeline = React.lazy(() =>
  import('./components/timeline/InvestigationTimeline')
);
const ThreatAssessmentEngine = React.lazy(() =>
  import('./components/threat/ThreatAssessmentEngine')
);
const OsintFeedConfig = React.lazy(() =>
  import('./components/admin/OSINTFeedConfig')
);
const ExecutiveDashboard = React.lazy(() =>
  import('./features/wargame/ExecutiveDashboard')
);
const AccessIntelPage = React.lazy(() =>
  import('./features/rbac/AccessIntelPage.jsx')
);
const DisclosurePackagerPage = React.lazy(() =>
  import('./pages/DisclosurePackagerPage')
);
const OrchestratorDashboard = React.lazy(() =>
  import('./features/orchestrator/OrchestratorDashboard')
);
const AdminDashboard = React.lazy(() =>
  import('./components/admin/AdminDashboard')
);
const ApprovalsPage = React.lazy(() =>
  import('./switchboard/approvals/ApprovalsExperience')
);
const PartnerConsolePage = React.lazy(() =>
  import('./pages/partner-console/PartnerConsolePage')
);
const AlertingPage = React.lazy(() =>
  import('./pages/AlertingPage')
);
const InstalledPlugins = React.lazy(() =>
  import('./pages/Plugins/InstalledPlugins')
);
const IntegrationCatalog = React.lazy(() =>
  import('./pages/Integrations/IntegrationCatalog')
);
const SecurityDashboard = React.lazy(() =>
  import('./pages/Security/SecurityDashboard')
);
const ComplianceCenter = React.lazy(() =>
  import('./pages/Compliance/ComplianceCenter')
);
const SandboxDashboard = React.lazy(() =>
  import('./pages/Sandbox/SandboxDashboard')
);
const ReleaseReadinessRoute = React.lazy(() =>
  import('./routes/ReleaseReadinessRoute')
);
const IOCList = React.lazy(() => import('./pages/IOC/IOCList'));
const IOCDetail = React.lazy(() => import('./pages/IOC/IOCDetail'));
const NewInvestigation = React.lazy(() =>
  import('./pages/Investigations/NewInvestigation')
);
const HuntList = React.lazy(() => import('./pages/Hunting/HuntList'));
const HuntDetail = React.lazy(() => import('./pages/Hunting/HuntDetail'));
const SearchHome = React.lazy(() => import('./pages/Search/SearchHome'));
const SearchResultDetail = React.lazy(() =>
  import('./pages/Search/SearchResultDetail')
);
const DemoWalkthrough = React.lazy(() => import('./pages/DemoWalkthrough'));

// ── Demo mode ──────────────────────────────────────────────────────────────
import DemoIndicator from './components/common/DemoIndicator';

// ── Role constants ─────────────────────────────────────────────────────────
const ADMIN = 'ADMIN';
const APPROVER_ROLES = [ADMIN, 'SECURITY_ADMIN', 'OPERATIONS', 'SAFETY'];

// ── Navigation structure ───────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { path: '/dashboard',    label: 'Dashboard',   icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
      { path: '/search',       label: 'Search',      icon: <Search sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/hunts',           label: 'Threat Hunts',   icon: <Shield sx={{ fontSize: 18 }} /> },
      { path: '/ioc',             label: 'Indicators',     icon: <Fingerprint sx={{ fontSize: 18 }} /> },
      { path: '/investigations',  label: 'Investigations', icon: <Gavel sx={{ fontSize: 18 }} /> },
      { path: '/graph',           label: 'IntelGraph',     icon: <Hub sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { path: '/copilot',      label: 'AI Copilot',      icon: <AutoAwesome sx={{ fontSize: 18 }} /> },
      { path: '/orchestrator', label: 'Orchestrator',    icon: <AccountTree sx={{ fontSize: 18 }} /> },
      { path: '/threats',      label: 'Threat Analysis', icon: <Security sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { path: '/disclosures',    label: 'Disclosures',    icon: <Policy sx={{ fontSize: 18 }} /> },
      { path: '/access-intel',   label: 'Access Intel',   icon: <Key sx={{ fontSize: 18 }} /> },
      { path: '/geoint',         label: 'GeoInt',         icon: <Map sx={{ fontSize: 18 }} /> },
      { path: '/reports',        label: 'Reports',        icon: <BarChart sx={{ fontSize: 18 }} /> },
      { path: '/approvals',      label: 'Approvals',      icon: <PendingActions sx={{ fontSize: 18 }} />, roles: APPROVER_ROLES },
    ],
  },
  {
    label: 'Administration',
    roles: [ADMIN],
    items: [
      { path: '/system',            label: 'System',          icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, roles: [ADMIN] },
      { path: '/partner-console',   label: 'Partners',        icon: <Hub sx={{ fontSize: 18 }} />,               roles: [ADMIN] },
      { path: '/alerting',          label: 'Alerting',        icon: <Notifications sx={{ fontSize: 18 }} />,     roles: [ADMIN] },
      { path: '/plugins',           label: 'Plugins',         icon: <Extension sx={{ fontSize: 18 }} />,         roles: [ADMIN] },
      { path: '/integrations',      label: 'Integrations',    icon: <Cable sx={{ fontSize: 18 }} />,             roles: [ADMIN] },
      { path: '/security',          label: 'Security',        icon: <VerifiedUser sx={{ fontSize: 18 }} />,      roles: [ADMIN] },
      { path: '/compliance',        label: 'Compliance',      icon: <AssignmentIcon sx={{ fontSize: 18 }} />,    roles: [ADMIN] },
      { path: '/sandbox',           label: 'Sandbox',         icon: <Science sx={{ fontSize: 18 }} />,           roles: [ADMIN] },
      { path: '/admin/osint-feeds', label: 'OSINT Feeds',     icon: <Assessment sx={{ fontSize: 18 }} />,        roles: [ADMIN] },
      { path: '/wargame-dashboard', label: 'WarGame',         icon: <MilitaryTech sx={{ fontSize: 18 }} />,      roles: [ADMIN] },
      { path: '/ops/release-readiness', label: 'Release Readiness', icon: <AssignmentIcon sx={{ fontSize: 18 }} />, roles: [ADMIN, 'OPERATOR'], featureFlag: 'release-readiness-dashboard' },
    ],
  },
];

// Legacy flat list kept for RouteAnnouncer
const navigationItems = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ path: i.path, label: i.label, icon: i.icon }))
);

// ── Sidebar ────────────────────────────────────────────────────────────────
function PremiumSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const { getFlagValue } = useFeatureFlag();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const isVisible = (item) => {
    if (item.roles && !item.roles.some((r) => hasRole(r))) return false;
    if (item.permissions && !item.permissions.some((p) => hasPermission(p))) return false;
    if (item.featureFlag && !getFlagValue(item.featureFlag, false)) return false;
    return true;
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const sidebarBg    = '#090D16';
  const borderColor  = 'rgba(255,255,255,0.07)';
  const textPrimary  = '#E8EEF7';
  const textSecondary= '#8B9EC4';
  const textMuted    = '#546483';
  const activeColor  = '#3D7EFF';
  const activeBg     = 'rgba(61,126,255,0.12)';
  const hoverBg      = 'rgba(255,255,255,0.05)';

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        width:       collapsed ? 52 : 220,
        flexShrink:  0,
        bgcolor:     sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        display:     'flex',
        flexDirection: 'column',
        height:      '100%',
        transition:  'width 200ms cubic-bezier(0.4,0,0.2,1)',
        overflow:    'hidden',
        zIndex:      1,
      }}
    >
      {/* Wordmark */}
      <Box
        sx={{
          height:      48,
          display:     'flex',
          alignItems:  'center',
          px:          collapsed ? 1.5 : 2,
          gap:         1.5,
          borderBottom: `1px solid ${borderColor}`,
          flexShrink:  0,
          overflow:    'hidden',
        }}
      >
        <Box
          sx={{
            width:        28,
            height:       28,
            bgcolor:      '#3D7EFF',
            borderRadius: '7px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            flexShrink:   0,
          }}
        >
          <Box
            sx={{
              width:  14,
              height: 14,
              bgcolor: 'rgba(255,255,255,0.9)',
              borderRadius: '3px',
              transform: 'rotate(45deg)',
            }}
          />
        </Box>
        {!collapsed && (
          <Typography
            sx={{
              fontWeight:    700,
              fontSize:      '15px',
              color:         textPrimary,
              letterSpacing: '-0.01em',
              whiteSpace:    'nowrap',
            }}
          >
            Summit
          </Typography>
        )}
      </Box>

      {/* Nav groups */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <Box key={gi} sx={{ mb: 0.5 }}>
              {!collapsed && group.label && (
                <Typography
                  sx={{
                    px:            2,
                    pt:            1.5,
                    pb:            0.5,
                    fontSize:      '10px',
                    fontWeight:    600,
                    color:         textMuted,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    whiteSpace:    'nowrap',
                  }}
                >
                  {group.label}
                </Typography>
              )}

              {visibleItems.map((item) => {
                const active = isActive(item.path);
                const navItem = (
                  <Box
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      display:     'flex',
                      alignItems:  'center',
                      gap:         1.25,
                      mx:          0.75,
                      px:          1.25,
                      py:          0.875,
                      borderRadius: '7px',
                      cursor:      'pointer',
                      color:       active ? activeColor : textSecondary,
                      bgcolor:     active ? activeBg : 'transparent',
                      transition:  'all 130ms ease',
                      '&:hover': {
                        bgcolor: active ? activeBg : hoverBg,
                        color:   active ? activeColor : textPrimary,
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${activeColor}`,
                        outlineOffset: '1px',
                      },
                      overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ flexShrink: 0, display: 'flex', opacity: active ? 1 : 0.75 }}>
                      {item.icon}
                    </Box>
                    {!collapsed && (
                      <Typography
                        sx={{
                          fontSize:   '13px',
                          fontWeight: active ? 600 : 400,
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          overflow:   'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.label}
                      </Typography>
                    )}
                  </Box>
                );

                return collapsed ? (
                  <Tooltip key={item.path} title={item.label} placement="right">
                    {navItem}
                  </Tooltip>
                ) : navItem;
              })}
            </Box>
          );
        })}
      </Box>

      {/* Bottom bar: user + collapse */}
      <Box
        sx={{
          borderTop:  `1px solid ${borderColor}`,
          p:          0.75,
          flexShrink: 0,
          display:    'flex',
          flexDirection: 'column',
          gap:        0.5,
        }}
      >
        {/* User button */}
        <Box
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{
            display:     'flex',
            alignItems:  'center',
            gap:         1.25,
            px:          1.25,
            py:          0.875,
            borderRadius: '7px',
            cursor:      'pointer',
            color:       textSecondary,
            '&:hover':   { bgcolor: hoverBg, color: textPrimary },
            overflow:    'hidden',
          }}
        >
          <Box
            sx={{
              width:        26,
              height:       26,
              bgcolor:      'rgba(61,126,255,0.15)',
              borderRadius: '6px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              flexShrink:   0,
              border:       '1px solid rgba(61,126,255,0.2)',
            }}
          >
            <Person sx={{ fontSize: 14, color: activeColor }} />
          </Box>
          {!collapsed && (
            <Typography sx={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Account
            </Typography>
          )}
        </Box>

        {/* Collapse toggle */}
        <Box
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          sx={{
            display:       'flex',
            alignItems:    'center',
            justifyContent: 'center',
            py:            0.625,
            borderRadius:  '7px',
            cursor:        'pointer',
            color:         textMuted,
            '&:hover':     { bgcolor: hoverBg, color: textSecondary },
          }}
        >
          {collapsed
            ? <ChevronRight sx={{ fontSize: 18 }} />
            : <ChevronLeft  sx={{ fontSize: 18 }} />
          }
        </Box>
      </Box>

      {/* User menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon><Person sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon><Settings sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon><ExitToApp sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Sign out" />
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ── Top bar ────────────────────────────────────────────────────────────────
function TopBar() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [backendOk, setBackendOk]     = useState(null); // null=checking, true, false

  const currentLabel = useMemo(() => {
    const flat = NAV_GROUPS.flatMap((g) => g.items);
    return flat.find((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))?.label ?? 'Dashboard';
  }, [location.pathname]);

  // Silent backend check — no alert banner, just a status dot
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(getGraphqlHttpUrl(), {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ query: '{ __typename }' }),
        });
        setBackendOk(res.ok);
      } catch {
        setBackendOk(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const showDemo =
    import.meta.env.VITE_DEMO_MODE === '1' ||
    import.meta.env.VITE_DEMO_MODE === 'true';

  const dotColor =
    backendOk === null  ? '#546483' :
    backendOk           ? '#22C55E' :
                          '#EF4444';
  const dotLabel =
    backendOk === null  ? 'Connecting…' :
    backendOk           ? 'Operational'  :
                          'Backend offline';

  return (
    <Box
      component="header"
      sx={{
        height:      48,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        bgcolor:      '#090D16',
        display:      'flex',
        alignItems:   'center',
        px:           2.5,
        gap:          2,
        flexShrink:   0,
      }}
    >
      <Typography
        sx={{
          fontSize:   '13px',
          fontWeight: 600,
          color:      '#8B9EC4',
          userSelect: 'none',
        }}
      >
        {currentLabel}
      </Typography>

      <Box sx={{ flex: 1 }} />

      {showDemo && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate('/demo')}
          sx={{ fontSize: '11px', py: 0.5, px: 1.5, borderRadius: '6px' }}
        >
          Demo
        </Button>
      )}

      {/* Backend status indicator */}
      <Tooltip title={dotLabel} placement="bottom">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'default' }}>
          <Box
            sx={{
              width:        7,
              height:       7,
              borderRadius: '50%',
              bgcolor:      dotColor,
              boxShadow:    backendOk ? `0 0 0 2px ${dotColor}33` : 'none',
              transition:   'all 300ms ease',
            }}
          />
          <Typography sx={{ fontSize: '11px', color: '#546483' }}>
            {dotLabel}
          </Typography>
        </Box>
      </Tooltip>

      {/* Notifications */}
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={(e) => setNotifAnchor(e.currentTarget)}
          sx={{ color: '#546483', '&:hover': { color: '#8B9EC4', bgcolor: 'rgba(255,255,255,0.05)' } }}
        >
          <Badge
            badgeContent={3}
            sx={{ '& .MuiBadge-badge': { bgcolor: '#EF4444', color: '#fff', fontSize: '10px' } }}
          >
            <Notifications sx={{ fontSize: 17 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Notification panel */}
      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxHeight: 420 } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#E8EEF7' }}>
            Notifications
          </Typography>
        </Box>
        {[
          { label: 'High-risk IOC detected', sub: 'APT29 C2 infrastructure identified', time: '5 min ago', level: 'error' },
          { label: 'Hunt completed with findings', sub: 'Suspicious PowerShell activity', time: '12 min ago', level: 'warning' },
          { label: 'Investigation assigned', sub: 'Financial fraud case #INV-2025-089', time: '1 hr ago', level: 'info' },
        ].map((n, i) => (
          <MenuItem key={i} sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.25 }}>
            <Box
              sx={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                bgcolor:      n.level === 'error' ? '#EF4444' : n.level === 'warning' ? '#F59E0B' : '#3D7EFF',
                flexShrink:   0,
                mt:           0.625,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#C8D4EC', lineHeight: 1.3 }}>
                {n.label}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#546483', mt: 0.25 }}>
                {n.sub}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '10px', color: '#546483', flexShrink: 0, mt: 0.25 }}>
              {n.time}
            </Typography>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setNotifAnchor(null)} sx={{ justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '12px', color: '#3D7EFF' }}>View all</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    investigations: 3,
    graphNodes:     247,
    reports:        12,
    systemLoad:     67,
    activeUsers:    8,
    alerts:         2,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        systemLoad:  Math.max(20, Math.min(95, prev.systemLoad + (Math.random() - 0.5) * 10)),
        activeUsers: Math.max(1,  Math.min(20, prev.activeUsers + Math.floor((Math.random() - 0.5) * 3))),
        graphNodes:  prev.graphNodes + Math.floor(Math.random() * 3),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      label:  'Active Investigations',
      value:  metrics.investigations,
      delta:  '+2 this week',
      status: 'neutral',
    },
    {
      label:  'Graph Entities',
      value:  metrics.graphNodes.toLocaleString(),
      delta:  'Live',
      status: 'live',
    },
    {
      label:  'Reports Generated',
      value:  metrics.reports,
      delta:  'Last 30 days',
      status: 'neutral',
    },
    {
      label:  'Active Alerts',
      value:  metrics.alerts,
      delta:  metrics.alerts > 0 ? 'Requires review' : 'All clear',
      status: metrics.alerts > 0 ? 'warn' : 'ok',
    },
  ];

  const valueColor = (status) => {
    if (status === 'live') return '#00C9A7';
    if (status === 'warn') return '#F59E0B';
    return '#E8EEF7';
  };

  const cardSx = {
    p:          '20px',
    bgcolor:    '#111A2E',
    border:     '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px',
    height:     '100%',
    transition: 'border-color 150ms ease',
    '&:hover':  { borderColor: 'rgba(61,126,255,0.28)' },
  };

  const sectionLabel = {
    fontSize:      '10.5px',
    fontWeight:    600,
    color:         '#546483',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#E8EEF7', letterSpacing: '-0.01em', mb: 0.5 }}>
          Command Center
        </Typography>
        <Typography sx={{ fontSize: '12px', color: '#546483' }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </Typography>
      </Box>

      {/* Metric strip */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {statCards.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Box sx={cardSx}>
              <Typography sx={{ ...sectionLabel, mb: 1.75 }}>{s.label}</Typography>
              <Typography
                sx={{
                  fontSize:          '34px',
                  fontWeight:        700,
                  color:             valueColor(s.status),
                  lineHeight:        1,
                  mb:                0.75,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.value}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {s.status === 'live' && (
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    bgcolor: '#00C9A7',
                    boxShadow: '0 0 0 3px rgba(0,201,167,0.15)',
                    animation: 'pulse 2s infinite',
                  }} />
                )}
                <Typography sx={{ fontSize: '11.5px', color: '#546483' }}>{s.delta}</Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Main grid */}
      <Grid container spacing={2}>
        {/* System status */}
        <Grid item xs={12} md={6}>
          <Box sx={cardSx}>
            <Typography sx={{ ...sectionLabel, mb: 2.5 }}>System Status</Typography>

            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '13px', color: '#C8D4EC' }}>Platform Load</Typography>
                <Typography
                  sx={{
                    fontSize:          '13px',
                    fontWeight:        700,
                    fontVariantNumeric: 'tabular-nums',
                    color: metrics.systemLoad > 80 ? '#EF4444' :
                           metrics.systemLoad > 60 ? '#F59E0B' : '#22C55E',
                  }}
                >
                  {Math.round(metrics.systemLoad)}%
                </Typography>
              </Box>
              <Box sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <Box
                  sx={{
                    height:      '100%',
                    width:       `${metrics.systemLoad}%`,
                    bgcolor:     metrics.systemLoad > 80 ? '#EF4444' :
                                 metrics.systemLoad > 60 ? '#F59E0B' : '#22C55E',
                    borderRadius: 2,
                    transition:  'width 500ms ease, background-color 300ms ease',
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {[
                { label: 'Active Operators', value: metrics.activeUsers, color: '#E8EEF7' },
                { label: 'Avg Response',     value: '125 ms',            color: '#00C9A7' },
              ].map((m) => (
                <Box key={m.label}>
                  <Typography sx={{ ...sectionLabel, mb: 0.5 }}>{m.label}</Typography>
                  <Typography
                    sx={{ fontSize: '26px', fontWeight: 700, color: m.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                  >
                    {m.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                mt: 2.5, pt: 2,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 1,
              }}
            >
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: '#22C55E',
                boxShadow: '0 0 0 3px rgba(34,197,94,0.15)',
              }} />
              <Typography sx={{ fontSize: '12px', color: '#8B9EC4' }}>All systems operational</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Quick actions + activity */}
        <Grid item xs={12} md={6}>
          <Box sx={cardSx}>
            <Typography sx={{ ...sectionLabel, mb: 2.5 }}>Quick Actions</Typography>

            <Grid container spacing={1.25} sx={{ mb: 2.5 }}>
              {[
                { label: 'New Investigation', path: '/investigations/new' },
                { label: 'IntelGraph',         path: '/graph' },
                { label: 'AI Copilot',          path: '/copilot' },
                { label: 'Threat Analysis',     path: '/threats' },
              ].map((a) => (
                <Grid item xs={6} key={a.label}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate(a.path)}
                    sx={{
                      py:           1.125,
                      borderColor:  'rgba(255,255,255,0.1)',
                      color:        '#C8D4EC',
                      fontSize:     '12.5px',
                      fontWeight:   500,
                      borderRadius: '8px',
                      '&:hover': {
                        borderColor: '#3D7EFF',
                        color:       '#3D7EFF',
                        bgcolor:     'rgba(61,126,255,0.06)',
                      },
                    }}
                  >
                    {a.label}
                  </Button>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', pt: 2 }}>
              <Typography sx={{ ...sectionLabel, mb: 1.5 }}>Recent Activity</Typography>
              {[
                { text: 'Investigation "Project Alpha" updated', time: '2 min ago' },
                { text: 'AI detected new pattern in Case #47',   time: '8 min ago' },
                { text: 'Weekly intelligence report generated',  time: '1 hr ago' },
              ].map((a, i) => (
                <Box
                  key={i}
                  sx={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'flex-start',
                    mb:             1,
                    gap:            2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1 }}>
                    <Box
                      sx={{
                        width:        5,
                        height:       5,
                        borderRadius: '50%',
                        bgcolor:      '#3D7EFF',
                        flexShrink:   0,
                        mt:           '5px',
                      }}
                    />
                    <Typography sx={{ fontSize: '12px', color: '#8B9EC4', lineHeight: 1.4 }}>
                      {a.text}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '10.5px', color: '#546483', flexShrink: 0, mt: 0.125 }}>
                    {a.time}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Live collaboration */}
        <Grid item xs={12} md={4}>
          <React.Suspense
            fallback={
              <Box sx={{ ...cardSx, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                <LinearProgress sx={{ width: '60%' }} />
              </Box>
            }
          >
            <LiveCollaborationPanel />
          </React.Suspense>
        </Grid>

        {/* Platform components */}
        <Grid item xs={12} md={8}>
          <Box sx={cardSx}>
            <Typography sx={{ ...sectionLabel, mb: 2 }}>Platform Components</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['React Router', 'Material-UI', 'Apollo GraphQL', 'Redux', 'Graph Engine', 'AI Copilot'].map((c) => (
                <Box
                  key={c}
                  sx={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          0.75,
                    px:           1.5,
                    py:           0.625,
                    borderRadius: '6px',
                    bgcolor:      'rgba(34,197,94,0.08)',
                    border:       '1px solid rgba(34,197,94,0.18)',
                  }}
                >
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22C55E' }} />
                  <Typography sx={{ fontSize: '11.5px', color: '#8B9EC4' }}>{c}</Typography>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                mt:  2,
                pt:  1.75,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display:   'flex',
                alignItems: 'center',
                gap:        1,
              }}
            >
              <Box sx={{
                width: 7, height: 7, borderRadius: '50%',
                bgcolor: '#22C55E', flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(34,197,94,0.2)',
              }} />
              <Typography sx={{ fontSize: '12px', color: '#8B9EC4' }}>
                Real-time collaboration active — team members can coordinate investigations live
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Page wrappers ──────────────────────────────────────────────────────────
function InvestigationsPage() {
  return (
    <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}>
      <ErrorBoundary componentName="InvestigationTimeline">
        <InvestigationTimeline />
      </ErrorBoundary>
    </Container>
  );
}

function GraphExplorerPage() {
  return (
    <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}>
      <ErrorBoundary componentName="InteractiveGraphExplorer">
        <InteractiveGraphExplorer />
      </ErrorBoundary>
    </Container>
  );
}

function CopilotPage() {
  return (
    <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}>
      <ErrorBoundary componentName="IntelligentCopilot">
        <IntelligentCopilot />
      </ErrorBoundary>
    </Container>
  );
}

function ThreatsPage() {
  return (
    <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}>
      <ThreatAssessmentEngine />
    </Container>
  );
}

function OrchestratorPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <OrchestratorDashboard />
    </Container>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100%',
        gap:            2,
        p:              4,
        textAlign:      'center',
      }}
    >
      <Typography
        sx={{ fontSize: '72px', fontWeight: 700, color: 'rgba(255,255,255,0.06)', lineHeight: 1 }}
      >
        404
      </Typography>
      <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#E8EEF7' }}>
        Page not found
      </Typography>
      <Typography sx={{ fontSize: '13px', color: '#546483', maxWidth: 340 }}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 1 }}>
        Go to Dashboard
      </Button>
    </Box>
  );
}

// ── Suspense fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <Box sx={{ width: '100%', pt: 2, px: 3 }}>
      <LinearProgress sx={{ borderRadius: 2 }} />
    </Box>
  );
}

// ── Main layout ────────────────────────────────────────────────────────────
function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainRef = useRef(null);
  const a11yGuardrailsEnabled = useFeatureFlag('ui.a11yGuardrails');

  const routeLabels = useMemo(
    () =>
      navigationItems.reduce(
        (acc, item) => { acc[item.path] = item.label; return acc; },
        { '/': 'Home', '/login': 'Login' },
      ),
    [],
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Skip-nav */}
      <a
        href="#main-content"
        className="sr-only"
        style={{ textDecoration: 'none' }}
      >
        Skip to main content
      </a>

      {/* Persistent sidebar */}
      <PremiumSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Right column: topbar + content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <TopBar />

        <Box
          component="main"
          id="main-content"
          role="main"
          tabIndex={a11yGuardrailsEnabled ? -1 : undefined}
          ref={mainRef}
          data-testid="primary-content"
          sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', bgcolor: '#0C1220' }}
        >
          <RouteAnnouncer mainRef={mainRef} routeLabels={routeLabels} />
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/"             element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"    element={<DashboardPage />} />
                <Route path="/search"       element={<SearchHome />} />
                <Route path="/search/results/:id" element={<SearchResultDetail />} />
                <Route path="/hunts"        element={<HuntList />} />
                <Route path="/hunts/:id"    element={<HuntDetail />} />
                <Route path="/ioc"          element={<IOCList />} />
                <Route path="/ioc/:id"      element={<IOCDetail />} />
                <Route path="/investigations"     element={<InvestigationsPage />} />
                <Route path="/investigations/new" element={<NewInvestigation />} />
                <Route path="/graph"        element={<GraphExplorerPage />} />
                <Route path="/copilot"      element={<CopilotPage />} />
                <Route path="/orchestrator" element={<OrchestratorPage />} />
                <Route path="/threats"      element={<ThreatsPage />} />
                <Route path="/disclosures"  element={<DisclosurePackagerPage />} />
                <Route path="/access-intel" element={<AccessIntelPage />} />
                <Route path="/geoint"       element={<InvestigationsPage />} />
                <Route path="/reports"      element={<InvestigationsPage />} />
                <Route path="/demo"         element={<DemoWalkthrough />} />

                <Route element={<ProtectedRoute roles={[ADMIN]} />}>
                  <Route path="/partner-console" element={<PartnerConsolePage />} />
                </Route>
                <Route element={<ProtectedRoute roles={APPROVER_ROLES} />}>
                  <Route path="/approvals" element={<ApprovalsPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                  <Route path="/system"              element={<AdminDashboard />} />
                  <Route path="/admin/osint-feeds"   element={<OsintFeedConfig />} />
                  <Route path="/wargame-dashboard"   element={<ExecutiveDashboard />} />
                  <Route path="/alerting"            element={<AlertingPage />} />
                  <Route path="/plugins"             element={<InstalledPlugins />} />
                  <Route path="/integrations"        element={<IntegrationCatalog />} />
                  <Route path="/security"            element={<SecurityDashboard />} />
                  <Route path="/compliance"          element={<ComplianceCenter />} />
                  <Route path="/sandbox"             element={<SandboxDashboard />} />
                  <Route path="/ops/release-readiness" element={<ReleaseReadinessRoute />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </React.Suspense>
        </Box>
      </Box>
    </Box>
  );
}

// ── Themed shell ───────────────────────────────────────────────────────────
function ThemedAppShell({ children }) {
  const mode  = useSelector((state) => state.ui?.theme ?? 'dark');
  const theme = useMemo(() => getIntelGraphTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

// ── Root app ───────────────────────────────────────────────────────────────
function App() {
  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <FeatureFlagProvider>
            <DemoIndicator />
            <ThemedAppShell>
              <Router>
                <MainLayout />
              </Router>
            </ThemedAppShell>
          </FeatureFlagProvider>
        </AuthProvider>
      </ApolloProvider>
    </Provider>
  );
}

export default App;
