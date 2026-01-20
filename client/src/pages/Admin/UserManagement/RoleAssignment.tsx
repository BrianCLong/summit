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

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAdminRoles } from '../../../hooks/useAdminRoles';
import { ManagedUser } from '../../../services/admin-api';

interface RoleAssignmentProps {
  open: boolean;
  user: ManagedUser;
  onClose: () => void;
}

export default function RoleAssignment({
  open,
  user,
  onClose,
}: RoleAssignmentProps) {
  const {
    roles,
    userRoles,
    loading,
    error,
    loadUserRoles,
    assignRoleToUser,
    revokeRoleFromUser,
  } = useAdminRoles();

  const [selectedRole, setSelectedRole] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showExpiry, setShowExpiry] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadUserRoles(user.id);
    }
  }, [open, user, loadUserRoles]);

  const handleAssignRole = async () => {
    if (!selectedRole) return;

    const result = await assignRoleToUser(
      user.id,
      selectedRole,
      showExpiry && expiresAt ? new Date(expiresAt).toISOString() : undefined
    );

    if (result) {
      setSelectedRole('');
      setExpiresAt('');
      setShowExpiry(false);
    }
  };

  const handleRevokeRole = async (roleId: string) => {
    await revokeRoleFromUser(user.id, roleId);
  };

  // Filter out roles the user already has
  const assignedRoleIds = new Set(userRoles.map((r) => r.roleId));
  const availableRoles = roles.filter((r) => !assignedRoleIds.has(r.id));

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Manage Roles for {user.fullName}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <Stack spacing={3}>
            {/* Current Roles */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Current Roles
              </Typography>
              {userRoles.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No roles assigned
                </Typography>
              ) : (
                <List dense>
                  {userRoles.map((assignment) => (
                    <ListItem
                      key={assignment.id}
                      sx={{
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={500}>
                              {assignment.roleName}
                            </Typography>
                            {!assignment.isActive && (
                              <Chip label="Expired" size="small" color="error" />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption">
                              Granted: {formatDate(assignment.grantedAt)}
                            </Typography>
                            {assignment.expiresAt && (
                              <>
                                <Typography variant="caption">|</Typography>
                                <Typography variant="caption" color="warning.main">
                                  Expires: {formatDate(assignment.expiresAt)}
                                </Typography>
                              </>
                            )}
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Revoke Role">
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRevokeRole(assignment.roleId)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Divider />

            {/* Assign New Role */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Assign New Role
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Select Role"
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {availableRoles.length === 0 ? (
                      <MenuItem disabled>
                        <em>All roles assigned</em>
                      </MenuItem>
                    ) : (
                      availableRoles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          <Stack>
                            <Typography variant="body2">
                              {role.displayName}
                              {role.isBuiltIn && (
                                <Chip
                                  label="Built-in"
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            {role.description && (
                              <Typography variant="caption" color="textSecondary">
                                {role.description}
                              </Typography>
                            )}
                          </Stack>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    startIcon={<ScheduleIcon />}
                    onClick={() => setShowExpiry(!showExpiry)}
                    color={showExpiry ? 'primary' : 'inherit'}
                  >
                    {showExpiry ? 'Remove Expiry' : 'Set Expiry'}
                  </Button>
                </Stack>

                {showExpiry && (
                  <TextField
                    label="Expires At"
                    type="datetime-local"
                    size="small"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: new Date().toISOString().slice(0, 16),
                    }}
                    helperText="Role will be automatically revoked after this date"
                  />
                )}

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAssignRole}
                  disabled={!selectedRole || loading}
                  fullWidth
                >
                  Assign Role
                </Button>
              </Stack>
            </Box>

            {/* Role Info */}
            {selectedRole && (
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Role Details
                </Typography>
                {(() => {
                  const role = roles.find((r) => r.id === selectedRole);
                  if (!role) return null;
                  return (
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Name:</strong> {role.displayName}
                      </Typography>
                      {role.description && (
                        <Typography variant="body2">
                          <strong>Description:</strong> {role.description}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        <strong>Scope:</strong> {role.scope}
                      </Typography>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>Permissions:</strong>
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {role.effectivePermissions.slice(0, 8).map((perm) => (
                            <Chip key={perm} label={perm} size="small" variant="outlined" />
                          ))}
                          {role.effectivePermissions.length > 8 && (
                            <Chip
                              label={`+${role.effectivePermissions.length - 8} more`}
                              size="small"
                            />
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  );
                })()}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
