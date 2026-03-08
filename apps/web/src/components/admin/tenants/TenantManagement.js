"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * CompanyOS Tenant Management Admin UI
 *
 * Admin interface for managing tenants, feature flags, and viewing audit logs.
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
exports.default = TenantManagement;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const react_2 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
const date_fns_1 = require("date-fns");
// ============================================================================
// GRAPHQL QUERIES & MUTATIONS
// ============================================================================
const GET_TENANTS = (0, client_1.gql) `
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
const GET_TENANT = (0, client_1.gql) `
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
const CREATE_TENANT = (0, client_1.gql) `
  mutation CreateTenant($input: CreateTenantInput!) {
    createTenant(input: $input) {
      id
      name
      slug
    }
  }
`;
const UPDATE_TENANT = (0, client_1.gql) `
  mutation UpdateTenant($id: ID!, $input: UpdateTenantInput!) {
    updateTenant(id: $id, input: $input) {
      id
      name
      status
    }
  }
`;
const DELETE_TENANT = (0, client_1.gql) `
  mutation DeleteTenant($id: ID!) {
    deleteTenant(id: $id)
  }
`;
const SET_FEATURE_FLAG = (0, client_1.gql) `
  mutation SetFeatureFlag($input: SetFeatureFlagInput!) {
    setFeatureFlag(input: $input) {
      id
      flagName
      enabled
    }
  }
`;
const GET_AUDIT_EVENTS = (0, client_1.gql) `
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
function TenantManagement() {
    const [page, setPage] = (0, react_1.useState)(0);
    const [rowsPerPage, setRowsPerPage] = (0, react_1.useState)(25);
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('');
    const [selectedTenant, setSelectedTenant] = (0, react_1.useState)(null);
    const [menuAnchorEl, setMenuAnchorEl] = (0, react_1.useState)(null);
    const [menuTenant, setMenuTenant] = (0, react_1.useState)(null);
    const [activeTab, setActiveTab] = (0, react_1.useState)(0);
    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = (0, react_1.useState)(false);
    const [editDialogOpen, setEditDialogOpen] = (0, react_1.useState)(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
    const [featuresDialogOpen, setFeaturesDialogOpen] = (0, react_1.useState)(false);
    const [auditDialogOpen, setAuditDialogOpen] = (0, react_1.useState)(false);
    // Form state
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        slug: '',
        description: '',
        dataRegion: 'us-east-1',
        classification: 'unclassified',
    });
    // Snackbar
    const [snackbar, setSnackbar] = (0, react_1.useState)({
        open: false,
        message: '',
        severity: 'success',
    });
    // Queries
    const { data, loading, refetch } = (0, react_2.useQuery)(GET_TENANTS, {
        variables: {
            status: statusFilter || undefined,
            limit: rowsPerPage,
            offset: page * rowsPerPage,
        },
    });
    const { data: tenantDetailData, refetch: refetchTenantDetail } = (0, react_2.useQuery)(GET_TENANT, {
        variables: { id: selectedTenant?.id },
        skip: !selectedTenant?.id,
    });
    const { data: auditData } = (0, react_2.useQuery)(GET_AUDIT_EVENTS, {
        variables: {
            filter: selectedTenant ? { tenantId: selectedTenant.id } : {},
            limit: 50,
        },
        skip: !auditDialogOpen,
    });
    // Mutations
    const [createTenant] = (0, react_2.useMutation)(CREATE_TENANT, {
        onCompleted: () => {
            showSnackbar('Tenant created successfully', 'success');
            setCreateDialogOpen(false);
            resetForm();
            refetch();
        },
        onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
    });
    const [updateTenant] = (0, react_2.useMutation)(UPDATE_TENANT, {
        onCompleted: () => {
            showSnackbar('Tenant updated successfully', 'success');
            setEditDialogOpen(false);
            refetch();
        },
        onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
    });
    const [deleteTenant] = (0, react_2.useMutation)(DELETE_TENANT, {
        onCompleted: () => {
            showSnackbar('Tenant archived successfully', 'success');
            setDeleteDialogOpen(false);
            refetch();
        },
        onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
    });
    const [setFeatureFlag] = (0, react_2.useMutation)(SET_FEATURE_FLAG, {
        onCompleted: () => {
            showSnackbar('Feature flag updated', 'success');
            refetchTenantDetail();
        },
        onError: (error) => showSnackbar(`Failed: ${error.message}`, 'error'),
    });
    // Helpers
    const showSnackbar = (message, severity) => {
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
    const handleMenuOpen = (event, tenant) => {
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
    const handleFeatureFlagToggle = (flagName, currentEnabled) => {
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
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'success';
            case 'suspended': return 'error';
            case 'pending': return 'warning';
            case 'archived': return 'default';
            default: return 'default';
        }
    };
    const getClassificationColor = (classification) => {
        switch (classification) {
            case 'top-secret': return 'error';
            case 'secret': return 'warning';
            case 'cui': return 'info';
            default: return 'default';
        }
    };
    return (<material_1.Box>
      {/* Header */}
      <material_1.Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <material_1.Typography variant="h5">Tenant Management</material_1.Typography>
        <material_1.Button variant="contained" startIcon={<icons_material_1.Add />} onClick={() => setCreateDialogOpen(true)}>
          Create Tenant
        </material_1.Button>
      </material_1.Box>

      {/* Filters */}
      <material_1.Paper sx={{ p: 2, mb: 3 }}>
        <material_1.Grid container spacing={2} alignItems="center">
          <material_1.Grid item xs={12} md={4}>
            <material_1.FormControl fullWidth size="small">
              <material_1.InputLabel>Status</material_1.InputLabel>
              <material_1.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <material_1.MenuItem value="">All Status</material_1.MenuItem>
                <material_1.MenuItem value="active">Active</material_1.MenuItem>
                <material_1.MenuItem value="pending">Pending</material_1.MenuItem>
                <material_1.MenuItem value="suspended">Suspended</material_1.MenuItem>
                <material_1.MenuItem value="archived">Archived</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>
          </material_1.Grid>
          <material_1.Grid item xs={12} md={8} sx={{ textAlign: 'right' }}>
            <material_1.Button startIcon={<icons_material_1.Refresh />} onClick={() => refetch()}>
              Refresh
            </material_1.Button>
          </material_1.Grid>
        </material_1.Grid>
      </material_1.Paper>

      {/* Tenants Table */}
      <material_1.TableContainer component={material_1.Paper}>
        <material_1.Table>
          <material_1.TableHead>
            <material_1.TableRow>
              <material_1.TableCell>Name</material_1.TableCell>
              <material_1.TableCell>Slug</material_1.TableCell>
              <material_1.TableCell>Region</material_1.TableCell>
              <material_1.TableCell>Classification</material_1.TableCell>
              <material_1.TableCell>Status</material_1.TableCell>
              <material_1.TableCell>Created</material_1.TableCell>
              <material_1.TableCell align="right">Actions</material_1.TableCell>
            </material_1.TableRow>
          </material_1.TableHead>
          <material_1.TableBody>
            {loading ? (<material_1.TableRow>
                <material_1.TableCell colSpan={7} align="center">Loading...</material_1.TableCell>
              </material_1.TableRow>) : tenants.length === 0 ? (<material_1.TableRow>
                <material_1.TableCell colSpan={7} align="center">No tenants found</material_1.TableCell>
              </material_1.TableRow>) : (tenants.map((tenant) => (<material_1.TableRow key={tenant.id} hover>
                  <material_1.TableCell>
                    <material_1.Typography variant="body2" fontWeight="medium">{tenant.name}</material_1.Typography>
                    {tenant.description && (<material_1.Typography variant="caption" color="textSecondary">{tenant.description}</material_1.Typography>)}
                  </material_1.TableCell>
                  <material_1.TableCell><code>{tenant.slug}</code></material_1.TableCell>
                  <material_1.TableCell>{tenant.dataRegion}</material_1.TableCell>
                  <material_1.TableCell>
                    <material_1.Chip label={tenant.classification} size="small" color={getClassificationColor(tenant.classification)}/>
                  </material_1.TableCell>
                  <material_1.TableCell>
                    <material_1.Chip label={tenant.status} size="small" color={getStatusColor(tenant.status)}/>
                  </material_1.TableCell>
                  <material_1.TableCell>{(0, date_fns_1.format)(new Date(tenant.createdAt), 'MMM d, yyyy')}</material_1.TableCell>
                  <material_1.TableCell align="right">
                    <material_1.IconButton size="small" onClick={(e) => handleMenuOpen(e, tenant)}>
                      <icons_material_1.MoreVert />
                    </material_1.IconButton>
                  </material_1.TableCell>
                </material_1.TableRow>)))}
          </material_1.TableBody>
        </material_1.Table>
        <material_1.TablePagination rowsPerPageOptions={[10, 25, 50]} component="div" count={totalCount} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
        }}/>
      </material_1.TableContainer>

      {/* Actions Menu */}
      <material_1.Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <material_1.MenuItem onClick={handleEdit}>
          <icons_material_1.Edit fontSize="small" sx={{ mr: 1 }}/> Edit
        </material_1.MenuItem>
        <material_1.MenuItem onClick={handleFeatures}>
          <icons_material_1.Flag fontSize="small" sx={{ mr: 1 }}/> Feature Flags
        </material_1.MenuItem>
        <material_1.MenuItem onClick={handleAudit}>
          <icons_material_1.History fontSize="small" sx={{ mr: 1 }}/> Audit Log
        </material_1.MenuItem>
        <material_1.Divider />
        <material_1.MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <icons_material_1.Delete fontSize="small" sx={{ mr: 1 }}/> Archive
        </material_1.MenuItem>
      </material_1.Menu>

      {/* Create Tenant Dialog */}
      <material_1.Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Create Tenant</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Grid container spacing={2} sx={{ mt: 1 }}>
            <material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required/>
            </material_1.Grid>
            <material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} helperText="URL-friendly identifier (lowercase, hyphens only)" required/>
            </material_1.Grid>
            <material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2}/>
            </material_1.Grid>
            <material_1.Grid item xs={6}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Data Region</material_1.InputLabel>
                <material_1.Select value={formData.dataRegion} onChange={(e) => setFormData({ ...formData, dataRegion: e.target.value })} label="Data Region">
                  <material_1.MenuItem value="us-east-1">US East</material_1.MenuItem>
                  <material_1.MenuItem value="us-west-2">US West</material_1.MenuItem>
                  <material_1.MenuItem value="eu-west-1">EU West</material_1.MenuItem>
                  <material_1.MenuItem value="ap-southeast-1">Asia Pacific</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
            </material_1.Grid>
            <material_1.Grid item xs={6}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Classification</material_1.InputLabel>
                <material_1.Select value={formData.classification} onChange={(e) => setFormData({ ...formData, classification: e.target.value })} label="Classification">
                  <material_1.MenuItem value="unclassified">Unclassified</material_1.MenuItem>
                  <material_1.MenuItem value="cui">CUI</material_1.MenuItem>
                  <material_1.MenuItem value="secret">Secret</material_1.MenuItem>
                  <material_1.MenuItem value="top-secret">Top Secret</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
            </material_1.Grid>
          </material_1.Grid>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setCreateDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={() => createTenant({ variables: { input: formData } })} disabled={!formData.name || !formData.slug}>
            Create
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Edit Tenant Dialog */}
      <material_1.Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Edit Tenant</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Grid container spacing={2} sx={{ mt: 1 }}>
            <material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
            </material_1.Grid>
            <material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Slug" value={formData.slug} disabled helperText="Slug cannot be changed"/>
            </material_1.Grid>
            <material_1.Grid item xs={12}>
              <material_1.TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2}/>
            </material_1.Grid>
            <material_1.Grid item xs={6}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Data Region</material_1.InputLabel>
                <material_1.Select value={formData.dataRegion} onChange={(e) => setFormData({ ...formData, dataRegion: e.target.value })} label="Data Region">
                  <material_1.MenuItem value="us-east-1">US East</material_1.MenuItem>
                  <material_1.MenuItem value="us-west-2">US West</material_1.MenuItem>
                  <material_1.MenuItem value="eu-west-1">EU West</material_1.MenuItem>
                  <material_1.MenuItem value="ap-southeast-1">Asia Pacific</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
            </material_1.Grid>
            <material_1.Grid item xs={6}>
              <material_1.FormControl fullWidth>
                <material_1.InputLabel>Classification</material_1.InputLabel>
                <material_1.Select value={formData.classification} onChange={(e) => setFormData({ ...formData, classification: e.target.value })} label="Classification">
                  <material_1.MenuItem value="unclassified">Unclassified</material_1.MenuItem>
                  <material_1.MenuItem value="cui">CUI</material_1.MenuItem>
                  <material_1.MenuItem value="secret">Secret</material_1.MenuItem>
                  <material_1.MenuItem value="top-secret">Top Secret</material_1.MenuItem>
                </material_1.Select>
              </material_1.FormControl>
            </material_1.Grid>
          </material_1.Grid>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setEditDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={() => {
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
        }}>
            Save
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Delete Confirmation Dialog */}
      <material_1.Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Archive Tenant</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Alert severity="warning" sx={{ mb: 2 }}>
            This will archive the tenant and disable all access. This action can be reversed by a platform admin.
          </material_1.Alert>
          <material_1.Typography>
            Are you sure you want to archive <strong>{selectedTenant?.name}</strong>?
          </material_1.Typography>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDeleteDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" color="error" onClick={() => {
            if (selectedTenant) {
                deleteTenant({ variables: { id: selectedTenant.id } });
            }
        }}>
            Archive
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Feature Flags Dialog */}
      <material_1.Dialog open={featuresDialogOpen} onClose={() => setFeaturesDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Feature Flags - {selectedTenant?.name}</material_1.DialogTitle>
        <material_1.DialogContent>
          {tenantDetail?.features && (<material_1.Box>
              {FEATURE_FLAGS.map((flag) => {
                const currentFlag = tenantDetail.features.find((f) => f.flagName === flag.name);
                const isEnabled = currentFlag?.enabled ?? false;
                return (<material_1.Box key={flag.name} sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}>
                    <material_1.Box>
                      <material_1.Typography variant="body1">{flag.label}</material_1.Typography>
                      <material_1.Typography variant="caption" color="textSecondary">
                        {flag.description}
                      </material_1.Typography>
                    </material_1.Box>
                    <material_1.Switch checked={isEnabled} onChange={() => handleFeatureFlagToggle(flag.name, isEnabled)} color="primary"/>
                  </material_1.Box>);
            })}
            </material_1.Box>)}
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setFeaturesDialogOpen(false)}>Close</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Audit Log Dialog */}
      <material_1.Dialog open={auditDialogOpen} onClose={() => setAuditDialogOpen(false)} maxWidth="md" fullWidth>
        <material_1.DialogTitle>Audit Log - {selectedTenant?.name}</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.TableContainer>
            <material_1.Table size="small">
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Timestamp</material_1.TableCell>
                  <material_1.TableCell>Event</material_1.TableCell>
                  <material_1.TableCell>Action</material_1.TableCell>
                  <material_1.TableCell>Actor</material_1.TableCell>
                  <material_1.TableCell>Resource</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {auditEvents.length === 0 ? (<material_1.TableRow>
                    <material_1.TableCell colSpan={5} align="center">No audit events found</material_1.TableCell>
                  </material_1.TableRow>) : (auditEvents.map((event) => (<material_1.TableRow key={event.id}>
                      <material_1.TableCell>{(0, date_fns_1.format)(new Date(event.createdAt), 'MMM d, HH:mm:ss')}</material_1.TableCell>
                      <material_1.TableCell>{event.eventType}</material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Chip label={event.action} size="small"/>
                      </material_1.TableCell>
                      <material_1.TableCell>{event.actorEmail || event.actorId || '-'}</material_1.TableCell>
                      <material_1.TableCell>
                        {event.resourceType}
                        {event.resourceId && `: ${event.resourceId}`}
                      </material_1.TableCell>
                    </material_1.TableRow>)))}
              </material_1.TableBody>
            </material_1.Table>
          </material_1.TableContainer>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setAuditDialogOpen(false)}>Close</material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Snackbar */}
      <material_1.Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <material_1.Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </material_1.Alert>
      </material_1.Snackbar>
    </material_1.Box>);
}
