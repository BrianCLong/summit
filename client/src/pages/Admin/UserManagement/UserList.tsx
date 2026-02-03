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

import React, { useState, useCallback } from 'react';
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
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { ManagedUser } from '../../../services/admin-api';
import UserForm from './UserForm';
import RoleAssignment from './RoleAssignment';

export default function UserList() {
  const { hasPermission, hasRole } = useAuth() as {
    hasPermission: (perm: string) => boolean;
    hasRole: (role: string) => boolean;
  };

  const {
    users,
    total,
    page,
    totalPages,
    loading,
    error,
    selectedUser,
    refresh,
    loadUser,
    setPage,
    setFilters,
    clearSelection,
    createUser,
    updateUser,
    deleteUser,
    lockUser,
    unlockUser,
  } = useAdminUsers();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ManagedUser | null>(null);
  const [lockDialog, setLockDialog] = useState<ManagedUser | null>(null);
  const [lockReason, setLockReason] = useState('');

  // Check permissions
  const canCreate = hasRole('admin') || hasPermission('user:create');
  const canEdit = hasRole('admin') || hasPermission('user:update');
  const canDelete = hasRole('admin') || hasPermission('user:delete');
  const canLock = hasRole('admin') || hasPermission('user:lock');
  const canAssignRoles = hasRole('admin') || hasPermission('role:assign');

  const handleSearch = useCallback(() => {
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

  const handleEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleCloseUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleUserFormSubmit = async (data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => {
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
    } else {
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

  const handleUnlock = async (user: ManagedUser) => {
    await unlockUser(user.id);
  };

  const handleOpenRoleAssignment = (user: ManagedUser) => {
    loadUser(user.id);
    setShowRoleAssignment(true);
  };

  const handleCloseRoleAssignment = () => {
    setShowRoleAssignment(false);
    clearSelection();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!hasRole('admin') && !hasPermission('user:read')) {
    return (
      <Box p={3}>
        <Alert severity="error">Access Denied: User management permission required.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage user accounts, roles, and access permissions
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          )}
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFilters({})}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search by name or email..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="analyst">Analyst</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={handleSearch}>
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Users Table */}
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
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>MFA</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary" py={4}>
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {user.fullName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === 'admin' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {user.isLocked ? (
                        <Tooltip title={user.lockReason || 'Account locked'}>
                          <Chip label="Locked" size="small" color="error" />
                        </Tooltip>
                      ) : user.isActive ? (
                        <Chip label="Active" size="small" color="success" />
                      ) : (
                        <Chip label="Inactive" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.mfaEnabled ? (
                        <Chip label="Enabled" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="Disabled" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.lastLogin)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {canAssignRoles && (
                          <Tooltip title="Manage Roles">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenRoleAssignment(user)}
                            >
                              <SecurityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={() => handleEditUser(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canLock && (
                          user.isLocked ? (
                            <Tooltip title="Unlock User">
                              <IconButton
                                size="small"
                                onClick={() => handleUnlock(user)}
                              >
                                <UnlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Lock User">
                              <IconButton
                                size="small"
                                onClick={() => setLockDialog(user)}
                              >
                                <LockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )
                        )}
                        {canDelete && (
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteConfirm(user)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="body2" color="textSecondary">
            Showing {users.length} of {total} users
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* User Form Dialog */}
      <UserForm
        open={showUserForm}
        user={editingUser}
        onClose={handleCloseUserForm}
        onSubmit={handleUserFormSubmit}
        loading={loading}
      />

      {/* Role Assignment Dialog */}
      {selectedUser && (
        <RoleAssignment
          open={showRoleAssignment}
          user={selectedUser}
          onClose={handleCloseRoleAssignment}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user <strong>{deleteConfirm?.fullName}</strong>?
            This will deactivate their account. Use hard delete for permanent removal.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lock User Dialog */}
      <Dialog open={!!lockDialog} onClose={() => setLockDialog(null)}>
        <DialogTitle>Lock User Account</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Lock account for <strong>{lockDialog?.fullName}</strong>?
            They will be unable to log in until unlocked.
          </DialogContentText>
          <TextField
            autoFocus
            label="Lock Reason"
            fullWidth
            value={lockReason}
            onChange={(e) => setLockReason(e.target.value)}
            placeholder="Enter reason for locking this account..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLockDialog(null); setLockReason(''); }}>
            Cancel
          </Button>
          <Button
            onClick={handleLockConfirm}
            color="warning"
            variant="contained"
            disabled={!lockReason.trim()}
          >
            Lock Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
