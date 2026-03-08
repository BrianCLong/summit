"use strict";
/**
 * Policy List Page
 *
 * Main page for viewing and managing governance policies.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module pages/Policies/PolicyList
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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const usePolicies_1 = require("../../hooks/usePolicies");
const PolicyEditor_1 = __importDefault(require("./PolicyEditor"));
// ============================================================================
// Helper Functions
// ============================================================================
const getStatusColor = (status) => {
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
const getCategoryColor = (category) => {
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
const getActionColor = (action) => {
    switch (action) {
        case 'ALLOW': return 'success';
        case 'DENY': return 'error';
        case 'ESCALATE': return 'warning';
        case 'WARN': return 'info';
        default: return 'default';
    }
};
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};
// ============================================================================
// Component
// ============================================================================
const PolicyList = () => {
    // State
    const [editorOpen, setEditorOpen] = (0, react_1.useState)(false);
    const [editingPolicy, setEditingPolicy] = (0, react_1.useState)(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
    const [policyToDelete, setPolicyToDelete] = (0, react_1.useState)(null);
    const [submitDialogOpen, setSubmitDialogOpen] = (0, react_1.useState)(false);
    const [policyToSubmit, setPolicyToSubmit] = (0, react_1.useState)(null);
    const [submitReason, setSubmitReason] = (0, react_1.useState)('');
    const [approveDialogOpen, setApproveDialogOpen] = (0, react_1.useState)(false);
    const [policyToApprove, setPolicyToApprove] = (0, react_1.useState)(null);
    const [approveNotes, setApproveNotes] = (0, react_1.useState)('');
    const [menuAnchor, setMenuAnchor] = (0, react_1.useState)(null);
    const [snackbar, setSnackbar] = (0, react_1.useState)({
        open: false,
        message: '',
        severity: 'success',
    });
    // Hooks
    const { policies, loading, error, pagination, filters, refresh, updateFilters, goToPage, } = (0, usePolicies_1.usePolicies)();
    const operations = (0, usePolicies_1.usePolicyOperations)();
    // Handlers
    const handleSearch = (0, react_1.useCallback)((event) => {
        updateFilters({ search: event.target.value, page: 1 });
    }, [updateFilters]);
    const handleStatusFilter = (0, react_1.useCallback)((event) => {
        const value = event.target.value;
        updateFilters({ status: value || undefined, page: 1 });
    }, [updateFilters]);
    const handleCategoryFilter = (0, react_1.useCallback)((event) => {
        const value = event.target.value;
        updateFilters({ category: value || undefined, page: 1 });
    }, [updateFilters]);
    const handleChangePage = (0, react_1.useCallback)((_, newPage) => {
        goToPage(newPage + 1);
    }, [goToPage]);
    const handleChangeRowsPerPage = (0, react_1.useCallback)((event) => {
        updateFilters({ pageSize: parseInt(event.target.value, 10), page: 1 });
    }, [updateFilters]);
    const handleOpenEditor = (0, react_1.useCallback)((policy) => {
        setEditingPolicy(policy || null);
        setEditorOpen(true);
    }, []);
    const handleCloseEditor = (0, react_1.useCallback)(() => {
        setEditorOpen(false);
        setEditingPolicy(null);
    }, []);
    const handleEditorSave = (0, react_1.useCallback)(() => {
        handleCloseEditor();
        refresh();
        setSnackbar({
            open: true,
            message: editingPolicy ? 'Policy updated successfully' : 'Policy created successfully',
            severity: 'success',
        });
    }, [handleCloseEditor, refresh, editingPolicy]);
    const handleMenuOpen = (0, react_1.useCallback)((event, policy) => {
        setMenuAnchor({ el: event.currentTarget, policy });
    }, []);
    const handleMenuClose = (0, react_1.useCallback)(() => {
        setMenuAnchor(null);
    }, []);
    const handleDeleteClick = (0, react_1.useCallback)((policy) => {
        setPolicyToDelete(policy);
        setDeleteDialogOpen(true);
        handleMenuClose();
    }, [handleMenuClose]);
    const handleDeleteConfirm = (0, react_1.useCallback)(async () => {
        if (!policyToDelete)
            return;
        const success = await operations.deletePolicy(policyToDelete.id);
        setDeleteDialogOpen(false);
        setPolicyToDelete(null);
        if (success) {
            refresh();
            setSnackbar({ open: true, message: 'Policy archived successfully', severity: 'success' });
        }
        else {
            setSnackbar({ open: true, message: operations.error || 'Failed to archive policy', severity: 'error' });
        }
    }, [policyToDelete, operations, refresh]);
    const handleSubmitClick = (0, react_1.useCallback)((policy) => {
        setPolicyToSubmit(policy);
        setSubmitReason('');
        setSubmitDialogOpen(true);
        handleMenuClose();
    }, [handleMenuClose]);
    const handleSubmitConfirm = (0, react_1.useCallback)(async () => {
        if (!policyToSubmit)
            return;
        const result = await operations.submitForApproval(policyToSubmit.id, submitReason);
        setSubmitDialogOpen(false);
        setPolicyToSubmit(null);
        setSubmitReason('');
        if (result) {
            refresh();
            setSnackbar({ open: true, message: 'Policy submitted for approval', severity: 'success' });
        }
        else {
            setSnackbar({ open: true, message: operations.error || 'Failed to submit policy', severity: 'error' });
        }
    }, [policyToSubmit, submitReason, operations, refresh]);
    const handleApproveClick = (0, react_1.useCallback)((policy) => {
        setPolicyToApprove(policy);
        setApproveNotes('');
        setApproveDialogOpen(true);
        handleMenuClose();
    }, [handleMenuClose]);
    const handleApproveConfirm = (0, react_1.useCallback)(async () => {
        if (!policyToApprove)
            return;
        const result = await operations.approvePolicy(policyToApprove.id, approveNotes);
        setApproveDialogOpen(false);
        setPolicyToApprove(null);
        setApproveNotes('');
        if (result) {
            refresh();
            setSnackbar({ open: true, message: 'Policy approved', severity: 'success' });
        }
        else {
            setSnackbar({ open: true, message: operations.error || 'Failed to approve policy', severity: 'error' });
        }
    }, [policyToApprove, approveNotes, operations, refresh]);
    const handlePublish = (0, react_1.useCallback)(async (policy) => {
        handleMenuClose();
        const result = await operations.publishPolicy(policy.id);
        if (result) {
            refresh();
            setSnackbar({ open: true, message: 'Policy published successfully', severity: 'success' });
        }
        else {
            setSnackbar({ open: true, message: operations.error || 'Failed to publish policy', severity: 'error' });
        }
    }, [operations, refresh, handleMenuClose]);
    const handleSnackbarClose = (0, react_1.useCallback)(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);
    // Render
    return (<material_1.Box sx={{ p: 3 }}>
      {/* Header */}
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <material_1.Typography variant="h4" component="h1">
          Policy Management
        </material_1.Typography>
        <material_1.Box sx={{ display: 'flex', gap: 1 }}>
          <material_1.Tooltip title="Refresh">
            <material_1.IconButton onClick={refresh} disabled={loading}>
              <icons_material_1.Refresh />
            </material_1.IconButton>
          </material_1.Tooltip>
          <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => handleOpenEditor()}>
            Create Policy
          </material_1.Button>
        </material_1.Box>
      </material_1.Box>

      {/* Error Alert */}
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}

      {/* Filters */}
      <material_1.Paper sx={{ p: 2, mb: 2 }}>
        <material_1.Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <material_1.TextField size="small" placeholder="Search policies..." value={filters.search || ''} onChange={handleSearch} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                  <icons_material_1.Search />
                </material_1.InputAdornment>),
        }} sx={{ minWidth: 250 }}/>
          <material_1.FormControl size="small" sx={{ minWidth: 150 }}>
            <material_1.InputLabel>Status</material_1.InputLabel>
            <material_1.Select value={filters.status || ''} onChange={handleStatusFilter} label="Status">
              <material_1.MenuItem value="">All</material_1.MenuItem>
              <material_1.MenuItem value="draft">Draft</material_1.MenuItem>
              <material_1.MenuItem value="pending_approval">Pending Approval</material_1.MenuItem>
              <material_1.MenuItem value="approved">Approved</material_1.MenuItem>
              <material_1.MenuItem value="active">Active</material_1.MenuItem>
              <material_1.MenuItem value="deprecated">Deprecated</material_1.MenuItem>
              <material_1.MenuItem value="archived">Archived</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>
          <material_1.FormControl size="small" sx={{ minWidth: 150 }}>
            <material_1.InputLabel>Category</material_1.InputLabel>
            <material_1.Select value={filters.category || ''} onChange={handleCategoryFilter} label="Category">
              <material_1.MenuItem value="">All</material_1.MenuItem>
              <material_1.MenuItem value="access">Access</material_1.MenuItem>
              <material_1.MenuItem value="data">Data</material_1.MenuItem>
              <material_1.MenuItem value="export">Export</material_1.MenuItem>
              <material_1.MenuItem value="retention">Retention</material_1.MenuItem>
              <material_1.MenuItem value="compliance">Compliance</material_1.MenuItem>
              <material_1.MenuItem value="operational">Operational</material_1.MenuItem>
              <material_1.MenuItem value="safety">Safety</material_1.MenuItem>
            </material_1.Select>
          </material_1.FormControl>
        </material_1.Box>
      </material_1.Paper>

      {/* Table */}
      <material_1.Paper>
        <material_1.TableContainer>
          <material_1.Table>
            <material_1.TableHead>
              <material_1.TableRow>
                <material_1.TableCell>Name</material_1.TableCell>
                <material_1.TableCell>Category</material_1.TableCell>
                <material_1.TableCell>Action</material_1.TableCell>
                <material_1.TableCell>Status</material_1.TableCell>
                <material_1.TableCell>Priority</material_1.TableCell>
                <material_1.TableCell>Version</material_1.TableCell>
                <material_1.TableCell>Updated</material_1.TableCell>
                <material_1.TableCell align="right">Actions</material_1.TableCell>
              </material_1.TableRow>
            </material_1.TableHead>
            <material_1.TableBody>
              {loading && policies.length === 0 ? (<material_1.TableRow>
                  <material_1.TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <material_1.CircularProgress />
                  </material_1.TableCell>
                </material_1.TableRow>) : policies.length === 0 ? (<material_1.TableRow>
                  <material_1.TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <material_1.Typography color="text.secondary">
                      No policies found. Create one to get started.
                    </material_1.Typography>
                  </material_1.TableCell>
                </material_1.TableRow>) : (policies.map((policy) => (<material_1.TableRow key={policy.id} hover>
                    <material_1.TableCell>
                      <material_1.Box>
                        <material_1.Typography variant="body2" fontWeight="medium">
                          {policy.displayName}
                        </material_1.Typography>
                        <material_1.Typography variant="caption" color="text.secondary">
                          {policy.name}
                        </material_1.Typography>
                      </material_1.Box>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Chip label={policy.category} size="small" color={getCategoryColor(policy.category)}/>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Chip label={policy.action} size="small" color={getActionColor(policy.action)}/>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Chip label={policy.status.replace('_', ' ')} size="small" color={getStatusColor(policy.status)}/>
                    </material_1.TableCell>
                    <material_1.TableCell>{policy.priority}</material_1.TableCell>
                    <material_1.TableCell>v{policy.version}</material_1.TableCell>
                    <material_1.TableCell>{formatDate(policy.updatedAt)}</material_1.TableCell>
                    <material_1.TableCell align="right">
                      <material_1.Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <material_1.Tooltip title="Edit">
                          <material_1.IconButton size="small" onClick={() => handleOpenEditor(policy)} disabled={policy.status === 'archived'}>
                            <icons_material_1.Edit fontSize="small"/>
                          </material_1.IconButton>
                        </material_1.Tooltip>
                        <material_1.Tooltip title="Simulate">
                          <material_1.IconButton size="small" component="a" href={`/policies/simulate?policyId=${policy.id}`}>
                            <icons_material_1.PlayArrow fontSize="small"/>
                          </material_1.IconButton>
                        </material_1.Tooltip>
                        <material_1.IconButton size="small" onClick={(e) => handleMenuOpen(e, policy)}>
                          <icons_material_1.MoreVert fontSize="small"/>
                        </material_1.IconButton>
                      </material_1.Box>
                    </material_1.TableCell>
                  </material_1.TableRow>)))}
            </material_1.TableBody>
          </material_1.Table>
        </material_1.TableContainer>
        <material_1.TablePagination component="div" count={pagination.total} page={pagination.page - 1} onPageChange={handleChangePage} rowsPerPage={pagination.pageSize} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 20, 50, 100]}/>
      </material_1.Paper>

      {/* Action Menu */}
      <material_1.Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {menuAnchor?.policy.status === 'draft' && (<material_1.MenuItem onClick={() => handleSubmitClick(menuAnchor.policy)}>
            <icons_material_1.Send fontSize="small" sx={{ mr: 1 }}/>
            Submit for Approval
          </material_1.MenuItem>)}
        {menuAnchor?.policy.status === 'pending_approval' && (<material_1.MenuItem onClick={() => handleApproveClick(menuAnchor.policy)}>
            <icons_material_1.Check fontSize="small" sx={{ mr: 1 }}/>
            Approve
          </material_1.MenuItem>)}
        {menuAnchor?.policy.status === 'approved' && (<material_1.MenuItem onClick={() => handlePublish(menuAnchor.policy)}>
            <icons_material_1.Publish fontSize="small" sx={{ mr: 1 }}/>
            Publish
          </material_1.MenuItem>)}
        <material_1.MenuItem disabled>
          <icons_material_1.History fontSize="small" sx={{ mr: 1 }}/>
          View History
        </material_1.MenuItem>
        {menuAnchor?.policy.status !== 'archived' && (<material_1.MenuItem onClick={() => handleDeleteClick(menuAnchor.policy)}>
            <icons_material_1.Delete fontSize="small" sx={{ mr: 1 }} color="error"/>
            Archive
          </material_1.MenuItem>)}
      </material_1.Menu>

      {/* Policy Editor Dialog */}
      <PolicyEditor_1.default open={editorOpen} policy={editingPolicy} onClose={handleCloseEditor} onSave={handleEditorSave}/>

      {/* Delete Confirmation Dialog */}
      <material_1.Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <material_1.DialogTitle>Archive Policy</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Are you sure you want to archive the policy "{policyToDelete?.displayName}"?
            This action can be reversed by an administrator.
          </material_1.DialogContentText>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDeleteDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleDeleteConfirm} color="error" disabled={operations.loading}>
            {operations.loading ? <material_1.CircularProgress size={20}/> : 'Archive'}
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Submit for Approval Dialog */}
      <material_1.Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)}>
        <material_1.DialogTitle>Submit for Approval</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText sx={{ mb: 2 }}>
            Submit "{policyToSubmit?.displayName}" for review and approval.
          </material_1.DialogContentText>
          <material_1.TextField fullWidth multiline rows={3} label="Reason for submission" value={submitReason} onChange={(e) => setSubmitReason(e.target.value)} placeholder="Describe why this policy should be approved..."/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setSubmitDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleSubmitConfirm} variant="contained" disabled={operations.loading}>
            {operations.loading ? <material_1.CircularProgress size={20}/> : 'Submit'}
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Approve Dialog */}
      <material_1.Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <material_1.DialogTitle>Approve Policy</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText sx={{ mb: 2 }}>
            Approve "{policyToApprove?.displayName}" for publishing.
          </material_1.DialogContentText>
          <material_1.TextField fullWidth multiline rows={3} label="Approval notes (optional)" value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="Add any notes about this approval..."/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setApproveDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleApproveConfirm} variant="contained" color="success" disabled={operations.loading}>
            {operations.loading ? <material_1.CircularProgress size={20}/> : 'Approve'}
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Snackbar */}
      <material_1.Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <material_1.Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </material_1.Alert>
      </material_1.Snackbar>
    </material_1.Box>);
};
exports.default = PolicyList;
