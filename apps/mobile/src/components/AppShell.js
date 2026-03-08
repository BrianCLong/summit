"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = AppShell;
/**
 * App Shell Component
 * Main layout with bottom navigation and network status
 */
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const NetworkContext_1 = require("@/contexts/NetworkContext");
const useAlerts_1 = require("@/hooks/useAlerts");
const syncEngine_1 = require("@/lib/syncEngine");
// Navigation items
const navItems = [
    { label: 'Inbox', icon: icons_material_1.NotificationsActive, path: '/' },
    { label: 'Cases', icon: icons_material_1.Folder, path: '/cases' },
    { label: 'Profile', icon: icons_material_1.Person, path: '/profile' },
];
function AppShell() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const { status, isOnline } = (0, NetworkContext_1.useNetwork)();
    const { unreadCount } = (0, useAlerts_1.useAlerts)();
    const [syncState, setSyncState] = react_1.default.useState(syncEngine_1.syncEngine.getState());
    // Subscribe to sync state changes
    react_1.default.useEffect(() => {
        return syncEngine_1.syncEngine.subscribe(setSyncState);
    }, []);
    // Find current nav index
    const currentNavIndex = navItems.findIndex((item) => location.pathname === item.path ||
        location.pathname.startsWith(item.path + '/'));
    const handleNavChange = (_, newValue) => {
        navigate(navItems[newValue].path);
    };
    return (<material_1.Box sx={{ minHeight: '100vh', pb: 8, bgcolor: 'background.default' }}>
      {/* Top status bar for offline/sync status */}
      {(!isOnline || syncState.isSyncing || syncState.pendingCount > 0) && (<material_1.Box sx={{
                bgcolor: isOnline ? 'warning.dark' : 'error.dark',
                color: 'white',
                py: 0.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
            }}>
          {!isOnline ? (<>
              <icons_material_1.CloudOff fontSize="small"/>
              <material_1.Typography variant="caption">Offline mode</material_1.Typography>
            </>) : syncState.isSyncing ? (<>
              <icons_material_1.Sync fontSize="small" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }}/>
              <material_1.Typography variant="caption">Syncing...</material_1.Typography>
            </>) : (<>
              <icons_material_1.Sync fontSize="small"/>
              <material_1.Typography variant="caption">
                {syncState.pendingCount} pending changes
              </material_1.Typography>
            </>)}
        </material_1.Box>)}

      {/* Main content area */}
      <material_1.Box sx={{ flex: 1 }}>
        <react_router_dom_1.Outlet />
      </material_1.Box>

      {/* Bottom Navigation */}
      <material_1.BottomNavigation value={currentNavIndex >= 0 ? currentNavIndex : 0} onChange={handleNavChange} showLabels sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
                minWidth: 64,
                py: 1,
            },
        }}>
        {navItems.map((item, index) => (<material_1.BottomNavigationAction key={item.path} label={item.label} icon={index === 0 ? (<material_1.Badge badgeContent={unreadCount} color="error">
                  <item.icon />
                </material_1.Badge>) : (<item.icon />)}/>))}
      </material_1.BottomNavigation>
    </material_1.Box>);
}
exports.default = AppShell;
