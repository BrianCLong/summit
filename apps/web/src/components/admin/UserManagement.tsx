import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Menu,
  Alert,
  Snackbar,
  Typography,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  PlayArrow as PlayArrowIcon,
  VpnKey as VpnKeyIcon,
  PersonAdd as ImpersonateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';
import { format } from 'date-fns';

// ============================================================================
// GRAPHQL
// ============================================================================

const SEARCH_USERS = gql`
  query SearchUsers($filters: UserSearchFilters, $first: Int, $after: String) {
    users(filters: $filters, first: $first, after: $after) {
      edges {
        node {
          id
          email
          username
          firstName
          lastName
          fullName
          role
          isActive
          isSuspended
          suspensionReason
          lastLogin
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      fullName
      role
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      fullName
      role
      isActive
    }
  }
`;

const SUSPEND_USER = gql`
  mutation SuspendUser($input: SuspendUserInput!) {
    suspendUser(input: $input) {
      id
      isSuspended
      suspensionReason
    }
  }
`;

const UNSUSPEND_USER = gql`
  mutation UnsuspendUser($userId: ID!, $reason: String!) {
    unsuspendUser(userId: $userId, reason: $reason) {
      id
      isSuspended
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!, $reason: String!) {
    deleteUser(id: $id, reason: $reason)
  }
`;

const RESET_PASSWORD = gql`
  mutation ResetUserPassword($userId: ID!) {
    resetUserPassword(userId: $userId)
  }
`;

