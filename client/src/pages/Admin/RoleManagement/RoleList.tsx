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

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useAdminRoles } from '../../../hooks/useAdminRoles';
import { Role } from '../../../services/admin-api';
import RoleEditor from './RoleEditor';
import PermissionMatrix from './PermissionMatrix';

export default function RoleList() {
  const { hasPermission, hasRole } = useAuth() as {
    hasPermission: (perm: string) => boolean;
    hasRole: (role: string) => boolean;
  };

  const {
    roles,
    permissions,
    permissionCategories,
    loading,
    error,
    refreshRoles,
    createRole,
    updateRole,
    deleteRole,
  } = useAdminRoles();

  // UI State
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);

  // Check permissions
  const canCreate = hasRole('admin') || hasPermission('role:create');
  const canEdit = hasRole('admin') || hasPermission('role:update');
  const canDelete = hasRole('admin') || hasPermission('role:delete');

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleEditor(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowRoleEditor(true);
  };

  const handleViewPermissions = (role: Role) => {
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

  const handleRoleEditorSubmit = async (data: {
    name: string;
    displayName: string;
    description?: string;
    permissions: string[];
    inherits?: string[];
    scope?: 'full' | 'restricted' | 'readonly';
  }) => {
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
    } else {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getScopeColor = (scope: Role['scope']): ChipProps['color'] => {
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
    return (
      <Box p={3}>
        <Alert severity="error">Access Denied: Role management permission required.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" gutterBottom>
            Role Management
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Define custom roles and manage permission assignments
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshRoles}
            disabled={loading}
          >
            Refresh
          </Button>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateRole}
            >
              Create Role
            </Button>
          )}
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="primary">
              {roles.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Roles
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="secondary">
              {roles.filter((r) => r.isBuiltIn).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Built-in Roles
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="success.main">
              {roles.filter((r) => !r.isBuiltIn).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Custom Roles
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h3" color="info.main">
              {permissions.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Permissions
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Roles Table */}
      <TableContainer component={Paper} variant="outlined">
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}
        {!loading && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Inherits</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary" py={4}>
                      No roles found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SecurityIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={500}>
                            {role.displayName}
                          </Typography>
                        </Stack>
                        {role.description && (
                          <Typography variant="caption" color="textSecondary">
                            {role.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {role.isBuiltIn ? (
                        <Chip label="Built-in" size="small" variant="outlined" />
                      ) : (
                        <Chip label="Custom" size="small" color="primary" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.scope}
                        size="small"
                        color={getScopeColor(role.scope)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {role.effectivePermissions.slice(0, 3).map((perm) => (
                          <Chip
                            key={perm}
                            label={perm}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {role.effectivePermissions.length > 3 && (
                          <Chip
                            label={`+${role.effectivePermissions.length - 3}`}
                            size="small"
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {role.inherits.length > 0 ? (
                        <Stack direction="row" spacing={0.5}>
                          {role.inherits.map((inherited) => (
                            <Chip
                              key={inherited}
                              label={inherited}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(role.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Permissions">
                          <IconButton
                            size="small"
                            onClick={() => handleViewPermissions(role)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canEdit && !role.isBuiltIn && (
                          <Tooltip title="Edit Role">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRole(role)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && !role.isBuiltIn && (
                          <Tooltip title="Delete Role">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteConfirm(role)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Role Editor Dialog */}
      <RoleEditor
        open={showRoleEditor}
        role={editingRole}
        permissions={permissions}
        permissionCategories={permissionCategories}
        availableRoles={roles.filter((r) => r.isBuiltIn || r.id !== editingRole?.id)}
        onClose={handleCloseRoleEditor}
        onSubmit={handleRoleEditorSubmit}
        loading={loading}
      />

      {/* Permission Matrix Dialog */}
      {viewingRole && (
        <PermissionMatrix
          open={showPermissionMatrix}
          role={viewingRole}
          permissions={permissions}
          permissionCategories={permissionCategories}
          onClose={handleClosePermissionMatrix}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the role <strong>{deleteConfirm?.displayName}</strong>?
            Users assigned to this role will lose its permissions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
