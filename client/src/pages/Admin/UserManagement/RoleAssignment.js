"use strict";
/**
 * Role Assignment Component
 *
 * Dialog for managing role assignments for a user.
 * Shows current roles and allows assigning/revoking roles.
 *
 * SOC 2 Controls: CC6.1, CC7.2
 *
 * @module pages/Admin/UserManagement/RoleAssignment
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RoleAssignment;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useAdminRoles_1 = require("../../../hooks/useAdminRoles");
function RoleAssignment({ open, user, onClose, }) {
    const { roles, userRoles, loading, error, loadUserRoles, assignRoleToUser, revokeRoleFromUser, } = (0, useAdminRoles_1.useAdminRoles)();
    const [selectedRole, setSelectedRole] = (0, react_1.useState)('');
    const [expiresAt, setExpiresAt] = (0, react_1.useState)('');
    const [showExpiry, setShowExpiry] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (open && user) {
            loadUserRoles(user.id);
        }
    }, [open, user, loadUserRoles]);
    const handleAssignRole = async () => {
        if (!selectedRole)
            return;
        const result = await assignRoleToUser(user.id, selectedRole, showExpiry && expiresAt ? new Date(expiresAt).toISOString() : undefined);
        if (result) {
            setSelectedRole('');
            setExpiresAt('');
            setShowExpiry(false);
        }
    };
    const handleRevokeRole = async (roleId) => {
        await revokeRoleFromUser(user.id, roleId);
    };
    // Filter out roles the user already has
    const assignedRoleIds = new Set(userRoles.map((r) => r.roleId));
    const availableRoles = roles.filter((r) => !assignedRoleIds.has(r.id));
    const formatDate = (dateString) => {
        if (!dateString)
            return null;
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <material_1.DialogTitle>
        Manage Roles for {user.fullName}
      </material_1.DialogTitle>
      <material_1.DialogContent>
        {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </material_1.Alert>)}

        {loading && (<material_1.Box display="flex" justifyContent="center" p={3}>
            <material_1.CircularProgress />
          </material_1.Box>)}

        {!loading && (<material_1.Stack spacing={3}>
            {/* Current Roles */}
            <material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Current Roles
              </material_1.Typography>
              {userRoles.length === 0 ? (<material_1.Typography variant="body2" color="textSecondary">
                  No roles assigned
                </material_1.Typography>) : (<material_1.List dense>
                  {userRoles.map((assignment) => (<material_1.ListItem key={assignment.id} sx={{
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        mb: 1,
                    }}>
                      <material_1.ListItemText primary={<material_1.Stack direction="row" spacing={1} alignItems="center">
                            <material_1.Typography variant="body2" fontWeight={500}>
                              {assignment.roleName}
                            </material_1.Typography>
                            {!assignment.isActive && (<material_1.Chip label="Expired" size="small" color="error"/>)}
                          </material_1.Stack>} secondary={<material_1.Stack direction="row" spacing={1} alignItems="center">
                            <material_1.Typography variant="caption">
                              Granted: {formatDate(assignment.grantedAt)}
                            </material_1.Typography>
                            {assignment.expiresAt && (<>
                                <material_1.Typography variant="caption">|</material_1.Typography>
                                <material_1.Typography variant="caption" color="warning.main">
                                  Expires: {formatDate(assignment.expiresAt)}
                                </material_1.Typography>
                              </>)}
                          </material_1.Stack>}/>
                      <material_1.ListItemSecondaryAction>
                        <material_1.Tooltip title="Revoke Role">
                          <material_1.IconButton edge="end" size="small" onClick={() => handleRevokeRole(assignment.roleId)} color="error">
                            <icons_material_1.Delete fontSize="small"/>
                          </material_1.IconButton>
                        </material_1.Tooltip>
                      </material_1.ListItemSecondaryAction>
                    </material_1.ListItem>))}
                </material_1.List>)}
            </material_1.Box>

            <material_1.Divider />

            {/* Assign New Role */}
            <material_1.Box>
              <material_1.Typography variant="subtitle2" gutterBottom>
                Assign New Role
              </material_1.Typography>
              <material_1.Stack spacing={2}>
                <material_1.FormControl fullWidth size="small">
                  <material_1.InputLabel>Select Role</material_1.InputLabel>
                  <material_1.Select value={selectedRole} label="Select Role" onChange={(e) => setSelectedRole(e.target.value)}>
                    {availableRoles.length === 0 ? (<material_1.MenuItem disabled>
                        <em>All roles assigned</em>
                      </material_1.MenuItem>) : (availableRoles.map((role) => (<material_1.MenuItem key={role.id} value={role.id}>
                          <material_1.Stack>
                            <material_1.Typography variant="body2">
                              {role.displayName}
                              {role.isBuiltIn && (<material_1.Chip label="Built-in" size="small" variant="outlined" sx={{ ml: 1 }}/>)}
                            </material_1.Typography>
                            {role.description && (<material_1.Typography variant="caption" color="textSecondary">
                                {role.description}
                              </material_1.Typography>)}
                          </material_1.Stack>
                        </material_1.MenuItem>)))}
                  </material_1.Select>
                </material_1.FormControl>

                <material_1.Stack direction="row" spacing={1} alignItems="center">
                  <material_1.Button size="small" startIcon={<icons_material_1.Schedule />} onClick={() => setShowExpiry(!showExpiry)} color={showExpiry ? 'primary' : 'inherit'}>
                    {showExpiry ? 'Remove Expiry' : 'Set Expiry'}
                  </material_1.Button>
                </material_1.Stack>

                {showExpiry && (<material_1.TextField label="Expires At" type="datetime-local" size="small" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{
                    min: new Date().toISOString().slice(0, 16),
                }} helperText="Role will be automatically revoked after this date"/>)}

                <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={handleAssignRole} disabled={!selectedRole || loading} fullWidth>
                  Assign Role
                </material_1.Button>
              </material_1.Stack>
            </material_1.Box>

            {/* Role Info */}
            {selectedRole && (<material_1.Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Role Details
                </material_1.Typography>
                {(() => {
                    const role = roles.find((r) => r.id === selectedRole);
                    if (!role)
                        return null;
                    return (<material_1.Stack spacing={1}>
                      <material_1.Typography variant="body2">
                        <strong>Name:</strong> {role.displayName}
                      </material_1.Typography>
                      {role.description && (<material_1.Typography variant="body2">
                          <strong>Description:</strong> {role.description}
                        </material_1.Typography>)}
                      <material_1.Typography variant="body2">
                        <strong>Scope:</strong> {role.scope}
                      </material_1.Typography>
                      <material_1.Box>
                        <material_1.Typography variant="body2" gutterBottom>
                          <strong>Permissions:</strong>
                        </material_1.Typography>
                        <material_1.Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {role.effectivePermissions.slice(0, 8).map((perm) => (<material_1.Chip key={perm} label={perm} size="small" variant="outlined"/>))}
                          {role.effectivePermissions.length > 8 && (<material_1.Chip label={`+${role.effectivePermissions.length - 8} more`} size="small"/>)}
                        </material_1.Stack>
                      </material_1.Box>
                    </material_1.Stack>);
                })()}
              </material_1.Box>)}
          </material_1.Stack>)}
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose}>Close</material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
}
