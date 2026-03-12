import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { ApolloProvider, useQuery, gql } from '@apollo/client';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Divider,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Paper,
  LinearProgress,
  Skeleton,
  Chip,
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
  ListItemIcon,
  ListItemText,
  BookmarkBorder,
  Article,
  AccountBalanceWallet,
  Schema,
  Lightbulb,
  BugReport,
  RadioButtonChecked,
  FlashOn,
  Storage,
  Circle,
  Terminal,
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
import { GET_SERVER_STATS, GET_HEALTH, GET_INVESTIGATIONS } from './graphql/serverStats.gql.js';
import { DETECT_ANOMALIES } from './graphql/ai.gql.js';
import { GlobalCommandPalette } from './features/commandPalette/GlobalCommandPalette';

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
const AlertingPage = React.lazy(() => import('./pages/AlertingPage'));
const InstalledPlugins = React.lazy(() => import('./pages/Plugins/InstalledPlugins'));
const IntegrationCatalog = React.lazy(() => import('./pages/Integrations/IntegrationCatalog'));
const SecurityDashboard = React.lazy(() => import('./pages/Security/SecurityDashboard'));
const ComplianceCenter = React.lazy(() => import('./pages/Compliance/ComplianceCenter'));
const SandboxDashboard = React.lazy(() => import('./pages/Sandbox/SandboxDashboard'));
const ReleaseReadinessRoute = React.lazy(() => import('./routes/ReleaseReadinessRoute'));
const IOCList = React.lazy(() => import('./pages/IOC/IOCList'));
const IOCDetail = React.lazy(() => import('./pages/IOC/IOCDetail'));
const NewInvestigation = React.lazy(() => import('./pages/Investigations/NewInvestigation'));
const HuntList = React.lazy(() => import('./pages/Hunting/HuntList'));
const HuntDetail = React.lazy(() => import('./pages/Hunting/HuntDetail'));
const SearchHome = React.lazy(() => import('./pages/Search/SearchHome'));
const SearchResultDetail = React.lazy(() => import('./pages/Search/SearchResultDetail'));
const DemoWalkthrough = React.lazy(() => import('./pages/DemoWalkthrough'));

// ── Newly surfaced features (lazy-loaded) ─────────────────────────────────
const BriefStudio = React.lazy(() =>
  import('./features/briefstudio/BriefStudio')
);
const WatchlistManager = React.lazy(() =>
  import('./features/watchlists/WatchlistManager')
);
const WorkflowEditor = React.lazy(() =>
  import('./features/workflows/WorkflowEditor')
);
const OsintStudio = React.lazy(() =>
  import('./features/osint/OsintStudio')
);
const MaestroApp = React.lazy(() =>
  import('./features/maestro/MaestroApp').then((m) => ({ default: m.MaestroApp }))
);
const LinkAnalysisCanvas = React.lazy(() =>
  import('./features/link-analysis/LinkAnalysisCanvas').then((m) => ({
    default: m.LinkAnalysisCanvas,
  }))
);

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
      { path: '/dashboard',   label: 'Dashboard',  icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
      { path: '/search',      label: 'Search',     icon: <Search sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/hunts',          label: 'Threat Hunts',   icon: <Shield       sx={{ fontSize: 18 }} /> },
      { path: '/ioc',            label: 'Indicators',     icon: <Fingerprint  sx={{ fontSize: 18 }} /> },
      { path: '/investigations', label: 'Investigations', icon: <Gavel        sx={{ fontSize: 18 }} /> },
      { path: '/graph',          label: 'IntelGraph',     icon: <Hub          sx={{ fontSize: 18 }} /> },
      { path: '/link-analysis',  label: 'Link Analysis',  icon: <Schema       sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { path: '/copilot',      label: 'AI Copilot',      icon: <AutoAwesome   sx={{ fontSize: 18 }} /> },
      { path: '/orchestrator', label: 'Orchestrator',    icon: <AccountTree   sx={{ fontSize: 18 }} /> },
      { path: '/maestro',      label: 'Maestro',         icon: <Terminal      sx={{ fontSize: 18 }} /> },
      { path: '/threats',      label: 'Threat Analysis', icon: <Security      sx={{ fontSize: 18 }} /> },
      { path: '/osint',        label: 'OSINT Studio',    icon: <RadioButtonChecked sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { path: '/briefstudio', label: 'Brief Studio',  icon: <Article        sx={{ fontSize: 18 }} /> },
      { path: '/watchlists',  label: 'Watchlists',    icon: <BookmarkBorder sx={{ fontSize: 18 }} /> },
      { path: '/workflows',   label: 'Workflows',     icon: <FlashOn        sx={{ fontSize: 18 }} /> },
      { path: '/reports',     label: 'Reports',       icon: <BarChart       sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { path: '/disclosures',  label: 'Disclosures',    icon: <Policy         sx={{ fontSize: 18 }} /> },
      { path: '/access-intel', label: 'Access Intel',   icon: <Key            sx={{ fontSize: 18 }} /> },
      { path: '/geoint',       label: 'GeoInt',         icon: <Map            sx={{ fontSize: 18 }} /> },
      { path: '/approvals',    label: 'Approvals',      icon: <PendingActions sx={{ fontSize: 18 }} />, roles: APPROVER_ROLES },
    ],
  },
  {
    label: 'Administration',
    roles: [ADMIN],
    items: [
      { path: '/system',                label: 'System',            icon: <AdminPanelSettings sx={{ fontSize: 18 }} />, roles: [ADMIN] },
      { path: '/partner-console',       label: 'Partners',          icon: <AccountBalanceWallet sx={{ fontSize: 18 }} />, roles: [ADMIN] },
      { path: '/alerting',              label: 'Alerting',          icon: <Notifications sx={{ fontSize: 18 }} />,      roles: [ADMIN] },
      { path: '/plugins',               label: 'Plugins',           icon: <Extension    sx={{ fontSize: 18 }} />,       roles: [ADMIN] },
      { path: '/integrations',          label: 'Integrations',      icon: <Cable        sx={{ fontSize: 18 }} />,       roles: [ADMIN] },
      { path: '/security',              label: 'Security',          icon: <VerifiedUser sx={{ fontSize: 18 }} />,       roles: [ADMIN] },
      { path: '/compliance',            label: 'Compliance',        icon: <AssignmentIcon sx={{ fontSize: 18 }} />,     roles: [ADMIN] },
      { path: '/sandbox',               label: 'Sandbox',           icon: <Science      sx={{ fontSize: 18 }} />,       roles: [ADMIN] },
      { path: '/admin/osint-feeds',     label: 'OSINT Feeds',       icon: <Assessment   sx={{ fontSize: 18 }} />,       roles: [ADMIN] },
      { path: '/wargame-dashboard',     label: 'WarGame',           icon: <MilitaryTech sx={{ fontSize: 18 }} />,       roles: [ADMIN] },
      { path: '/ops/release-readiness', label: 'Release Readiness', icon: <AssignmentIcon sx={{ fontSize: 18 }} />,    roles: [ADMIN, 'OPERATOR'], featureFlag: 'release-readiness-dashboard' },
    ],
  },
];

// Flat list for RouteAnnouncer + misc lookups
const navigationItems = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ path: i.path, label: i.label, icon: i.icon }))
);

