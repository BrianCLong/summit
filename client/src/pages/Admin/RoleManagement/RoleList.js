"use strict";
/**
 * Role List Component
 *
 * Main role management interface showing all roles and permissions.
 * All operations return DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC7.2
 *
 * @module pages/Admin/RoleManagement/RoleList
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
exports.default = RoleList;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AuthContext_jsx_1 = require("../../../context/AuthContext.jsx");
const useAdminRoles_1 = require("../../../hooks/useAdminRoles");
const RoleEditor_1 = __importDefault(require("./RoleEditor"));
const PermissionMatrix_1 = __importDefault(require("./PermissionMatrix"));
function RoleList() {
    const { hasPermission, hasRole } = (0, AuthContext_jsx_1.useAuth)();
    const { roles, permissions, permissionCategories, loading, error, refreshRoles, createRole, updateRole, deleteRole, } = (0, useAdminRoles_1.useAdminRoles)();
    // UI State
    const [showRoleEditor, setShowRoleEditor] = (0, react_1.useState)(false);
    const [showPermissionMatrix, setShowPermissionMatrix] = (0, react_1.useState)(false);
    const [editingRole, setEditingRole] = (0, react_1.useState)(null);
    const [deleteConfirm, setDeleteConfirm] = (0, react_1.useState)(null);
    const [viewingRole, setViewingRole] = (0, react_1.useState)(null);
    // Check permissions
    const canCreate = hasRole('admin') || hasPermission('role:create');
    const canEdit = hasRole('admin') || hasPermission('role:update');
    const canDelete = hasRole('admin') || hasPermission('role:delete');
    const handleCreateRole = () => {
        setEditingRole(null);
        setShowRoleEditor(true);
    };
    const handleEditRole = (role) => {
        setEditingRole(role);
        setShowRoleEditor(true);
    };
    const handleViewPermissions = (role) => {
        setViewingRole(role);
        setShowPermissionMatrix(true);
    };
    const handleCloseRoleEditor = () => {
        setShowRoleEditor(false);
        setEditingRole(null);
    };
    const handleClosePermissionMatrix = () => {
        setShowPermissionMatrix(false);
        setViewingRole(null);
    };
    const handleRoleEditorSubmit = async (data) => {
        if (editingRole) {
            const result = await updateRole(editingRole.id, {
                displayName: data.displayName,
                description: data.description,
                permissions: data.permissions,
                inherits: data.inherits,
                scope: data.scope,
            });
            if (result) {
                setShowRoleEditor(false);
                setEditingRole(null);
            }
        }
        else {
            const result = await createRole(data);
            if (result) {
                setShowRoleEditor(false);
            }
        }
    };
    const handleDeleteConfirm = async () => {
        if (deleteConfirm) {
            await deleteRole(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    };
    const formatDate = (dateString) => {
        if (!dateString)
            return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    const getScopeColor = (scope) => {
        switch (scope) {
            case 'full':
                return 'error';
            case 'restricted':
                return 'warning';
            case 'readonly':
                return 'info';
            default:
                return 'default';
        }
    };
    if (!hasRole('admin') && !hasPermission('role:read')) {
        return (<material_1.Box p={3}>
        <material_1.Alert severity="error">Access Denied: Role management permission required.</material_1.Alert>
      </material_1.Box>);
    }
    return (<material_1.Box p={3}>
      {/* Header */}
      <material_1.Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <material_1.Box>
          <material_1.Typography variant="h4" gutterBottom>
            Role Management
          </material_1.Typography>
          <material_1.Typography variant="body2" color="textSecondary">
            Define custom roles and manage permission assignments
          </material_1.Typography>
        </material_1.Box>
        <material_1.Stack direction="row" spacing={2}>
          <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={refreshRoles} disabled={loading}>
            Refresh
          </material_1.Button>
          {canCreate && (<material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={handleCreateRole}>
              Create Role
            </material_1.Button>)}
        </material_1.Stack>
      </material_1.Box>

      {/* Error Alert */}
      {error && (<material_1.Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </material_1.Alert>)}

      {/* Summary Cards */}
      <material_1.Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
        <material_1.Card variant="outlined" sx={{ flex: 1 }}>
          <material_1.CardContent>
            <material_1.Typography variant="h3" color="primary">
              {roles.length}
            </material_1.Typography>
            <material_1.Typography variant="body2" color="textSecondary">
              Total Roles
            </material_1.Typography>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card variant="outlined" sx={{ flex: 1 }}>
          <material_1.CardContent>
            <material_1.Typography variant="h3" color="secondary">
              {roles.filter((r) => r.isBuiltIn).length}
            </material_1.Typography>
            <material_1.Typography variant="body2" color="textSecondary">
              Built-in Roles
            </material_1.Typography>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card variant="outlined" sx={{ flex: 1 }}>
          <material_1.CardContent>
            <material_1.Typography variant="h3" color="success.main">
              {roles.filter((r) => !r.isBuiltIn).length}
            </material_1.Typography>
            <material_1.Typography variant="body2" color="textSecondary">
              Custom Roles
            </material_1.Typography>
          </material_1.CardContent>
        </material_1.Card>
        <material_1.Card variant="outlined" sx={{ flex: 1 }}>
          <material_1.CardContent>
            <material_1.Typography variant="h3" color="info.main">
              {permissions.length}
            </material_1.Typography>
            <material_1.Typography variant="body2" color="textSecondary">
              Total Permissions
            </material_1.Typography>
          </material_1.CardContent>
        </material_1.Card>
      </material_1.Stack>

      {/* Roles Table */}
      <material_1.TableContainer component={material_1.Paper} variant="outlined">
        {loading && (<material_1.Box display="flex" justifyContent="center" p={4}>
            <material_1.CircularProgress />
          </material_1.Box>)}
        {!loading && (<material_1.Table>
            <material_1.TableHead>
              <material_1.TableRow>
                <material_1.TableCell>Role</material_1.TableCell>
                <material_1.TableCell>Type</material_1.TableCell>
                <material_1.TableCell>Scope</material_1.TableCell>
                <material_1.TableCell>Permissions</material_1.TableCell>
                <material_1.TableCell>Inherits</material_1.TableCell>
                <material_1.TableCell>Created</material_1.TableCell>
                <material_1.TableCell align="right">Actions</material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableHead>
            <material_1.TableBody>
              {roles.length === 0 ? (<material_1.TableRow>
                  <material_1.TableCell colSpan={7} align="center">
                    <material_1.Typography color="textSecondary" py={4}>
                      No roles found
                    </material_1.Typography>
                  </material_1.TableCell>
                </material_1.TableRow>) : (roles.map((role) => (<material_1.TableRow key={role.id} hover>
                    <material_1.TableCell>
                      <material_1.Box>
                        <material_1.Stack direction="row" spacing={1} alignItems="center">
                          <icons_material_1.Security fontSize="small" color="action"/>
                          <material_1.Typography variant="body2" fontWeight={500}>
                            {role.displayName}
                          </material_1.Typography>
                        </material_1.Stack>
                        {role.description && (<material_1.Typography variant="caption" color="textSecondary">
                            {role.description}
                          </material_1.Typography>)}
                      </material_1.Box>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {role.isBuiltIn ? (<material_1.Chip label="Built-in" size="small" variant="outlined"/>) : (<material_1.Chip label="Custom" size="small" color="primary" variant="outlined"/>)}
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Chip label={role.scope} size="small" color={getScopeColor(role.scope)}/>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {role.effectivePermissions.slice(0, 3).map((perm) => (<material_1.Chip key={perm} label={perm} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}/>))}
                        {role.effectivePermissions.length > 3 && (<material_1.Chip label={`+${role.effectivePermissions.length - 3}`} size="small"/>)}
                      </material_1.Stack>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {role.inherits.length > 0 ? (<material_1.Stack direction="row" spacing={0.5}>
                          {role.inherits.map((inherited) => (<material_1.Chip key={inherited} label={inherited} size="small" variant="outlined" color="secondary"/>))}
                        </material_1.Stack>) : (<material_1.Typography variant="caption" color="textSecondary">
                          None
                        </material_1.Typography>)}
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Typography variant="body2">
                        {formatDate(role.createdAt)}
                      </material_1.Typography>
                    </material_1.TableCell>
                    <material_1.TableCell align="right">
                      <material_1.Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <material_1.Tooltip title="View Permissions">
                          <material_1.IconButton size="small" onClick={() => handleViewPermissions(role)}>
                            <icons_material_1.Visibility fontSize="small"/>
                          </material_1.IconButton>
                        </material_1.Tooltip>
                        {canEdit && !role.isBuiltIn && (<material_1.Tooltip title="Edit Role">
                            <material_1.IconButton size="small" onClick={() => handleEditRole(role)}>
                              <icons_material_1.Edit fontSize="small"/>
                            </material_1.IconButton>
                          </material_1.Tooltip>)}
                        {canDelete && !role.isBuiltIn && (<material_1.Tooltip title="Delete Role">
                            <material_1.IconButton size="small" color="error" onClick={() => setDeleteConfirm(role)}>
                              <icons_material_1.Delete fontSize="small"/>
                            </material_1.IconButton>
                          </material_1.Tooltip>)}
                      </material_1.Stack>
                    </material_1.TableCell>
                  </material_1.TableRow>)))}
            </material_1.TableBody>
          </material_1.Table>)}
      </material_1.TableContainer>

      {/* Role Editor Dialog */}
      <RoleEditor_1.default open={showRoleEditor} role={editingRole} permissions={permissions} permissionCategories={permissionCategories} availableRoles={roles.filter((r) => r.isBuiltIn || r.id !== editingRole?.id)} onClose={handleCloseRoleEditor} onSubmit={handleRoleEditorSubmit} loading={loading}/>

      {/* Permission Matrix Dialog */}
      {viewingRole && (<PermissionMatrix_1.default open={showPermissionMatrix} role={viewingRole} permissions={permissions} permissionCategories={permissionCategories} onClose={handleClosePermissionMatrix}/>)}

      {/* Delete Confirmation Dialog */}
      <material_1.Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <material_1.DialogTitle>Confirm Delete</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Are you sure you want to delete the role <strong>{deleteConfirm?.displayName}</strong>?
            Users assigned to this role will lose its permissions.
          </material_1.DialogContentText>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDeleteConfirm(null)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete Role
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
