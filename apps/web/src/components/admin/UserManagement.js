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
exports.default = UserManagement;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_2 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
const date_fns_1 = require("date-fns");
// ============================================================================
// GRAPHQL
// ============================================================================
const SEARCH_USERS = (0, client_1.gql) `
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
const CREATE_USER = (0, client_1.gql) `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      fullName
      role
    }
  }
`;
const UPDATE_USER = (0, client_1.gql) `
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
const SUSPEND_USER = (0, client_1.gql) `
  mutation SuspendUser($input: SuspendUserInput!) {
    suspendUser(input: $input) {
      id
      isSuspended
      suspensionReason
    }
  }
`;
const UNSUSPEND_USER = (0, client_1.gql) `
  mutation UnsuspendUser($userId: ID!, $reason: String!) {
    unsuspendUser(userId: $userId, reason: $reason) {
      id
      isSuspended
    }
  }
`;
const DELETE_USER = (0, client_1.gql) `
  mutation DeleteUser($id: ID!, $reason: String!) {
    deleteUser(id: $id, reason: $reason)
  }
`;
const RESET_PASSWORD = (0, client_1.gql) `
  mutation ResetUserPassword($userId: ID!) {
    resetUserPassword(userId: $userId)
  }
`;
const START_IMPERSONATION = (0, client_1.gql) `
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
// COMPONENT
// ============================================================================
function UserManagement() {
    const [page, setPage] = (0, react_1.useState)(0);
    const [rowsPerPage, setRowsPerPage] = (0, react_1.useState)(25);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [roleFilter, setRoleFilter] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('');
    const [selectedUser, setSelectedUser] = (0, react_1.useState)(null);
    const [menuAnchorEl, setMenuAnchorEl] = (0, react_1.useState)(null);
    const [menuUser, setMenuUser] = (0, react_1.useState)(null);
    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = (0, react_1.useState)(false);
    const [editDialogOpen, setEditDialogOpen] = (0, react_1.useState)(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = (0, react_1.useState)(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
    const [impersonateDialogOpen, setImpersonateDialogOpen] = (0, react_1.useState)(false);
    const [passwordResetDialogOpen, setPasswordResetDialogOpen] = (0, react_1.useState)(false);
    // Snackbar
    const [snackbar, setSnackbar] = (0, react_1.useState)({
        open: false,
        message: '',
        severity: 'success',
    });
    // Form states
    const [suspendReason, setSuspendReason] = (0, react_1.useState)('');
    const [deleteReason, setDeleteReason] = (0, react_1.useState)('');
    const [impersonateReason, setImpersonateReason] = (0, react_1.useState)('');
    const [tempPassword, setTempPassword] = (0, react_1.useState)('');
    // Queries and mutations
    const { data, loading, refetch } = (0, react_2.useQuery)(SEARCH_USERS, {
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
    const [createUser] = (0, react_2.useMutation)(CREATE_USER, {
        onCompleted: () => {
            showSnackbar('User created successfully', 'success');
            setCreateDialogOpen(false);
            refetch();
        },
        onError: (error) => {
            showSnackbar(`Failed to create user: ${error.message}`, 'error');
        },
    });
    const [updateUser] = (0, react_2.useMutation)(UPDATE_USER, {
        onCompleted: () => {
            showSnackbar('User updated successfully', 'success');
            setEditDialogOpen(false);
            refetch();
        },
        onError: (error) => {
            showSnackbar(`Failed to update user: ${error.message}`, 'error');
        },
    });
    const [suspendUser] = (0, react_2.useMutation)(SUSPEND_USER, {
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
    const [unsuspendUser] = (0, react_2.useMutation)(UNSUSPEND_USER, {
        onCompleted: () => {
            showSnackbar('User unsuspended successfully', 'success');
            refetch();
        },
        onError: (error) => {
            showSnackbar(`Failed to unsuspend user: ${error.message}`, 'error');
        },
    });
    const [deleteUser] = (0, react_2.useMutation)(DELETE_USER, {
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
    const [resetPassword] = (0, react_2.useMutation)(RESET_PASSWORD, {
        onCompleted: (data) => {
            setTempPassword(data.resetUserPassword);
            showSnackbar('Password reset successfully', 'success');
        },
        onError: (error) => {
            showSnackbar(`Failed to reset password: ${error.message}`, 'error');
        },
    });
    const [startImpersonation] = (0, react_2.useMutation)(START_IMPERSONATION, {
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
    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };
    const handleMenuOpen = (event, user) => {
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
    const users = data?.users?.edges?.map((edge) => edge.node) || [];
    const totalCount = data?.users?.totalCount || 0;
    return (<material_1.Box>
      {/* Header and Actions */}
      <material_1.Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <material_1.Typography variant="h5">User Management</material_1.Typography>
        <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => setCreateDialogOpen(true)}>
          Add User
        </material_1.Button>
      </material_1.Box>

      {/* Filters */}
      <material_1.Paper sx={{ p: 2, mb: 3 }}>
        <material_1.Grid container spacing={2}>
          <material_1.Grid item xs={12} md={6}>
            <material_1.TextField fullWidth label="Search" placeholder="Search by name, email, or username" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                    <icons_material_1.Search />
                  </material_1.InputAdornment>),
        }}/>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={3}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Role</material_1.InputLabel>
              <material_1.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Role">
                <material_1.MenuItem value="">All Roles</material_1.MenuItem>
                <material_1.MenuItem value="ADMIN">Admin</material_1.MenuItem>
                <material_1.MenuItem value="ANALYST">Analyst</material_1.MenuItem>
                <material_1.MenuItem value="VIEWER">Viewer</material_1.MenuItem>
                <material_1.MenuItem value="MODERATOR">Moderator</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={3}>
            <material_1.FormControl fullWidth>
              <material_1.InputLabel>Status</material_1.InputLabel>
              <material_1.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <material_1.MenuItem value="">All Status</material_1.MenuItem>
                <material_1.MenuItem value="active">Active</material_1.MenuItem>
                <material_1.MenuItem value="inactive">Inactive</material_1.MenuItem>
                <material_1.MenuItem value="suspended">Suspended</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
          </material_1.Grid>
        </material_1.Grid>
        <material_1.Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <material_1.Button startIcon={<icons_material_1.Refresh />} onClick={() => refetch()}>
            Refresh
          </material_1.Button>
        </material_1.Box>
      </material_1.Paper>

      {/* Users Table */}
      <material_1.TableContainer component={material_1.Paper}>
        <material_1.Table>
          <material_1.TableHead>
            <material_1.TableRow>
              <material_1.TableCell>Name</material_1.TableCell>
              <material_1.TableCell>Email</material_1.TableCell>
              <material_1.TableCell>Role</material_1.TableCell>
              <material_1.TableCell>Status</material_1.TableCell>
              <material_1.TableCell>Last Login</material_1.TableCell>
              <material_1.TableCell>Created</material_1.TableCell>
              <material_1.TableCell align="right">Actions</material_1.TableCell>
            </material_1.TableRow>
          </material_1.TableHead>
          <material_1.TableBody>
            {loading ? (<material_1.TableRow>
                <material_1.TableCell colSpan={7} align="center">
                  Loading...
                </material_1.TableCell>
              </material_1.TableRow>) : users.length === 0 ? (<material_1.TableRow>
                <material_1.TableCell colSpan={7} align="center">
                  No users found
                </material_1.TableCell>
              </material_1.TableRow>) : (users.map((user) => (<material_1.TableRow key={user.id} hover>
                  <material_1.TableCell>{user.fullName}</material_1.TableCell>
                  <material_1.TableCell>{user.email}</material_1.TableCell>
                  <material_1.TableCell>
                    <material_1.Chip label={user.role} size="small" color={user.role === 'ADMIN' ? 'primary' : 'default'}/>
                  </material_1.TableCell>
                  <material_1.TableCell>
                    {user.isSuspended ? (<material_1.Chip label="Suspended" size="small" color="error"/>) : user.isActive ? (<material_1.Chip label="Active" size="small" color="success"/>) : (<material_1.Chip label="Inactive" size="small" color="default"/>)}
                  </material_1.TableCell>
                  <material_1.TableCell>
                    {user.lastLogin ? (0, date_fns_1.format)(new Date(user.lastLogin), 'MMM d, yyyy') : 'Never'}
                  </material_1.TableCell>
                  <material_1.TableCell>{(0, date_fns_1.format)(new Date(user.createdAt), 'MMM d, yyyy')}</material_1.TableCell>
                  <material_1.TableCell align="right">
                    <material_1.IconButton size="small" onClick={(e) => handleMenuOpen(e, user)}>
                      <icons_material_1.MoreVert />
                    </material_1.IconButton>
                  </material_1.TableCell>
                </material_1.TableRow>)))}
          </material_1.TableBody>
        </material_1.Table>
        <material_1.TablePagination rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={totalCount} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
        }}/>
      </material_1.TableContainer>

      {/* Actions Menu */}
      <material_1.Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <material_1.MenuItem onClick={handleEdit}>
          <icons_material_1.Edit fontSize="small" sx={{ mr: 1 }}/> Edit
        </material_1.MenuItem>
        {menuUser?.isSuspended ? (<material_1.MenuItem onClick={handleUnsuspend}>
            <icons_material_1.PlayArrow fontSize="small" sx={{ mr: 1 }}/> Unsuspend
          </material_1.MenuItem>) : (<material_1.MenuItem onClick={handleSuspend}>
            <icons_material_1.Block fontSize="small" sx={{ mr: 1 }}/> Suspend
          </material_1.MenuItem>)}
        <material_1.MenuItem onClick={handleResetPassword}>
          <icons_material_1.VpnKey fontSize="small" sx={{ mr: 1 }}/> Reset Password
        </material_1.MenuItem>
        <material_1.MenuItem onClick={handleImpersonate}>
          <icons_material_1.PersonAdd fontSize="small" sx={{ mr: 1 }}/> Impersonate
        </material_1.MenuItem>
        <material_1.MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <icons_material_1.Delete fontSize="small" sx={{ mr: 1 }}/> Delete
        </material_1.MenuItem>
      </material_1.Menu>

      {/* Suspend Dialog */}
      <material_1.Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Suspend User</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Suspend {selectedUser?.fullName} ({selectedUser?.email})?
          </material_1.Typography>
          <material_1.TextField fullWidth label="Reason" multiline rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} required/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setSuspendDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" color="error" onClick={() => {
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
        }} disabled={!suspendReason}>
            Suspend
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Delete Dialog */}
      <material_1.Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Delete User</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Alert severity="warning" sx={{ mb: 2 }}>
            This action will deactivate the user account. This cannot be undone easily.
          </material_1.Alert>
          <material_1.Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Delete {selectedUser?.fullName} ({selectedUser?.email})?
          </material_1.Typography>
          <material_1.TextField fullWidth label="Reason" multiline rows={3} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} required/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDeleteDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" color="error" onClick={() => {
            if (selectedUser && deleteReason) {
                deleteUser({
                    variables: {
                        id: selectedUser.id,
                        reason: deleteReason,
                    },
                });
            }
        }} disabled={!deleteReason}>
            Delete
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Impersonate Dialog */}
      <material_1.Dialog open={impersonateDialogOpen} onClose={() => setImpersonateDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Impersonate User</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Alert severity="warning" sx={{ mb: 2 }}>
            All actions performed during impersonation will be logged for audit purposes.
          </material_1.Alert>
          <material_1.Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Impersonate {selectedUser?.fullName} ({selectedUser?.email})?
          </material_1.Typography>
          <material_1.TextField fullWidth label="Reason" multiline rows={2} value={impersonateReason} onChange={(e) => setImpersonateReason(e.target.value)} required helperText="Required for audit compliance"/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setImpersonateDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={() => {
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
        }} disabled={!impersonateReason}>
            Start Impersonation
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Password Reset Dialog */}
      <material_1.Dialog open={passwordResetDialogOpen} onClose={() => {
            setPasswordResetDialogOpen(false);
            setTempPassword('');
        }} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Password Reset</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Alert severity="success" sx={{ mb: 2 }}>
            Password reset successfully
          </material_1.Alert>
          <material_1.TextField fullWidth label="Temporary Password" value={tempPassword} InputProps={{
            readOnly: true,
        }} helperText="Share this password securely with the user. They should change it upon next login."/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => {
            navigator.clipboard.writeText(tempPassword);
            showSnackbar('Password copied to clipboard', 'success');
        }}>
            Copy to Clipboard
          </material_1.Button>
          <material_1.Button variant="contained" onClick={() => {
            setPasswordResetDialogOpen(false);
            setTempPassword('');
        }}>
            Close
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Snackbar */}
      <material_1.Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <material_1.Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </material_1.Alert>
      </material_1.Snackbar>
    </material_1.Box>);
}