const START_IMPERSONATION = gql`
  mutation StartImpersonation($input: ImpersonateUserInput!) {
    startImpersonation(input: $input) {
      id
      targetUser {
        id
        email
      }
      startedAt
    }
  }
`;

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  lastLogin?: string;
  createdAt: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function UserManagement() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Form states
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [impersonateReason, setImpersonateReason] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Queries and mutations
  const { data, loading, refetch } = useQuery(SEARCH_USERS, {
    variables: {
      filters: {
        query: searchQuery || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        isSuspended: statusFilter === 'suspended' ? true : undefined,
      },
      first: rowsPerPage,
      after: page > 0 ? btoa(String(page * rowsPerPage)) : undefined,
    },
  });

  const [createUser] = useMutation(CREATE_USER, {
    onCompleted: () => {
      showSnackbar('User created successfully', 'success');
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      showSnackbar(`Failed to create user: ${error.message}`, 'error');
    },
  });

  const [updateUser] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      showSnackbar('User updated successfully', 'success');
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      showSnackbar(`Failed to update user: ${error.message}`, 'error');
    },
  });

  const [suspendUser] = useMutation(SUSPEND_USER, {
    onCompleted: () => {
      showSnackbar('User suspended successfully', 'success');
      setSuspendDialogOpen(false);
      setSuspendReason('');
      refetch();
    },
    onError: (error) => {
      showSnackbar(`Failed to suspend user: ${error.message}`, 'error');
    },
  });

  const [unsuspendUser] = useMutation(UNSUSPEND_USER, {
    onCompleted: () => {
      showSnackbar('User unsuspended successfully', 'success');
      refetch();
    },
    onError: (error) => {
      showSnackbar(`Failed to unsuspend user: ${error.message}`, 'error');
    },
  });

  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => {
      showSnackbar('User deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setDeleteReason('');
      refetch();
    },
    onError: (error) => {
      showSnackbar(`Failed to delete user: ${error.message}`, 'error');
    },
  });

  const [resetPassword] = useMutation(RESET_PASSWORD, {
    onCompleted: (data) => {
      setTempPassword(data.resetUserPassword);
      showSnackbar('Password reset successfully', 'success');
    },
    onError: (error) => {
      showSnackbar(`Failed to reset password: ${error.message}`, 'error');
    },
  });

  const [startImpersonation] = useMutation(START_IMPERSONATION, {
    onCompleted: () => {
      showSnackbar('Impersonation started successfully', 'success');
      setImpersonateDialogOpen(false);
      setImpersonateReason('');
    },
    onError: (error) => {
      showSnackbar(`Failed to start impersonation: ${error.message}`, 'error');
    },
  });

  // Event handlers
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuUser(null);
  };

  const handleEdit = () => {
    setSelectedUser(menuUser);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleSuspend = () => {
    setSelectedUser(menuUser);
    setSuspendDialogOpen(true);
    handleMenuClose();
  };

  const handleUnsuspend = () => {
    if (menuUser) {
      unsuspendUser({
        variables: {
          userId: menuUser.id,
          reason: 'Admin unsuspend',
        },
      });
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setSelectedUser(menuUser);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleResetPassword = () => {
    if (menuUser) {
      resetPassword({ variables: { userId: menuUser.id } });
      setPasswordResetDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleImpersonate = () => {
    setSelectedUser(menuUser);
    setImpersonateDialogOpen(true);
    handleMenuClose();
  };

  const users = data?.users?.edges?.map((edge: any) => edge.node) || [];
  const totalCount = data?.users?.totalCount || 0;

  return (
    <Box>
      {/* Header and Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add User
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by name, email, or username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Role">
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="ANALYST">Analyst</MenuItem>
                <MenuItem value="VIEWER">Viewer</MenuItem>
                <MenuItem value="MODERATOR">Moderator</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button startIcon={<RefreshIcon />} onClick={() => refetch()}>
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: User) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      color={user.role === 'ADMIN' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {user.isSuspended ? (
                      <Chip label="Suspended" size="small" color="error" />
                    ) : user.isActive ? (
                      <Chip label="Active" size="small" color="success" />
                    ) : (
                      <Chip label="Inactive" size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, yyyy') : 'Never'}
                  </TableCell>
                  <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, user)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        {menuUser?.isSuspended ? (
          <MenuItem onClick={handleUnsuspend}>
            <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} /> Unsuspend
          </MenuItem>
        ) : (
          <MenuItem onClick={handleSuspend}>
            <BlockIcon fontSize="small" sx={{ mr: 1 }} /> Suspend
          </MenuItem>
        )}
        <MenuItem onClick={handleResetPassword}>
          <VpnKeyIcon fontSize="small" sx={{ mr: 1 }} /> Reset Password
        </MenuItem>
        <MenuItem onClick={handleImpersonate}>
          <ImpersonateIcon fontSize="small" sx={{ mr: 1 }} /> Impersonate
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Suspend User</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Suspend {selectedUser?.fullName} ({selectedUser?.email})?
          </Typography>
          <TextField
            fullWidth
            label="Reason"
            multiline
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedUser && suspendReason) {
                suspendUser({
                  variables: {
                    input: {
                      userId: selectedUser.id,
                      reason: suspendReason,
                    },
                  },
                });
              }
            }}
            disabled={!suspendReason}
          >
            Suspend
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will deactivate the user account. This cannot be undone easily.
          </Alert>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Delete {selectedUser?.fullName} ({selectedUser?.email})?
          </Typography>
          <TextField
            fullWidth
            label="Reason"
            multiline
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedUser && deleteReason) {
                deleteUser({
                  variables: {
                    id: selectedUser.id,
                    reason: deleteReason,
                  },
                });
              }
            }}
            disabled={!deleteReason}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog
        open={impersonateDialogOpen}
        onClose={() => setImpersonateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Impersonate User</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            All actions performed during impersonation will be logged for audit purposes.
          </Alert>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Impersonate {selectedUser?.fullName} ({selectedUser?.email})?
          </Typography>
          <TextField
            fullWidth
            label="Reason"
            multiline
            rows={2}
            value={impersonateReason}
            onChange={(e) => setImpersonateReason(e.target.value)}
            required
            helperText="Required for audit compliance"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpersonateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedUser && impersonateReason) {
                startImpersonation({
                  variables: {
                    input: {
                      targetUserId: selectedUser.id,
                      reason: impersonateReason,
                    },
                  },
                });
              }
            }}
            disabled={!impersonateReason}
          >
            Start Impersonation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog
        open={passwordResetDialogOpen}
        onClose={() => {
          setPasswordResetDialogOpen(false);
          setTempPassword('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Password Reset</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reset successfully
          </Alert>
          <TextField
            fullWidth
            label="Temporary Password"
            value={tempPassword}
            InputProps={{
              readOnly: true,
            }}
            helperText="Share this password securely with the user. They should change it upon next login."
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(tempPassword);
              showSnackbar('Password copied to clipboard', 'success');
            }}
          >
            Copy to Clipboard
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setPasswordResetDialogOpen(false);
              setTempPassword('');
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
