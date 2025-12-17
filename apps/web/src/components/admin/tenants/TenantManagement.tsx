/**
 * CompanyOS Tenant Management Admin UI
 *
 * Admin interface for managing tenants, feature flags, and viewing audit logs.
 */

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
  Menu,
  Alert,
  Snackbar,
  Typography,
  Grid,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Flag as FlagIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, gql } from '@apollo/client';
import { format } from 'date-fns';

// ============================================================================
// GRAPHQL QUERIES & MUTATIONS
// ============================================================================

const GET_TENANTS = gql`
  query GetTenants($status: TenantStatus, $limit: Int, $offset: Int) {
    tenants(status: $status, limit: $limit, offset: $offset) {
      tenants {
        id
        name
        slug
        description
        dataRegion
        classification
        status
        isActive
        createdAt
        updatedAt
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

const GET_TENANT = gql`
  query GetTenant($id: ID!) {
    tenant(id: $id) {
      id
      name
      slug
      description
      dataRegion
      classification
      status
      isActive
      settings
      createdAt
      updatedAt
      features {
        id
        flagName
        enabled
        config
      }
      effectiveFlags {
        aiCopilotAccess
        billingEnabled
        advancedAnalytics
        exportEnabled
        apiAccess
        ssoEnabled
        customBranding
        auditLogExport
      }
    }
  }
`;

const CREATE_TENANT = gql`
  mutation CreateTenant($input: CreateTenantInput!) {
    createTenant(input: $input) {
      id
      name
      slug
    }
  }
`;

const UPDATE_TENANT = gql`
  mutation UpdateTenant($id: ID!, $input: UpdateTenantInput!) {
    updateTenant(id: $id, input: $input) {
      id
      name
      status
    }
  }
`;

const DELETE_TENANT = gql`
  mutation DeleteTenant($id: ID!) {
    deleteTenant(id: $id)
  }
`;

const SET_FEATURE_FLAG = gql`
  mutation SetFeatureFlag($input: SetFeatureFlagInput!) {
    setFeatureFlag(input: $input) {
      id
      flagName
      enabled
    }
  }
`;

const GET_AUDIT_EVENTS = gql`
  query GetAuditEvents($filter: AuditEventFilter, $limit: Int, $offset: Int) {
    auditEvents(filter: $filter, limit: $limit, offset: $offset) {
      events {
        id
        tenantId
        eventType
        action
        actorId
        actorEmail
        resourceType
        resourceId
        changes
        createdAt
      }
      totalCount
    }
  }
