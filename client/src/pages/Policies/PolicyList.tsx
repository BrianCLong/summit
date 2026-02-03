/**
 * Policy List Page
 *
 * Main page for viewing and managing governance policies.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module pages/Policies/PolicyList
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Menu,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as SimulateIcon,
  Send as SubmitIcon,
  Check as ApproveIcon,
  Publish as PublishIcon,
  History as HistoryIcon,
  MoreVert as MoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usePolicies, usePolicyOperations } from '../../hooks/usePolicies';
import { ManagedPolicy } from '../../services/policy-api';
import PolicyEditor from './PolicyEditor';

// ============================================================================
// Helper Functions
// ============================================================================

const getStatusColor = (status: ManagedPolicy['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'draft': return 'default';
    case 'pending_approval': return 'warning';
    case 'approved': return 'info';
    case 'active': return 'success';
    case 'deprecated': return 'secondary';
    case 'archived': return 'error';
    default: return 'default';
  }
};

const getCategoryColor = (category: ManagedPolicy['category']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (category) {
    case 'access': return 'primary';
    case 'data': return 'info';
    case 'export': return 'warning';
    case 'retention': return 'secondary';
    case 'compliance': return 'success';
    case 'operational': return 'default';
    case 'safety': return 'error';
    default: return 'default';
  }
};

const getActionColor = (action: ManagedPolicy['action']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (action) {
    case 'ALLOW': return 'success';
    case 'DENY': return 'error';
    case 'ESCALATE': return 'warning';
    case 'WARN': return 'info';
    default: return 'default';
  }
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ============================================================================
// Component
// ============================================================================

const PolicyList: React.FC = () => {
  // State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ManagedPolicy | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<ManagedPolicy | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [policyToSubmit, setPolicyToSubmit] = useState<ManagedPolicy | null>(null);
  const [submitReason, setSubmitReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [policyToApprove, setPolicyToApprove] = useState<ManagedPolicy | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; policy: ManagedPolicy } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Hooks
  const {
    policies,
    loading,
    error,
    pagination,
    filters,
    refresh,
    updateFilters,
    goToPage,
  } = usePolicies();

  const operations = usePolicyOperations();

  // Handlers
  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ search: event.target.value, page: 1 });
  }, [updateFilters]);

  const handleStatusFilter = useCallback((event: SelectChangeEvent<string>) => {
    const value = event.target.value as ManagedPolicy['status'] | '';
    updateFilters({ status: value || undefined, page: 1 });
  }, [updateFilters]);

  const handleCategoryFilter = useCallback((event: SelectChangeEvent<string>) => {
    const value = event.target.value as ManagedPolicy['category'] | '';
    updateFilters({ category: value || undefined, page: 1 });
  }, [updateFilters]);

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    goToPage(newPage + 1);
  }, [goToPage]);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ pageSize: parseInt(event.target.value, 10), page: 1 });
  }, [updateFilters]);

  const handleOpenEditor = useCallback((policy?: ManagedPolicy) => {
    setEditingPolicy(policy || null);
    setEditorOpen(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setEditingPolicy(null);
  }, []);

  const handleEditorSave = useCallback(() => {
    handleCloseEditor();
    refresh();
    setSnackbar({
      open: true,
      message: editingPolicy ? 'Policy updated successfully' : 'Policy created successfully',
      severity: 'success',
    });
  }, [handleCloseEditor, refresh, editingPolicy]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, policy: ManagedPolicy) => {
    setMenuAnchor({ el: event.currentTarget, policy });
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleDeleteClick = useCallback((policy: ManagedPolicy) => {
    setPolicyToDelete(policy);
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!policyToDelete) return;
    const success = await operations.deletePolicy(policyToDelete.id);
    setDeleteDialogOpen(false);
    setPolicyToDelete(null);
    if (success) {
      refresh();
      setSnackbar({ open: true, message: 'Policy archived successfully', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: operations.error || 'Failed to archive policy', severity: 'error' });
    }
  }, [policyToDelete, operations, refresh]);

  const handleSubmitClick = useCallback((policy: ManagedPolicy) => {
    setPolicyToSubmit(policy);
    setSubmitReason('');
    setSubmitDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleSubmitConfirm = useCallback(async () => {
    if (!policyToSubmit) return;
    const result = await operations.submitForApproval(policyToSubmit.id, submitReason);
    setSubmitDialogOpen(false);
    setPolicyToSubmit(null);
    setSubmitReason('');
    if (result) {
      refresh();
      setSnackbar({ open: true, message: 'Policy submitted for approval', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: operations.error || 'Failed to submit policy', severity: 'error' });
    }
  }, [policyToSubmit, submitReason, operations, refresh]);

  const handleApproveClick = useCallback((policy: ManagedPolicy) => {
    setPolicyToApprove(policy);
    setApproveNotes('');
    setApproveDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleApproveConfirm = useCallback(async () => {
    if (!policyToApprove) return;
    const result = await operations.approvePolicy(policyToApprove.id, approveNotes);
    setApproveDialogOpen(false);
    setPolicyToApprove(null);
    setApproveNotes('');
    if (result) {
      refresh();
      setSnackbar({ open: true, message: 'Policy approved', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: operations.error || 'Failed to approve policy', severity: 'error' });
    }
  }, [policyToApprove, approveNotes, operations, refresh]);

  const handlePublish = useCallback(async (policy: ManagedPolicy) => {
    handleMenuClose();
    const result = await operations.publishPolicy(policy.id);
    if (result) {
      refresh();
      setSnackbar({ open: true, message: 'Policy published successfully', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: operations.error || 'Failed to publish policy', severity: 'error' });
    }
  }, [operations, refresh, handleMenuClose]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Render
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Policy Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={refresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenEditor()}
          >
            Create Policy
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search policies..."
            value={filters.search || ''}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              onChange={handleStatusFilter}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="pending_approval">Pending Approval</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="deprecated">Deprecated</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category || ''}
              onChange={handleCategoryFilter}
              label="Category"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="access">Access</MenuItem>
              <MenuItem value="data">Data</MenuItem>
              <MenuItem value="export">Export</MenuItem>
              <MenuItem value="retention">Retention</MenuItem>
              <MenuItem value="compliance">Compliance</MenuItem>
              <MenuItem value="operational">Operational</MenuItem>
              <MenuItem value="safety">Safety</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No policies found. Create one to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {policy.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {policy.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={policy.category}
                        size="small"
                        color={getCategoryColor(policy.category)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={policy.action}
                        size="small"
                        color={getActionColor(policy.action)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={policy.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(policy.status)}
                      />
                    </TableCell>
                    <TableCell>{policy.priority}</TableCell>
                    <TableCell>v{policy.version}</TableCell>
                    <TableCell>{formatDate(policy.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditor(policy)}
                            disabled={policy.status === 'archived'}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Simulate">
                          <IconButton
                            size="small"
                            component="a"
                            href={`/policies/simulate?policyId=${policy.id}`}
                          >
                            <SimulateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, policy)}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={handleChangePage}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {menuAnchor?.policy.status === 'draft' && (
          <MenuItem onClick={() => handleSubmitClick(menuAnchor.policy)}>
            <SubmitIcon fontSize="small" sx={{ mr: 1 }} />
            Submit for Approval
          </MenuItem>
        )}
        {menuAnchor?.policy.status === 'pending_approval' && (
          <MenuItem onClick={() => handleApproveClick(menuAnchor.policy)}>
            <ApproveIcon fontSize="small" sx={{ mr: 1 }} />
            Approve
          </MenuItem>
        )}
        {menuAnchor?.policy.status === 'approved' && (
          <MenuItem onClick={() => handlePublish(menuAnchor.policy)}>
            <PublishIcon fontSize="small" sx={{ mr: 1 }} />
            Publish
          </MenuItem>
        )}
        <MenuItem disabled>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
          View History
        </MenuItem>
        {menuAnchor?.policy.status !== 'archived' && (
          <MenuItem onClick={() => handleDeleteClick(menuAnchor!.policy)}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
            Archive
          </MenuItem>
        )}
      </Menu>

      {/* Policy Editor Dialog */}
      <PolicyEditor
        open={editorOpen}
        policy={editingPolicy}
        onClose={handleCloseEditor}
        onSave={handleEditorSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Archive Policy</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to archive the policy "{policyToDelete?.displayName}"?
            This action can be reversed by an administrator.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={operations.loading}>
            {operations.loading ? <CircularProgress size={20} /> : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit for Approval Dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)}>
        <DialogTitle>Submit for Approval</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Submit "{policyToSubmit?.displayName}" for review and approval.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for submission"
            value={submitReason}
            onChange={(e) => setSubmitReason(e.target.value)}
            placeholder="Describe why this policy should be approved..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitConfirm} variant="contained" disabled={operations.loading}>
            {operations.loading ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>Approve Policy</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Approve "{policyToApprove?.displayName}" for publishing.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Approval notes (optional)"
            value={approveNotes}
            onChange={(e) => setApproveNotes(e.target.value)}
            placeholder="Add any notes about this approval..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApproveConfirm} variant="contained" color="success" disabled={operations.loading}>
            {operations.loading ? <CircularProgress size={20} /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PolicyList;
