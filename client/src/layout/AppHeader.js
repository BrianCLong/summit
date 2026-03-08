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
exports.default = AppHeader;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AppBar_1 = __importDefault(require("@mui/material/AppBar"));
const Toolbar_1 = __importDefault(require("@mui/material/Toolbar"));
const Typography_1 = __importDefault(require("@mui/material/Typography"));
const Box_1 = __importDefault(require("@mui/material/Box"));
const Button_1 = __importDefault(require("@mui/material/Button"));
const Select_1 = __importDefault(require("@mui/material/Select"));
const MenuItem_1 = __importDefault(require("@mui/material/MenuItem"));
const FormControl_1 = __importDefault(require("@mui/material/FormControl"));
const InputLabel_1 = __importDefault(require("@mui/material/InputLabel"));
const IconButton_1 = __importDefault(require("@mui/material/IconButton"));
const Tooltip_1 = __importDefault(require("@mui/material/Tooltip"));
const Badge_1 = __importDefault(require("@mui/material/Badge"));
const Menu_1 = __importDefault(require("@mui/material/Menu"));
const ListItemIcon_1 = __importDefault(require("@mui/material/ListItemIcon"));
const ListItemText_1 = __importDefault(require("@mui/material/ListItemText"));
const Divider_1 = __importDefault(require("@mui/material/Divider"));
// Direct icon imports for tree-shaking (reduces bundle size)
const Dashboard_1 = __importDefault(require("@mui/icons-material/Dashboard"));
const AccountTree_1 = __importDefault(require("@mui/icons-material/AccountTree"));
const Search_1 = __importDefault(require("@mui/icons-material/Search"));
const Security_1 = __importDefault(require("@mui/icons-material/Security"));
const Gavel_1 = __importDefault(require("@mui/icons-material/Gavel"));
const Notifications_1 = __importDefault(require("@mui/icons-material/Notifications"));
const Settings_1 = __importDefault(require("@mui/icons-material/Settings"));
const ExitToApp_1 = __importDefault(require("@mui/icons-material/ExitToApp"));
const Person_1 = __importDefault(require("@mui/icons-material/Person"));
const Timeline_1 = __importDefault(require("@mui/icons-material/Timeline"));
const Assessment_1 = __importDefault(require("@mui/icons-material/Assessment"));
const OpenInNew_1 = __importDefault(require("@mui/icons-material/OpenInNew"));
const hooks_1 = require("../store/hooks");
const ui_1 = require("../store/slices/ui");
const urls_1 = require("../config/urls");
function AppHeader() {
    const dispatch = (0, hooks_1.useAppDispatch)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const { tenant, status } = (0, hooks_1.useAppSelector)((s) => s.ui);
    const grafanaUrl = (0, urls_1.getGrafanaUrl)();
    const jaegerUrl = (0, urls_1.getJaegerUrl)();
    const [userMenuAnchor, setUserMenuAnchor] = (0, react_1.useState)(null);
    const [notificationsAnchor, setNotificationsAnchor] = (0, react_1.useState)(null);
    const navigationItems = [
        {
            path: '/dashboard',
            label: 'Dashboard',
            icon: <Dashboard_1.default />,
            color: 'inherit',
        },
        { path: '/graph', label: 'Graph', icon: <AccountTree_1.default />, color: 'inherit' },
        {
            path: '/investigations',
            label: 'Cases',
            icon: <Gavel_1.default />,
            color: 'inherit',
        },
        { path: '/hunts', label: 'Hunts', icon: <Security_1.default />, color: 'inherit' },
        { path: '/ioc', label: 'IOCs', icon: <Timeline_1.default />, color: 'inherit' },
        { path: '/search', label: 'Search', icon: <Search_1.default />, color: 'inherit' },
    ];
    const isActivePath = (path) => {
        return (location.pathname === path || location.pathname.startsWith(path + '/'));
    };
    const handleNavigate = (path) => {
        navigate(path);
    };
    return (<AppBar_1.default position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary' }} elevation={1}>
      <Toolbar_1.default>
        <Typography_1.default variant="h5" sx={{
            flexGrow: 0,
            mr: 4,
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
        }}>
          IntelGraph
        </Typography_1.default>

        {/* Main Navigation */}
        <Box_1.default sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          {navigationItems.map((item) => (<Button_1.default key={item.path} startIcon={item.icon} onClick={() => handleNavigate(item.path)} sx={{
                color: isActivePath(item.path)
                    ? 'primary.main'
                    : 'text.primary',
                bgcolor: isActivePath(item.path)
                    ? 'primary.light'
                    : 'transparent',
                '&:hover': {
                    bgcolor: isActivePath(item.path)
                        ? 'primary.light'
                        : 'action.hover',
                },
                borderRadius: 2,
                px: 2,
            }}>
              {item.label}
            </Button_1.default>))}
        </Box_1.default>

        {/* Controls Section */}
        <Box_1.default sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl_1.default size="small" sx={{ minWidth: 100 }}>
            <InputLabel_1.default>Tenant</InputLabel_1.default>
            <Select_1.default value={tenant} label="Tenant" onChange={(e) => dispatch((0, ui_1.setTenant)(e.target.value))} sx={{ bgcolor: 'background.default' }}>
              <MenuItem_1.default value="all">All</MenuItem_1.default>
              <MenuItem_1.default value="tenant-a">Tenant A</MenuItem_1.default>
              <MenuItem_1.default value="tenant-b">Tenant B</MenuItem_1.default>
              <MenuItem_1.default value="dev">Development</MenuItem_1.default>
            </Select_1.default>
          </FormControl_1.default>

          <FormControl_1.default size="small" sx={{ minWidth: 100 }}>
            <InputLabel_1.default>Status</InputLabel_1.default>
            <Select_1.default value={status} label="Status" onChange={(e) => dispatch((0, ui_1.setStatus)(e.target.value))} sx={{ bgcolor: 'background.default' }}>
              <MenuItem_1.default value="all">All</MenuItem_1.default>
              <MenuItem_1.default value="success">Success</MenuItem_1.default>
              <MenuItem_1.default value="error">Error</MenuItem_1.default>
              <MenuItem_1.default value="warning">Warning</MenuItem_1.default>
            </Select_1.default>
          </FormControl_1.default>

          {/* Notifications */}
          <Tooltip_1.default title="Notifications">
            <IconButton_1.default onClick={(e) => setNotificationsAnchor(e.currentTarget)} sx={{ color: 'text.primary' }}>
              <Badge_1.default badgeContent={3} color="error">
                <Notifications_1.default />
              </Badge_1.default>
            </IconButton_1.default>
          </Tooltip_1.default>

          {/* External Tools */}
          <Tooltip_1.default title="Grafana Dashboard">
            <IconButton_1.default component="a" href={grafanaUrl || '#'} target="_blank" rel="noreferrer" sx={{ color: 'text.primary' }} disabled={!grafanaUrl}>
              <Assessment_1.default />
            </IconButton_1.default>
          </Tooltip_1.default>

          <Tooltip_1.default title="Jaeger Tracing">
            <IconButton_1.default component="a" href={jaegerUrl || '#'} target="_blank" rel="noreferrer" sx={{ color: 'text.primary' }} disabled={!jaegerUrl}>
              <OpenInNew_1.default />
            </IconButton_1.default>
          </Tooltip_1.default>

          {/* User Menu */}
          <Tooltip_1.default title="User Profile">
            <IconButton_1.default onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ color: 'text.primary' }}>
              <Person_1.default />
            </IconButton_1.default>
          </Tooltip_1.default>
        </Box_1.default>

        {/* Notifications Menu */}
        <Menu_1.default anchorEl={notificationsAnchor} open={Boolean(notificationsAnchor)} onClose={() => setNotificationsAnchor(null)} PaperProps={{
            sx: { width: 320, maxHeight: 400 },
        }}>
          <MenuItem_1.default>
            <ListItemIcon_1.default>
              <Security_1.default color="error"/>
            </ListItemIcon_1.default>
            <ListItemText_1.default primary="High-risk IOC detected" secondary="APT29 C2 infrastructure identified - 5 minutes ago"/>
          </MenuItem_1.default>
          <MenuItem_1.default>
            <ListItemIcon_1.default>
              <Timeline_1.default color="warning"/>
            </ListItemIcon_1.default>
            <ListItemText_1.default primary="Hunt completed with findings" secondary="Suspicious PowerShell activity - 12 minutes ago"/>
          </MenuItem_1.default>
          <MenuItem_1.default>
            <ListItemIcon_1.default>
              <Gavel_1.default color="info"/>
            </ListItemIcon_1.default>
            <ListItemText_1.default primary="New investigation assigned" secondary="Financial fraud case #INV-2025-089 - 1 hour ago"/>
          </MenuItem_1.default>
          <Divider_1.default />
          <MenuItem_1.default onClick={() => setNotificationsAnchor(null)}>
            <ListItemText_1.default primary="View All Notifications" sx={{ textAlign: 'center' }}/>
          </MenuItem_1.default>
        </Menu_1.default>

        {/* User Menu */}
        <Menu_1.default anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)} PaperProps={{
            sx: { width: 200 },
        }}>
          <MenuItem_1.default onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon_1.default>
              <Person_1.default />
            </ListItemIcon_1.default>
            <ListItemText_1.default primary="Profile"/>
          </MenuItem_1.default>
          <MenuItem_1.default onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon_1.default>
              <Settings_1.default />
            </ListItemIcon_1.default>
            <ListItemText_1.default primary="Settings"/>
          </MenuItem_1.default>
          <Divider_1.default />
          <MenuItem_1.default onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon_1.default>
              <ExitToApp_1.default />
            </ListItemIcon_1.default>
            <ListItemText_1.default primary="Logout"/>
          </MenuItem_1.default>
        </Menu_1.default>
      </Toolbar_1.default>
    </AppBar_1.default>);
}
