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
exports.ProfilePage = ProfilePage;
/**
 * Profile Page
 * User profile, settings, and security options
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("@/contexts/AuthContext");
const NetworkContext_1 = require("@/contexts/NetworkContext");
const offlineCache_1 = require("@/lib/offlineCache");
const syncEngine_1 = require("@/lib/syncEngine");
const deviceManager_1 = require("@/lib/deviceManager");
function ProfilePage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { user, logout, securityConfig, isBiometricAvailable, deregisterDevice } = (0, AuthContext_1.useAuth)();
    const { status, isOnline } = (0, NetworkContext_1.useNetwork)();
    const [biometricEnabled, setBiometricEnabled] = (0, react_1.useState)(false);
    const [biometricAvailable, setBiometricAvailable] = (0, react_1.useState)(false);
    const [cacheStats, setCacheStats] = (0, react_1.useState)(null);
    const [storageEstimate, setStorageEstimate] = (0, react_1.useState)(null);
    const [syncState, setSyncState] = (0, react_1.useState)(syncEngine_1.syncEngine.getState());
    const [logoutDialogOpen, setLogoutDialogOpen] = (0, react_1.useState)(false);
    const [clearDataDialogOpen, setClearDataDialogOpen] = (0, react_1.useState)(false);
    // Check biometric availability
    (0, react_1.useEffect)(() => {
        isBiometricAvailable().then(setBiometricAvailable);
    }, [isBiometricAvailable]);
    // Load cache stats
    (0, react_1.useEffect)(() => {
        const loadStats = async () => {
            const stats = await offlineCache_1.offlineCache.getStats();
            setCacheStats(stats);
            const storage = await deviceManager_1.deviceManager.getStorageEstimate();
            setStorageEstimate(storage);
        };
        loadStats();
    }, []);
    // Subscribe to sync state
    (0, react_1.useEffect)(() => {
        return syncEngine_1.syncEngine.subscribe(setSyncState);
    }, []);
    // Handle logout
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };
    // Handle clear data
    const handleClearData = async () => {
        await offlineCache_1.offlineCache.clearAll();
        setClearDataDialogOpen(false);
        // Refresh stats
        const stats = await offlineCache_1.offlineCache.getStats();
        setCacheStats(stats);
    };
    // Handle manual sync
    const handleSync = () => {
        syncEngine_1.syncEngine.fullSync();
    };
    // Format bytes to human readable
    const formatBytes = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };
    return (<material_1.Box sx={{ pb: 8 }}>
      {/* Header */}
      <material_1.Box sx={{ px: 2, py: 1.5 }}>
        <material_1.Typography variant="h5" fontWeight={600}>
          Profile
        </material_1.Typography>
      </material_1.Box>

      {/* User Info */}
      <material_1.Box sx={{ px: 2, mb: 3 }}>
        <material_1.Card>
          <material_1.CardContent>
            <material_1.Box display="flex" alignItems="center" gap={2}>
              <material_1.Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                {user?.name.charAt(0).toUpperCase() || 'U'}
              </material_1.Avatar>
              <material_1.Box>
                <material_1.Typography variant="h6">{user?.name || 'User'}</material_1.Typography>
                <material_1.Typography variant="body2" color="text.secondary">
                  {user?.email}
                </material_1.Typography>
                <material_1.Chip label={user?.role.replace('_', ' ').toUpperCase()} size="small" sx={{ mt: 0.5 }}/>
              </material_1.Box>
            </material_1.Box>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Box>

      {/* Network & Sync Status */}
      <material_1.Box sx={{ px: 2, mb: 3 }}>
        <material_1.Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Status
        </material_1.Typography>
        <material_1.Card>
          <material_1.List disablePadding>
            <material_1.ListItem>
              <material_1.ListItemIcon>
                {isOnline ? <icons_material_1.CloudDone color="success"/> : <icons_material_1.CloudOff color="error"/>}
              </material_1.ListItemIcon>
              <material_1.ListItemText primary="Connection" secondary={isOnline ? 'Online' : 'Offline'}/>
            </material_1.ListItem>
            <material_1.Divider />
            <material_1.ListItem>
              <material_1.ListItemIcon>
                <icons_material_1.Sync />
              </material_1.ListItemIcon>
              <material_1.ListItemText primary="Sync Status" secondary={syncState.isSyncing
            ? 'Syncing...'
            : syncState.pendingCount > 0
                ? `${syncState.pendingCount} pending changes`
                : 'All synced'}/>
              <material_1.ListItemSecondaryAction>
                <material_1.Button size="small" onClick={handleSync} disabled={!isOnline || syncState.isSyncing}>
                  Sync Now
                </material_1.Button>
              </material_1.ListItemSecondaryAction>
            </material_1.ListItem>
          </material_1.List>
        </material_1.Card>
      </material_1.Box>

      {/* Security Settings */}
      <material_1.Box sx={{ px: 2, mb: 3 }}>
        <material_1.Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Security
        </material_1.Typography>
        <material_1.Card>
          <material_1.List disablePadding>
            <material_1.ListItem>
              <material_1.ListItemIcon>
                <icons_material_1.Security />
              </material_1.ListItemIcon>
              <material_1.ListItemText primary="PIN Lock" secondary="Require PIN to access app"/>
              <material_1.ListItemSecondaryAction>
                <material_1.Switch checked={securityConfig.requirePin} disabled // Controlled by admin policy
    />
              </material_1.ListItemSecondaryAction>
            </material_1.ListItem>
            <material_1.Divider />
            <material_1.ListItem>
              <material_1.ListItemIcon>
                <icons_material_1.Fingerprint />
              </material_1.ListItemIcon>
              <material_1.ListItemText primary="Biometric Login" secondary={biometricAvailable ? 'Use fingerprint or face' : 'Not available'}/>
              <material_1.ListItemSecondaryAction>
                <material_1.Switch checked={biometricEnabled} onChange={(e) => setBiometricEnabled(e.target.checked)} disabled={!biometricAvailable}/>
              </material_1.ListItemSecondaryAction>
            </material_1.ListItem>
          </material_1.List>
        </material_1.Card>
      </material_1.Box>

      {/* Storage */}
      <material_1.Box sx={{ px: 2, mb: 3 }}>
        <material_1.Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Storage
        </material_1.Typography>
        <material_1.Card>
          <material_1.CardContent>
            {storageEstimate && (<material_1.Box mb={2}>
                <material_1.Box display="flex" justifyContent="space-between" mb={0.5}>
                  <material_1.Typography variant="body2">
                    {formatBytes(storageEstimate.usage)} used
                  </material_1.Typography>
                  <material_1.Typography variant="body2" color="text.secondary">
                    {formatBytes(storageEstimate.quota)} total
                  </material_1.Typography>
                </material_1.Box>
                <material_1.LinearProgress variant="determinate" value={(storageEstimate.usage / storageEstimate.quota) * 100} sx={{ height: 8, borderRadius: 4 }}/>
              </material_1.Box>)}
            {cacheStats && (<material_1.Box display="flex" flexWrap="wrap" gap={1}>
                <material_1.Chip label={`${cacheStats.cases} cases`} size="small"/>
                <material_1.Chip label={`${cacheStats.alerts} alerts`} size="small"/>
                <material_1.Chip label={`${cacheStats.tasks} tasks`} size="small"/>
                <material_1.Chip label={`${cacheStats.entities} entities`} size="small"/>
              </material_1.Box>)}
          </material_1.CardContent>
          <material_1.Divider />
          <material_1.List disablePadding>
            <material_1.ListItem button onClick={() => setClearDataDialogOpen(true)}>
              <material_1.ListItemIcon>
                <icons_material_1.DeleteForever color="error"/>
              </material_1.ListItemIcon>
              <material_1.ListItemText primary="Clear Cached Data" secondary="Remove all offline data" primaryTypographyProps={{ color: 'error' }}/>
              <icons_material_1.ChevronRight />
            </material_1.ListItem>
          </material_1.List>
        </material_1.Card>
      </material_1.Box>

      {/* Logout */}
      <material_1.Box sx={{ px: 2, mb: 3 }}>
        <material_1.Button variant="outlined" color="error" fullWidth startIcon={<icons_material_1.Logout />} onClick={() => setLogoutDialogOpen(true)}>
          Sign Out
        </material_1.Button>
      </material_1.Box>

      {/* Logout Confirmation Dialog */}
      <material_1.Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <material_1.DialogTitle>Sign Out?</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Typography>
            {syncState.pendingCount > 0
            ? `You have ${syncState.pendingCount} pending changes that haven't been synced. These changes will be lost if you sign out.`
            : 'Are you sure you want to sign out?'}
          </material_1.Typography>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setLogoutDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleLogout} color="error" variant="contained">
            Sign Out
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Clear Data Confirmation Dialog */}
      <material_1.Dialog open={clearDataDialogOpen} onClose={() => setClearDataDialogOpen(false)}>
        <material_1.DialogTitle>Clear Cached Data?</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Typography>
            This will remove all locally cached cases, alerts, tasks, and entities.
            Your notes and observations will remain until synced.
          </material_1.Typography>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setClearDataDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleClearData} color="error" variant="contained">
            Clear Data
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
exports.default = ProfilePage;