`;

// ============================================================================
// TYPES
// ============================================================================

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  dataRegion: string;
  classification: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeatureFlag {
  id: string;
  flagName: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface AuditEvent {
  id: string;
  tenantId?: string;
  eventType: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  resourceType: string;
  resourceId?: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// FEATURE FLAGS CONFIG
// ============================================================================

const FEATURE_FLAGS = [
  { name: 'ai_copilot_access', label: 'AI Copilot Access', description: 'Enable AI assistant features' },
  { name: 'billing_enabled', label: 'Billing', description: 'Enable billing and invoicing' },
  { name: 'advanced_analytics', label: 'Advanced Analytics', description: 'Enable advanced analytics dashboards' },
  { name: 'export_enabled', label: 'Export', description: 'Allow data export functionality' },
  { name: 'api_access', label: 'API Access', description: 'Enable REST/GraphQL API access' },
  { name: 'sso_enabled', label: 'SSO', description: 'Enable single sign-on' },
  { name: 'custom_branding', label: 'Custom Branding', description: 'Allow custom logos and colors' },
  { name: 'audit_log_export', label: 'Audit Log Export', description: 'Allow audit log exports' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function TenantManagement() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTenant, setMenuTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    dataRegion: 'us-east-1',
    classification: 'unclassified',
  });

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

  // Queries
  const { data, loading, refetch } = useQuery(GET_TENANTS, {
    variables: {
      status: statusFilter || undefined,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    },
  });

  const { data: tenantDetailData, refetch: refetchTenantDetail } = useQuery(GET_TENANT, {
    variables: { id: selectedTenant?.id },
    skip: !selectedTenant?.id,
  });

  const { data: auditData } = useQuery(GET_AUDIT_EVENTS, {
    variables: {
      filter: selectedTenant ? { tenantId: selectedTenant.id } : {},
      limit: 50,
    },
    skip: !auditDialogOpen,
  });

  // Mutations
  const [createTenant] = useMutation(CREATE_TENANT, {
    onCompleted: () => {
      showSnackbar('Tenant created successfully', 'success');
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
  });

  const [updateTenant] = useMutation(UPDATE_TENANT, {
    onCompleted: () => {
      showSnackbar('Tenant updated successfully', 'success');
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
  });

  const [deleteTenant] = useMutation(DELETE_TENANT, {
    onCompleted: () => {
      showSnackbar('Tenant archived successfully', 'success');
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
  });

  const [setFeatureFlag] = useMutation(SET_FEATURE_FLAG, {
    onCompleted: () => {
      showSnackbar('Feature flag updated', 'success');
      refetchTenantDetail();
    },
    onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
  });

  // Helpers
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      dataRegion: 'us-east-1',
      classification: 'unclassified',
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, tenant: Tenant) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuTenant(tenant);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTenant(null);
  };

  const handleEdit = () => {
    if (menuTenant) {
      setSelectedTenant(menuTenant);
      setFormData({
        name: menuTenant.name,
        slug: menuTenant.slug,
        description: menuTenant.description || '',
        dataRegion: menuTenant.dataRegion,
        classification: menuTenant.classification,
      });
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setSelectedTenant(menuTenant);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleFeatures = () => {
    setSelectedTenant(menuTenant);
    setFeaturesDialogOpen(true);
    handleMenuClose();
  };

  const handleAudit = () => {
    setSelectedTenant(menuTenant);
    setAuditDialogOpen(true);
    handleMenuClose();
  };

  const handleFeatureFlagToggle = (flagName: string, currentEnabled: boolean) => {
    if (selectedTenant) {
      setFeatureFlag({
        variables: {
          input: {
            tenantId: selectedTenant.id,
            flagName,
            enabled: !currentEnabled,
          },
        },
      });
    }
  };

  const tenants = data?.tenants?.tenants || [];
  const totalCount = data?.tenants?.totalCount || 0;
  const tenantDetail = tenantDetailData?.tenant;
  const auditEvents = auditData?.auditEvents?.events || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'top-secret': return 'error';
      case 'secret': return 'warning';
      case 'cui': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Tenant Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Create Tenant
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8} sx={{ textAlign: 'right' }}>
            <Button startIcon={<RefreshIcon />} onClick={() => refetch()}>
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tenants Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No tenants found</TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant: Tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">{tenant.name}</Typography>
                    {tenant.description && (
                      <Typography variant="caption" color="textSecondary">{tenant.description}</Typography>
                    )}
                  </TableCell>
                  <TableCell><code>{tenant.slug}</code></TableCell>
                  <TableCell>{tenant.dataRegion}</TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.classification}
                      size="small"
                      color={getClassificationColor(tenant.classification) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.status}
                      size="small"
                      color={getStatusColor(tenant.status) as any}
                    />
                  </TableCell>
                  <TableCell>{format(new Date(tenant.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, tenant)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
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
        <MenuItem onClick={handleFeatures}>
          <FlagIcon fontSize="small" sx={{ mr: 1 }} /> Feature Flags
        </MenuItem>
        <MenuItem onClick={handleAudit}>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} /> Audit Log
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Archive
        </MenuItem>
      </Menu>

      {/* Create Tenant Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Tenant</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                helperText="URL-friendly identifier (lowercase, hyphens only)"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Data Region</InputLabel>
                <Select
                  value={formData.dataRegion}
                  onChange={(e) => setFormData({ ...formData, dataRegion: e.target.value })}
                  label="Data Region"
                >
                  <MenuItem value="us-east-1">US East</MenuItem>
                  <MenuItem value="us-west-2">US West</MenuItem>
                  <MenuItem value="eu-west-1">EU West</MenuItem>
                  <MenuItem value="ap-southeast-1">Asia Pacific</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  label="Classification"
                >
                  <MenuItem value="unclassified">Unclassified</MenuItem>
                  <MenuItem value="cui">CUI</MenuItem>
                  <MenuItem value="secret">Secret</MenuItem>
                  <MenuItem value="top-secret">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createTenant({ variables: { input: formData } })}
            disabled={!formData.name || !formData.slug}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Tenant</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Slug" value={formData.slug} disabled helperText="Slug cannot be changed" />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Data Region</InputLabel>
                <Select
                  value={formData.dataRegion}
                  onChange={(e) => setFormData({ ...formData, dataRegion: e.target.value })}
                  label="Data Region"
                >
                  <MenuItem value="us-east-1">US East</MenuItem>
                  <MenuItem value="us-west-2">US West</MenuItem>
                  <MenuItem value="eu-west-1">EU West</MenuItem>
                  <MenuItem value="ap-southeast-1">Asia Pacific</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  label="Classification"
                >
                  <MenuItem value="unclassified">Unclassified</MenuItem>
                  <MenuItem value="cui">CUI</MenuItem>
                  <MenuItem value="secret">Secret</MenuItem>
                  <MenuItem value="top-secret">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedTenant) {
                updateTenant({
                  variables: {
                    id: selectedTenant.id,
                    input: {
                      name: formData.name,
                      description: formData.description,
                      dataRegion: formData.dataRegion,
                      classification: formData.classification,
                    },
                  },
                });
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Archive Tenant</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will archive the tenant and disable all access. This action can be reversed by a platform admin.
          </Alert>
          <Typography>
            Are you sure you want to archive <strong>{selectedTenant?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedTenant) {
                deleteTenant({ variables: { id: selectedTenant.id } });
              }
            }}
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature Flags Dialog */}
      <Dialog open={featuresDialogOpen} onClose={() => setFeaturesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Feature Flags - {selectedTenant?.name}</DialogTitle>
        <DialogContent>
          {tenantDetail?.features && (
            <Box>
              {FEATURE_FLAGS.map((flag) => {
                const currentFlag = tenantDetail.features.find((f: FeatureFlag) => f.flagName === flag.name);
                const isEnabled = currentFlag?.enabled ?? false;

                return (
                  <Box
                    key={flag.name}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body1">{flag.label}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {flag.description}
                      </Typography>
                    </Box>
                    <Switch
                      checked={isEnabled}
                      onChange={() => handleFeatureFlagToggle(flag.name, isEnabled)}
                      color="primary"
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeaturesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={auditDialogOpen} onClose={() => setAuditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Log - {selectedTenant?.name}</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Resource</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No audit events found</TableCell>
                  </TableRow>
                ) : (
                  auditEvents.map((event: AuditEvent) => (
                    <TableRow key={event.id}>
                      <TableCell>{format(new Date(event.createdAt), 'MMM d, HH:mm:ss')}</TableCell>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell>
                        <Chip label={event.action} size="small" />
                      </TableCell>
                      <TableCell>{event.actorEmail || event.actorId || '-'}</TableCell>
                      <TableCell>
                        {event.resourceType}
                        {event.resourceId && `: ${event.resourceId}`}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
