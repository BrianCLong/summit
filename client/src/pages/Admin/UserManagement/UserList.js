"use strict";
/**
 * User List Component
 *
 * Main user management interface with search, filter, and pagination.
 * All operations return DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC7.2
 *
 * @module pages/Admin/UserManagement/UserList
 */
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
exports.default = UserList;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AuthContext_jsx_1 = require("../../../context/AuthContext.jsx");
const useAdminUsers_1 = require("../../../hooks/useAdminUsers");
const UserForm_1 = __importDefault(require("./UserForm"));
const RoleAssignment_1 = __importDefault(require("./RoleAssignment"));
function UserList() {
    const { hasPermission, hasRole } = (0, AuthContext_jsx_1.useAuth)();
    const { users, total, page, totalPages, loading, error, selectedUser, refresh, loadUser, setPage, setFilters, clearSelection, createUser, updateUser, deleteUser, lockUser, unlockUser, } = (0, useAdminUsers_1.useAdminUsers)();
    // UI State
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [roleFilter, setRoleFilter] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('');
    const [showUserForm, setShowUserForm] = (0, react_1.useState)(false);
    const [showRoleAssignment, setShowRoleAssignment] = (0, react_1.useState)(false);
    const [editingUser, setEditingUser] = (0, react_1.useState)(null);
    const [deleteConfirm, setDeleteConfirm] = (0, react_1.useState)(null);
    const [lockDialog, setLockDialog] = (0, react_1.useState)(null);
    const [lockReason, setLockReason] = (0, react_1.useState)('');
    // Check permissions
    const canCreate = hasRole('admin') || hasPermission('user:create');
    const canEdit = hasRole('admin') || hasPermission('user:update');
    const canDelete = hasRole('admin') || hasPermission('user:delete');
    const canLock = hasRole('admin') || hasPermission('user:lock');
    const canAssignRoles = hasRole('admin') || hasPermission('role:assign');
    const handleSearch = (0, react_1.useCallback)(() => {
        setFilters({
            search: searchQuery || undefined,
            role: roleFilter || undefined,
            isActive: statusFilter === '' ? undefined : statusFilter === 'active',
        });
    }, [searchQuery, roleFilter, statusFilter, setFilters]);
    const handleCreateUser = () => {
        setEditingUser(null);
        setShowUserForm(true);
    };
    const handleEditUser = (user) => {
        setEditingUser(user);
        setShowUserForm(true);
    };
    const handleCloseUserForm = () => {
        setShowUserForm(false);
        setEditingUser(null);
    };
    const handleUserFormSubmit = async (data) => {
        if (editingUser) {
            const result = await updateUser(editingUser.id, {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
            });
            if (result) {
                setShowUserForm(false);
                setEditingUser(null);
            }
        }
        else {
            const result = await createUser({
                email: data.email,
                password: data.password || '',
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
            });
            if (result) {
                setShowUserForm(false);
            }
        }
    };
    const handleDeleteConfirm = async () => {
        if (deleteConfirm) {
            await deleteUser(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    };
    const handleLockConfirm = async () => {
        if (lockDialog) {
            await lockUser(lockDialog.id, lockReason);
            setLockDialog(null);
            setLockReason('');
        }
    };
    const handleUnlock = async (user) => {
        await unlockUser(user.id);
    };
    const handleOpenRoleAssignment = (user) => {
        loadUser(user.id);
        setShowRoleAssignment(true);
    };
    const handleCloseRoleAssignment = () => {
        setShowRoleAssignment(false);
        clearSelection();
    };
    const formatDate = (dateString) => {
        if (!dateString)
            return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    if (!hasRole('admin') && !hasPermission('user:read')) {
        return (<material_1.Box p={3}>
        <material_1.Alert severity="error">Access Denied: User management permission required.</material_1.Alert>
      </material_1.Box>);
    }
    return (<material_1.Box p={3}>
      {/* Header */}
      <material_1.Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <material_1.Box>
          <material_1.Typography variant="h4" gutterBottom>
            User Management
          </material_1.Typography>
          <material_1.Typography variant="body2" color="textSecondary">
            Manage user accounts, roles, and access permissions
          </material_1.Typography>
        </material_1.Box>
        <material_1.Stack direction="row" spacing={2}>
          <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={refresh} disabled={loading}>
            Refresh
          </material_1.Button>
          {canCreate && (<material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={handleCreateUser}>
              Add User
            </material_1.Button>)}
        </material_1.Stack>
      </material_1.Box>

      {/* Error Alert */}
      {error && (<material_1.Alert severity="error" sx={{ mb: 3 }} onClose={() => setFilters({})}>
          {error}
        </material_1.Alert>)}

      {/* Search and Filters */}
      <material_1.Card variant="outlined" sx={{ mb: 3 }}>
        <material_1.CardContent>
          <material_1.Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <material_1.TextField placeholder="Search by name or email..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} sx={{ minWidth: 300 }} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                    <icons_material_1.Search />
                  </material_1.InputAdornment>),
        }}/>
            <material_1.FormControl size="small" sx={{ minWidth: 150 }}>
              <material_1.InputLabel>Role</material_1.InputLabel>
              <material_1.Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                <material_1.MenuItem value="">All Roles</material_1.MenuItem>
                <material_1.MenuItem value="admin">Admin</material_1.MenuItem>
                <material_1.MenuItem value="analyst">Analyst</material_1.MenuItem>
                <material_1.MenuItem value="viewer">Viewer</material_1.MenuItem>
                <material_1.MenuItem value="developer">Developer</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.FormControl size="small" sx={{ minWidth: 150 }}>
              <material_1.InputLabel>Status</material_1.InputLabel>
              <material_1.Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <material_1.MenuItem value="">All</material_1.MenuItem>
                <material_1.MenuItem value="active">Active</material_1.MenuItem>
                <material_1.MenuItem value="inactive">Inactive</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
            <material_1.Button variant="outlined" onClick={handleSearch}>
              Search
            </material_1.Button>
          </material_1.Stack>
        </material_1.CardContent>
      </material_1.Card>

      {/* Users Table */}
      <material_1.TableContainer component={material_1.Paper} variant="outlined">
        {loading && (<material_1.Box display="flex" justifyContent="center" p={4}>
            <material_1.CircularProgress />
          </material_1.Box>)}
        {!loading && (<material_1.Table>
            <material_1.TableHead>
              <material_1.TableRow>
                <material_1.TableCell>User</material_1.TableCell>
                <material_1.TableCell>Role</material_1.TableCell>
                <material_1.TableCell>Status</material_1.TableCell>
                <material_1.TableCell>MFA</material_1.TableCell>
                <material_1.TableCell>Last Login</material_1.TableCell>
                <material_1.TableCell>Created</material_1.TableCell>
                <material_1.TableCell align="right">Actions</material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableHead>
            <material_1.TableBody>
              {users.length === 0 ? (<material_1.TableRow>
                  <material_1.TableCell colSpan={7} align="center">
                    <material_1.Typography color="textSecondary" py={4}>
                      No users found
                    </material_1.Typography>
                  </material_1.TableCell>
                </material_1.TableRow>) : (users.map((user) => (<material_1.TableRow key={user.id} hover>
                    <material_1.TableCell>
                      <material_1.Box>
                        <material_1.Typography variant="body2" fontWeight={500}>
                          {user.fullName}
                        </material_1.Typography>
                        <material_1.Typography variant="caption" color="textSecondary">
                          {user.email}
                        </material_1.Typography>
                      </material_1.Box>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Chip label={user.role} size="small" color={user.role === 'admin' ? 'primary' : 'default'}/>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {user.isLocked ? (<material_1.Tooltip title={user.lockReason || 'Account locked'}>
                          <material_1.Chip label="Locked" size="small" color="error"/>
                        </material_1.Tooltip>) : user.isActive ? (<material_1.Chip label="Active" size="small" color="success"/>) : (<material_1.Chip label="Inactive" size="small"/>)}
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {user.mfaEnabled ? (<material_1.Chip label="Enabled" size="small" color="success" variant="outlined"/>) : (<material_1.Chip label="Disabled" size="small" variant="outlined"/>)}
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Typography variant="body2">
                        {formatDate(user.lastLogin)}
                      </material_1.Typography>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Typography variant="body2">
                        {formatDate(user.createdAt)}
                      </material_1.Typography>
                    </material_1.TableCell>
                    <material_1.TableCell align="right">
                      <material_1.Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {canAssignRoles && (<material_1.Tooltip title="Manage Roles">
                            <material_1.IconButton size="small" onClick={() => handleOpenRoleAssignment(user)}>
                              <icons_material_1.Security fontSize="small"/>
                            </material_1.IconButton>
                          </material_1.Tooltip>)}
                        {canEdit && (<material_1.Tooltip title="Edit User">
                            <material_1.IconButton size="small" onClick={() => handleEditUser(user)}>
                              <icons_material_1.Edit fontSize="small"/>
                            </material_1.IconButton>
                          </material_1.Tooltip>)}
                        {canLock && (user.isLocked ? (<material_1.Tooltip title="Unlock User">
                              <material_1.IconButton size="small" onClick={() => handleUnlock(user)}>
                                <icons_material_1.LockOpen fontSize="small"/>
                              </material_1.IconButton>
                            </material_1.Tooltip>) : (<material_1.Tooltip title="Lock User">
                              <material_1.IconButton size="small" onClick={() => setLockDialog(user)}>
                                <icons_material_1.Lock fontSize="small"/>
                              </material_1.IconButton>
                            </material_1.Tooltip>))}
                        {canDelete && (<material_1.Tooltip title="Delete User">
                            <material_1.IconButton size="small" color="error" onClick={() => setDeleteConfirm(user)}>
                              <icons_material_1.Delete fontSize="small"/>
                            </material_1.IconButton>
                          </material_1.Tooltip>)}
                      </material_1.Stack>
                    </material_1.TableCell>
                  </material_1.TableRow>)))}
            </material_1.TableBody>
          </material_1.Table>)}
      </material_1.TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (<material_1.Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <material_1.Typography variant="body2" color="textSecondary">
            Showing {users.length} of {total} users
          </material_1.Typography>
          <material_1.Pagination count={totalPages} page={page} onChange={(_, newPage) => setPage(newPage)} color="primary"/>
        </material_1.Box>)}

      {/* User Form Dialog */}
      <UserForm_1.default open={showUserForm} user={editingUser} onClose={handleCloseUserForm} onSubmit={handleUserFormSubmit} loading={loading}/>

      {/* Role Assignment Dialog */}
      {selectedUser && (<RoleAssignment_1.default open={showRoleAssignment} user={selectedUser} onClose={handleCloseRoleAssignment}/>)}

      {/* Delete Confirmation Dialog */}
      <material_1.Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <material_1.DialogTitle>Confirm Delete</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Are you sure you want to delete user <strong>{deleteConfirm?.fullName}</strong>?
            This will deactivate their account. Use hard delete for permanent removal.
          </material_1.DialogContentText>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDeleteConfirm(null)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Lock User Dialog */}
      <material_1.Dialog open={!!lockDialog} onClose={() => setLockDialog(null)}>
        <material_1.DialogTitle>Lock User Account</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText sx={{ mb: 2 }}>
            Lock account for <strong>{lockDialog?.fullName}</strong>?
            They will be unable to log in until unlocked.
          </material_1.DialogContentText>
          <material_1.TextField autoFocus label="Lock Reason" fullWidth value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder="Enter reason for locking this account..."/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => { setLockDialog(null); setLockReason(''); }}>
            Cancel
          </material_1.Button>
          <material_1.Button onClick={handleLockConfirm} color="warning" variant="contained" disabled={!lockReason.trim()}>
            Lock Account
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