// ── Dashboard GraphQL ──────────────────────────────────────────────────────
const DASHBOARD_ACTIVITY_QUERY = gql`
  query DashboardActivity($limit: Int) {
    activities(limit: $limit) {
      id
      actionType
      resourceType
      resourceId
      actorId
      timestamp
    }
  }
`;

// ── Formatting helpers ─────────────────────────────────────────────────────
function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
}

const ACTION_STYLES = {
  create:  { color: '#22C55E', label: 'Created' },
  update:  { color: '#3D7EFF', label: 'Updated' },
  delete:  { color: '#EF4444', label: 'Deleted' },
  execute: { color: '#F59E0B', label: 'Executed' },
  analyze: { color: '#A78BFA', label: 'Analyzed' },
  access:  { color: '#8B9EC4', label: 'Accessed' },
};

const STATUS_STYLES = {
  ACTIVE:   { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  OPEN:     { color: '#3D7EFF', bg: 'rgba(61,126,255,0.1)' },
  CLOSED:   { color: '#546483', bg: 'rgba(84,100,131,0.12)' },
  PENDING:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  ARCHIVED: { color: '#546483', bg: 'rgba(84,100,131,0.12)' },
};

// ── Sidebar ────────────────────────────────────────────────────────────────
function PremiumSidebar({ collapsed, onToggle, onOpenCommandPalette }) {
  const location  = useLocation();
  const navigate  = useNavigate();
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

  const C = {
    bg:           '#090D16',
    border:       'rgba(255,255,255,0.07)',
    textPrimary:  '#E8EEF7',
    textSecondary:'#8B9EC4',
    textMuted:    '#546483',
    primary:      '#3D7EFF',
    activeBg:     'rgba(61,126,255,0.12)',
    hoverBg:      'rgba(255,255,255,0.05)',
  };

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        width:        collapsed ? 52 : 220,
        flexShrink:   0,
        bgcolor:      C.bg,
        borderRight:  `1px solid ${C.border}`,
        display:      'flex',
        flexDirection:'column',
        height:       '100%',
        transition:   'width 200ms cubic-bezier(0.4,0,0.2,1)',
        overflow:     'hidden',
        zIndex:       1,
      }}
    >
      {/* Wordmark */}
      <Box
        sx={{
          height:       48,
          display:      'flex',
          alignItems:   'center',
          px:           collapsed ? 1.5 : 2,
          gap:          1.5,
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
          overflow:     'hidden',
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
            justifyContent:'center',
            flexShrink:   0,
          }}
        >
          <Box sx={{ width: 14, height: 14, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: '3px', transform: 'rotate(45deg)' }} />
        </Box>
        {!collapsed && (
          <Typography sx={{ fontWeight: 700, fontSize: '15px', color: C.textPrimary, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Summit
          </Typography>
        )}
      </Box>

      {/* Command palette / search trigger */}
      <Box sx={{ px: 0.75, pt: 1, pb: 0.5, flexShrink: 0 }}>
        <Tooltip title={collapsed ? 'Search & commands (⌘K)' : ''} placement="right">
          <Box
            onClick={onOpenCommandPalette}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenCommandPalette()}
            aria-label="Open command palette"
            sx={{
              display:     'flex',
              alignItems:  'center',
              gap:         1,
              px:          1.25,
              py:          0.75,
              borderRadius:'8px',
              cursor:      'pointer',
              bgcolor:     'rgba(255,255,255,0.04)',
              border:      '1px solid rgba(255,255,255,0.07)',
              color:       C.textMuted,
              transition:  'all 150ms ease',
              '&:hover': { borderColor: 'rgba(61,126,255,0.35)', color: C.textSecondary, bgcolor: 'rgba(61,126,255,0.05)' },
              '&:focus-visible': { outline: `2px solid ${C.primary}`, outlineOffset: '2px' },
            }}
          >
            <Search sx={{ fontSize: 14, flexShrink: 0 }} />
            {!collapsed && (
              <>
                <Typography sx={{ fontSize: '12px', flex: 1, lineHeight: 1, whiteSpace: 'nowrap' }}>
                  Search or run…
                </Typography>
                <Box
                  sx={{
                    fontSize: '10px',
                    lineHeight: 1,
                    color: C.textMuted,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    px: 0.75,
                    py: 0.375,
                    borderRadius: '4px',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                  }}
                >
                  ⌘K
                </Box>
              </>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Nav groups */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.5 }}>
        {NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter(isVisible);
          if (visible.length === 0) return null;
          return (
            <Box key={gi} sx={{ mb: 0.25 }}>
              {!collapsed && group.label && (
                <Typography
                  sx={{
                    px: 2, pt: 1.25, pb: 0.375,
                    fontSize: '10px', fontWeight: 600,
                    color: C.textMuted,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.label}
                </Typography>
              )}
              {visible.map((item) => {
                const active = isActive(item.path);
                const el = (
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
                      py:          0.8,
                      borderRadius:'7px',
                      cursor:      'pointer',
                      color:       active ? C.primary : C.textSecondary,
                      bgcolor:     active ? C.activeBg : 'transparent',
                      transition:  'all 130ms ease',
                      overflow:    'hidden',
                      '&:hover': { bgcolor: active ? C.activeBg : C.hoverBg, color: active ? C.primary : C.textPrimary },
                      '&:focus-visible': { outline: `2px solid ${C.primary}`, outlineOffset: '1px' },
                    }}
                  >
                    <Box sx={{ flexShrink: 0, display: 'flex', opacity: active ? 1 : 0.7 }}>{item.icon}</Box>
                    {!collapsed && (
                      <Typography sx={{ fontSize: '13px', fontWeight: active ? 600 : 400, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </Typography>
                    )}
                  </Box>
                );
                return collapsed ? (
                  <Tooltip key={item.path} title={item.label} placement="right">{el}</Tooltip>
                ) : el;
              })}
            </Box>
          );
        })}
      </Box>

      {/* Bottom: user + collapse */}
      <Box sx={{ borderTop: `1px solid ${C.border}`, p: 0.75, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 1.25, py: 0.875, borderRadius: '7px',
            cursor: 'pointer', color: C.textSecondary,
            '&:hover': { bgcolor: C.hoverBg, color: C.textPrimary },
            overflow: 'hidden',
          }}
        >
          <Box sx={{ width: 26, height: 26, bgcolor: 'rgba(61,126,255,0.15)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(61,126,255,0.2)' }}>
            <Person sx={{ fontSize: 14, color: C.primary }} />
          </Box>
          {!collapsed && <Typography sx={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Account</Typography>}
        </Box>

        <Box
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 0.625, borderRadius: '7px', cursor: 'pointer', color: C.textMuted, '&:hover': { bgcolor: C.hoverBg, color: C.textSecondary } }}
        >
          {collapsed ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
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
          <ListItemText primary="Profile" primaryTypographyProps={{ fontSize: '13px' }} />
        </MenuItem>
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon><Settings sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '13px' }} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon><ExitToApp sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: '13px' }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────
function TopBar({ onOpenNlq, onOpenCommandPalette }) {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [notifAnchor, setNotifAnchor] = useState(null);

  const { data: healthData } = useQuery(GET_HEALTH, {
    fetchPolicy: 'network-only',
    pollInterval: 30_000,
    onError: () => {},
  });
  const { data: statsData } = useQuery(GET_SERVER_STATS, {
    fetchPolicy: 'network-only',
    pollInterval: 60_000,
    onError: () => {},
  });

  const isOperational = healthData?.health === true || healthData?.health === 'ok';
  const dbStatus = statsData?.serverStats?.databaseStatus;

  const currentLabel = useMemo(() => {
    const flat = NAV_GROUPS.flatMap((g) => g.items);
    return flat.find(
      (i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/')
    )?.label ?? 'Dashboard';
  }, [location.pathname]);

  const showDemo = import.meta.env.VITE_DEMO_MODE === '1' || import.meta.env.VITE_DEMO_MODE === 'true';

  // Derive overall health
  const allOk = dbStatus
    ? Object.values(dbStatus).every(Boolean)
    : isOperational ?? null;
  const statusColor =
    allOk === null  ? '#546483' :
    allOk           ? '#22C55E' :
                      '#EF4444';
  const statusLabel = allOk === null ? 'Checking…' : allOk ? 'Operational' : 'Degraded';

  return (
    <Box
      component="header"
      sx={{
        height: 48,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        bgcolor: '#090D16',
        display: 'flex',
        alignItems: 'center',
        px: 2.5,
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#8B9EC4', userSelect: 'none' }}>
        {currentLabel}
      </Typography>

      <Box sx={{ flex: 1 }} />

      {/* NLQ trigger */}
      <Tooltip title="Natural language query (⌘⇧F)" arrow>
        <Box
          onClick={onOpenNlq}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onOpenNlq()}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 1.25, py: 0.625,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '7px',
            cursor: 'pointer',
            color: '#546483',
            '&:hover': { borderColor: 'rgba(61,126,255,0.3)', color: '#8B9EC4', bgcolor: 'rgba(61,126,255,0.05)' },
            transition: 'all 150ms ease',
          }}
        >
          <AutoAwesome sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Query with AI</Typography>
        </Box>
      </Tooltip>

      {/* DB health indicators */}
      {dbStatus && (
        <Tooltip
          title={
            <Box>
              {Object.entries(dbStatus).map(([db, ok]) => (
                <Box key={db} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ok ? '#22C55E' : '#EF4444' }} />
                  <Typography sx={{ fontSize: '11px', textTransform: 'capitalize' }}>{db}: {ok ? 'online' : 'offline'}</Typography>
                </Box>
              ))}
            </Box>
          }
          arrow
          placement="bottom"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {Object.entries(dbStatus).map(([db, ok]) => (
              <Box
                key={db}
                sx={{
                  width: 6, height: 6, borderRadius: '50%',
                  bgcolor: ok ? '#22C55E' : '#EF4444',
                  boxShadow: ok ? '0 0 0 2px rgba(34,197,94,0.15)' : 'none',
                }}
              />
            ))}
          </Box>
        </Tooltip>
      )}

      {/* Overall status */}
      <Tooltip title={statusLabel} placement="bottom" arrow>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'default' }}>
          <Box
            sx={{
              width: 7, height: 7, borderRadius: '50%',
              bgcolor: statusColor,
              boxShadow: allOk ? `0 0 0 2px ${statusColor}33` : 'none',
              transition: 'all 300ms ease',
            }}
          />
          <Typography sx={{ fontSize: '11px', color: '#546483' }}>{statusLabel}</Typography>
        </Box>
      </Tooltip>

      {showDemo && (
        <Button size="small" variant="outlined" onClick={() => navigate('/demo')}
          sx={{ fontSize: '11px', py: 0.5, px: 1.5, borderRadius: '6px' }}>
          Demo
        </Button>
      )}

      {/* Notifications */}
      <Tooltip title="Notifications" arrow>
        <Box
          component="button"
          onClick={(e) => setNotifAnchor(e.currentTarget)}
          sx={{
            all: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: '8px', cursor: 'pointer',
            color: '#546483',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#8B9EC4' },
          }}
        >
          <Badge badgeContent={3} sx={{ '& .MuiBadge-badge': { bgcolor: '#EF4444', color: '#fff', fontSize: '10px' } }}>
            <Notifications sx={{ fontSize: 17 }} />
          </Badge>
        </Box>
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
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#E8EEF7' }}>Notifications</Typography>
        </Box>
        {[
          { label: 'High-risk IOC detected',    sub: 'APT29 C2 infrastructure identified',   time: '5 min ago',  dot: '#EF4444' },
          { label: 'Hunt completed — findings', sub: 'Suspicious PowerShell activity',         time: '12 min ago', dot: '#F59E0B' },
          { label: 'Investigation assigned',    sub: 'Financial fraud case #INV-2025-089',    time: '1 hr ago',   dot: '#3D7EFF' },
        ].map((n, i) => (
          <MenuItem key={i} sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.25 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: n.dot, flexShrink: 0, mt: 0.625 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#C8D4EC', lineHeight: 1.3 }}>{n.label}</Typography>
              <Typography sx={{ fontSize: '11px', color: '#546483', mt: 0.25 }}>{n.sub} · {n.time}</Typography>
            </Box>
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

  // Real data from GraphQL
  const { data: statsData, loading: statsLoading } = useQuery(GET_SERVER_STATS, {
    fetchPolicy: 'network-only',
    pollInterval: 30_000,
    onError: () => {},
  });
  const { data: invsData, loading: invsLoading } = useQuery(GET_INVESTIGATIONS, {
    fetchPolicy: 'network-only',
    onError: () => {},
  });
  const { data: actData, loading: actLoading } = useQuery(DASHBOARD_ACTIVITY_QUERY, {
    variables: { limit: 8 },
    fetchPolicy: 'network-only',
    pollInterval: 15_000,
    onError: () => {},
  });
  const { data: anomalyData } = useQuery(DETECT_ANOMALIES, {
    variables: { limit: 5 },
    fetchPolicy: 'network-only',
    onError: () => {},
  });

  const stats    = statsData?.serverStats;
  const invs     = invsData?.getInvestigations ?? [];
  const acts     = actData?.activities ?? [];
  const anomalies= anomalyData?.detectAnomalies ?? [];
  const dbStatus = stats?.databaseStatus;

  // Uptime simulation fallback
  const [simLoad, setSimLoad] = useState(67);
  useEffect(() => {
    const t = setInterval(() => {
      setSimLoad((v) => Math.max(20, Math.min(95, v + (Math.random() - 0.5) * 10)));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const cardSx = {
    p: '20px', bgcolor: '#111A2E',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', height: '100%',
    transition: 'border-color 150ms ease',
    '&:hover': { borderColor: 'rgba(61,126,255,0.25)' },
  };
  const labelSx = {
    fontSize: '10.5px', fontWeight: 600,
    color: '#546483', textTransform: 'uppercase', letterSpacing: '0.09em',
  };

  const metricCards = [
    {
      label: 'Investigations',
      value: stats?.totalInvestigations ?? (statsLoading ? null : '—'),
      delta: `${invs.filter((i) => i.status === 'ACTIVE' || i.status === 'OPEN').length} active`,
      accent: '#E8EEF7',
    },
    {
      label: 'Graph Entities',
      value: stats?.totalEntities?.toLocaleString() ?? (statsLoading ? null : '—'),
      delta: 'Total indexed',
      accent: '#3D7EFF',
    },
    {
      label: 'Relationships',
      value: stats?.totalRelationships?.toLocaleString() ?? (statsLoading ? null : '—'),
      delta: 'Entity links',
      accent: '#00C9A7',
      live: true,
    },
    {
      label: 'System Uptime',
      value: stats ? formatUptime(stats.uptime) : (statsLoading ? null : '—'),
      delta: dbStatus ? (Object.values(dbStatus).every(Boolean) ? 'All services nominal' : 'Some services degraded') : 'Checking…',
      accent: Object.values(dbStatus ?? {}).every(Boolean) ? '#22C55E' : '#F59E0B',
    },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1440, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#E8EEF7', letterSpacing: '-0.01em', mb: 0.5 }}>
          Command Center
        </Typography>
        <Typography sx={{ fontSize: '12px', color: '#546483' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Metric strip */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {metricCards.map((m) => (
          <Grid item xs={12} sm={6} md={3} key={m.label}>
            <Box sx={cardSx}>
              <Typography sx={{ ...labelSx, mb: 1.75 }}>{m.label}</Typography>
              {m.value === null ? (
                <Skeleton variant="rectangular" width="60%" height={34} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '6px', mb: 1 }} />
              ) : (
                <Typography sx={{ fontSize: '34px', fontWeight: 700, color: m.accent, lineHeight: 1, mb: 0.75, fontVariantNumeric: 'tabular-nums' }}>
                  {m.value}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {m.live && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00C9A7', boxShadow: '0 0 0 3px rgba(0,201,167,0.15)' }} />
                )}
                <Typography sx={{ fontSize: '11.5px', color: '#546483' }}>{m.delta}</Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Main grid */}
      <Grid container spacing={2}>

        {/* Recent Investigations */}
        <Grid item xs={12} lg={7}>
          <Box sx={{ ...cardSx, height: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={labelSx}>Recent Investigations</Typography>
              <Button
                size="small"
                onClick={() => navigate('/investigations/new')}
                sx={{ fontSize: '11px', py: 0.375, px: 1.25, minWidth: 0, color: '#3D7EFF', '&:hover': { bgcolor: 'rgba(61,126,255,0.1)' } }}
              >
                + New
              </Button>
            </Box>

            {invsLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={36} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '6px', mb: 1 }} />
              ))
            ) : invs.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '13px', color: '#546483' }}>No investigations yet</Typography>
                <Button size="small" variant="outlined" onClick={() => navigate('/investigations/new')}
                  sx={{ mt: 1.5, fontSize: '12px', borderColor: 'rgba(255,255,255,0.12)', color: '#8B9EC4' }}>
                  Start first investigation
                </Button>
              </Box>
            ) : (
              <Box>
                {/* Header row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px 90px', gap: 1, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', mb: 1 }}>
                  {['Name', 'Status', 'Nodes', 'Edges', 'Created'].map((h) => (
                    <Typography key={h} sx={{ ...labelSx, fontSize: '10px' }}>{h}</Typography>
                  ))}
                </Box>
                {invs.slice(0, 6).map((inv) => {
                  const ss = STATUS_STYLES[inv.status] ?? STATUS_STYLES.PENDING;
                  return (
                    <Box
                      key={inv.id}
                      onClick={() => navigate(`/investigations`)}
                      sx={{
                        display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px 90px',
                        gap: 1, py: 1.125, cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '6px', mx: -1, px: 1,
                        '&:hover': { bgcolor: 'rgba(61,126,255,0.06)' },
                        transition: 'background-color 130ms ease',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Typography sx={{ fontSize: '12.5px', color: '#C8D4EC', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.name || inv.title || `Investigation ${inv.id?.slice(-6)}`}
                      </Typography>
                      <Box>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.875, py: 0.25, borderRadius: '4px', bgcolor: ss.bg, border: `1px solid ${ss.color}22` }}>
                          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: ss.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {inv.status ?? 'OPEN'}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: '12.5px', color: '#8B9EC4', fontVariantNumeric: 'tabular-nums' }}>
                        {inv.nodeCount ?? inv.entityCount ?? '—'}
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', color: '#8B9EC4', fontVariantNumeric: 'tabular-nums' }}>
                        {inv.edgeCount ?? inv.relationshipCount ?? '—'}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#546483' }}>
                        {inv.createdAt ? timeAgo(inv.createdAt) : '—'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Grid>

        {/* Activity feed */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ ...cardSx, height: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={labelSx}>Activity Feed</Typography>
              {!actLoading && acts.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00C9A7', boxShadow: '0 0 0 2px rgba(0,201,167,0.2)' }} />
                  <Typography sx={{ fontSize: '10px', color: '#546483' }}>Live</Typography>
                </Box>
              )}
            </Box>

            {actLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '6px', mb: 0.75 }} />
              ))
            ) : acts.length === 0 ? (
              /* Fallback activity items when backend offline */
              [
                { text: 'Investigation "Project Alpha" updated',   time: '2 min ago',  type: 'update' },
                { text: 'AI detected new pattern in Case #47',     time: '8 min ago',  type: 'analyze' },
                { text: 'Weekly intelligence report generated',    time: '1 hr ago',   type: 'create' },
                { text: 'Graph entity enrichment completed',       time: '2 hr ago',   type: 'execute' },
                { text: 'Hunt #TH-2025-042 assigned to analyst',   time: '3 hr ago',   type: 'access' },
              ].map((a, i) => {
                const s = ACTION_STYLES[a.type] ?? ACTION_STYLES.access;
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.125, '&:last-child': { mb: 0 } }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, flexShrink: 0, mt: '5px' }} />
                    <Typography sx={{ fontSize: '12px', color: '#8B9EC4', flex: 1, lineHeight: 1.45 }}>{a.text}</Typography>
                    <Typography sx={{ fontSize: '10.5px', color: '#546483', flexShrink: 0, mt: 0.125 }}>{a.time}</Typography>
                  </Box>
                );
              })
            ) : (
              acts.map((a) => {
                const s = ACTION_STYLES[a.actionType?.toLowerCase()] ?? ACTION_STYLES.access;
                const label = `${s.label} ${a.resourceType?.toLowerCase() ?? 'resource'} ${a.resourceId ? `#${a.resourceId.slice(-6)}` : ''}`;
                return (
                  <Box key={a.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.125, '&:last-child': { mb: 0 } }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, flexShrink: 0, mt: '5px' }} />
                    <Typography sx={{ fontSize: '12px', color: '#8B9EC4', flex: 1, lineHeight: 1.45 }}>{label}</Typography>
                    <Typography sx={{ fontSize: '10.5px', color: '#546483', flexShrink: 0, mt: 0.125 }}>{timeAgo(a.timestamp)}</Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </Grid>

        {/* System health */}
        <Grid item xs={12} md={5}>
          <Box sx={{ ...cardSx, height: 'auto' }}>
            <Typography sx={{ ...labelSx, mb: 2.5 }}>System Health</Typography>

            {/* Platform load */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '13px', color: '#C8D4EC' }}>Platform Load</Typography>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: simLoad > 80 ? '#EF4444' : simLoad > 60 ? '#F59E0B' : '#22C55E' }}>
                  {Math.round(simLoad)}%
                </Typography>
              </Box>
              <Box sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <Box sx={{ height: '100%', width: `${simLoad}%`, bgcolor: simLoad > 80 ? '#EF4444' : simLoad > 60 ? '#F59E0B' : '#22C55E', borderRadius: 2, transition: 'width 500ms ease, background-color 300ms ease' }} />
              </Box>
            </Box>

            {/* Database services */}
            {dbStatus ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {Object.entries(dbStatus).map(([db, ok]) => (
                  <Box key={db} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: ok ? '#22C55E' : '#EF4444', boxShadow: ok ? '0 0 0 2px rgba(34,197,94,0.15)' : 'none', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '13px', color: '#C8D4EC', textTransform: 'capitalize', flex: 1 }}>{db}</Typography>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: ok ? '#22C55E' : '#EF4444' }}>{ok ? 'Online' : 'Offline'}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {['Redis', 'PostgreSQL', 'Neo4j'].map((db) => (
                  <Box key={db} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Skeleton variant="circular" width={7} height={7} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Typography sx={{ fontSize: '13px', color: '#C8D4EC', flex: 1 }}>{db}</Typography>
                    <Skeleton variant="rectangular" width={40} height={14} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dbStatus && Object.values(dbStatus).every(Boolean) ? '#22C55E' : '#546483', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '12px', color: '#8B9EC4' }}>
                {dbStatus
                  ? Object.values(dbStatus).every(Boolean) ? 'All services operational' : 'Some services degraded'
                  : 'Checking service status…'
                }
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* AI Anomalies + Quick Actions */}
        <Grid item xs={12} md={7}>
          <Grid container spacing={2} sx={{ height: '100%' }}>

            {/* AI anomaly signals */}
            <Grid item xs={12}>
              <Box sx={{ ...cardSx, height: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={labelSx}>AI Signals</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.375, borderRadius: '6px', bgcolor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                    <AutoAwesome sx={{ fontSize: 11, color: '#A78BFA' }} />
                    <Typography sx={{ fontSize: '10px', color: '#A78BFA', fontWeight: 600 }}>AI-powered</Typography>
                  </Box>
                </Box>

                {anomalies.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {anomalies.slice(0, 4).map((a) => (
                      <Box key={a.entityId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.875, px: 1.25, borderRadius: '7px', bgcolor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                        <BugReport sx={{ fontSize: 14, color: '#EF4444', flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '12px', color: '#C8D4EC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.reason ?? `Anomaly in entity ${a.entityId?.slice(-8)}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'inline-flex', px: 0.875, py: 0.25, borderRadius: '4px', bgcolor: 'rgba(239,68,68,0.12)' }}>
                          <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.round((a.anomalyScore ?? 0) * 100)}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {[
                      { text: 'No anomalies detected in active investigations', severity: 'ok' },
                      { text: 'Link suggestion model ready — open a case to surface connections', severity: 'info' },
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.severity === 'ok' ? '#22C55E' : '#3D7EFF', flexShrink: 0, mt: '4px' }} />
                        <Typography sx={{ fontSize: '12px', color: '#8B9EC4', lineHeight: 1.45 }}>{item.text}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Quick launch */}
            <Grid item xs={12}>
              <Box sx={{ ...cardSx, height: 'auto' }}>
                <Typography sx={{ ...labelSx, mb: 2 }}>Quick Launch</Typography>
                <Grid container spacing={1.25}>
                  {[
                    { label: 'New Investigation', path: '/investigations/new', accent: '#3D7EFF' },
                    { label: 'IntelGraph',         path: '/graph',             accent: '#00C9A7' },
                    { label: 'AI Copilot',          path: '/copilot',           accent: '#A78BFA' },
                    { label: 'Threat Analysis',     path: '/threats',           accent: '#F59E0B' },
                    { label: 'Brief Studio',         path: '/briefstudio',      accent: '#8B9EC4' },
                    { label: 'OSINT Studio',         path: '/osint',            accent: '#EF4444' },
                  ].map((a) => (
                    <Grid item xs={6} sm={4} key={a.label}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate(a.path)}
                        sx={{
                          py: 1, borderColor: 'rgba(255,255,255,0.09)',
                          color: '#C8D4EC', fontSize: '12px', fontWeight: 500,
                          borderRadius: '8px', justifyContent: 'flex-start', px: 1.5,
                          '&:hover': { borderColor: a.accent, color: a.accent, bgcolor: `${a.accent}0D` },
                        }}
                      >
                        {a.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>

          </Grid>
        </Grid>

        {/* Platform components */}
        <Grid item xs={12}>
          <Box sx={{ ...cardSx, height: 'auto' }}>
            <Typography sx={{ ...labelSx, mb: 2 }}>Platform Services</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['React Router', 'Material-UI', 'Apollo GraphQL', 'Redux', 'Graph Engine', 'AI Copilot', 'Maestro', 'Link Analysis', 'NLQ Engine', 'Provenance'].map((c) => (
                <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.625, borderRadius: '6px', bgcolor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.16)' }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22C55E' }} />
                  <Typography sx={{ fontSize: '11.5px', color: '#8B9EC4' }}>{c}</Typography>
                </Box>
              ))}
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
      <ErrorBoundary componentName="IntelligentCopilot"><IntelligentCopilot /></ErrorBoundary>
    </Container>
  );
}
function ThreatsPage() {
  return <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}><ThreatAssessmentEngine /></Container>;
}
function OrchestratorPage() {
  return <Container maxWidth="xl" sx={{ py: 2 }}><OrchestratorDashboard /></Container>;
}
function MaestroPage() {
  return <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}><ErrorBoundary componentName="MaestroApp"><MaestroApp /></ErrorBoundary></Container>;
}
function BriefStudioPage() {
  return <Container maxWidth="xl" sx={{ py: 2 }}><ErrorBoundary componentName="BriefStudio"><BriefStudio /></ErrorBoundary></Container>;
}
function WatchlistPage() {
  return <Container maxWidth="xl" sx={{ py: 2 }}><ErrorBoundary componentName="WatchlistManager"><WatchlistManager /></ErrorBoundary></Container>;
}
function WorkflowPage() {
  return <Container maxWidth="xl" sx={{ py: 2 }}><ErrorBoundary componentName="WorkflowEditor"><WorkflowEditor /></ErrorBoundary></Container>;
}
function OsintPage() {
  return <Container maxWidth="xl" sx={{ py: 2 }}><ErrorBoundary componentName="OsintStudio"><OsintStudio /></ErrorBoundary></Container>;
}
function LinkAnalysisPage() {
  return <Container maxWidth="xl" sx={{ height: '100%', py: 2 }}><ErrorBoundary componentName="LinkAnalysisCanvas"><LinkAnalysisCanvas /></ErrorBoundary></Container>;
}
function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, p: 4, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '72px', fontWeight: 700, color: 'rgba(255,255,255,0.06)', lineHeight: 1 }}>404</Typography>
      <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#E8EEF7' }}>Page not found</Typography>
      <Typography sx={{ fontSize: '13px', color: '#546483', maxWidth: 340 }}>The page you are looking for does not exist or has been moved.</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 1 }}>Go to Dashboard</Button>
    </Box>
  );
}

function PageLoader() {
  return <Box sx={{ width: '100%', pt: 2, px: 3 }}><LinearProgress sx={{ borderRadius: 2 }} /></Box>;
}

// ── Main layout ────────────────────────────────────────────────────────────
function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdPaletteOpen,   setCmdPaletteOpen]   = useState(false);
  const [nlqOpen,          setNlqOpen]           = useState(false);
  const mainRef = useRef(null);
  const a11yGuardrailsEnabled = useFeatureFlag('ui.a11yGuardrails');

  // ⌘K / Ctrl+K → command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setNlqOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const routeLabels = useMemo(
    () => navigationItems.reduce((acc, item) => { acc[item.path] = item.label; return acc; }, { '/': 'Home', '/login': 'Login' }),
    [],
  );

  // Lazy-load NLQ modal only when needed
  const NlqModal = React.useMemo(
    () => nlqOpen ? React.lazy(() => import('./features/nlq/NlqModal').then((m) => ({ default: m.NlqModal }))) : null,
    [nlqOpen],
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <a href="#main-content" className="sr-only" style={{ textDecoration: 'none' }}>Skip to main content</a>

      <PremiumSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onOpenCommandPalette={() => setCmdPaletteOpen(true)}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <TopBar
          onOpenNlq={() => setNlqOpen(true)}
          onOpenCommandPalette={() => setCmdPaletteOpen(true)}
        />

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
                <Route path="/"                    element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"           element={<DashboardPage />} />
                <Route path="/search"              element={<SearchHome />} />
                <Route path="/search/results/:id"  element={<SearchResultDetail />} />
                <Route path="/hunts"               element={<HuntList />} />
                <Route path="/hunts/:id"           element={<HuntDetail />} />
                <Route path="/ioc"                 element={<IOCList />} />
                <Route path="/ioc/:id"             element={<IOCDetail />} />
                <Route path="/investigations"      element={<InvestigationsPage />} />
                <Route path="/investigations/new"  element={<NewInvestigation />} />
                <Route path="/graph"               element={<GraphExplorerPage />} />
                <Route path="/link-analysis"       element={<LinkAnalysisPage />} />
                <Route path="/copilot"             element={<CopilotPage />} />
                <Route path="/orchestrator"        element={<OrchestratorPage />} />
                <Route path="/maestro"             element={<MaestroPage />} />
                <Route path="/threats"             element={<ThreatsPage />} />
                <Route path="/osint"               element={<OsintPage />} />
                <Route path="/briefstudio"         element={<BriefStudioPage />} />
                <Route path="/watchlists"          element={<WatchlistPage />} />
                <Route path="/workflows"           element={<WorkflowPage />} />
                <Route path="/disclosures"         element={<DisclosurePackagerPage />} />
                <Route path="/access-intel"        element={<AccessIntelPage />} />
                <Route path="/geoint"              element={<InvestigationsPage />} />
                <Route path="/reports"             element={<InvestigationsPage />} />
                <Route path="/demo"                element={<DemoWalkthrough />} />

                <Route element={<ProtectedRoute roles={[ADMIN]} />}>
                  <Route path="/partner-console" element={<PartnerConsolePage />} />
                </Route>
                <Route element={<ProtectedRoute roles={APPROVER_ROLES} />}>
                  <Route path="/approvals" element={<ApprovalsPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                  <Route path="/system"                  element={<AdminDashboard />} />
                  <Route path="/admin/osint-feeds"       element={<OsintFeedConfig />} />
                  <Route path="/wargame-dashboard"       element={<ExecutiveDashboard />} />
                  <Route path="/alerting"                element={<AlertingPage />} />
                  <Route path="/plugins"                 element={<InstalledPlugins />} />
                  <Route path="/integrations"            element={<IntegrationCatalog />} />
                  <Route path="/security"                element={<SecurityDashboard />} />
                  <Route path="/compliance"              element={<ComplianceCenter />} />
                  <Route path="/sandbox"                 element={<SandboxDashboard />} />
                  <Route path="/ops/release-readiness"   element={<ReleaseReadinessRoute />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </React.Suspense>
        </Box>
      </Box>

      {/* Global command palette — ⌘K */}
      <GlobalCommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
      />

      {/* NLQ modal — ⌘⇧F */}
      {nlqOpen && NlqModal && (
        <React.Suspense fallback={null}>
          <NlqModal />
        </React.Suspense>
      )}
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
