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
exports.default = PartnerConsolePage;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = material_1.Grid;
const AuthContext_jsx_1 = require("../../context/AuthContext.jsx");
const PartnerBillingPanel_1 = require("./billing/PartnerBillingPanel");
const defaultSettings = {
    theme: 'light',
    mfaEnforced: false,
};
function PartnerConsolePage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { user, hasPermission, hasRole } = (0, AuthContext_jsx_1.useAuth)();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [settings, setSettings] = (0, react_1.useState)(defaultSettings);
    const [createForm, setCreateForm] = (0, react_1.useState)({
        name: '',
        slug: '',
        residency: 'US',
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [tenantId, setTenantId] = (0, react_1.useState)('');
    const fetchSettings = async (id) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/tenants/${id}/settings`);
            const payload = await res.json();
            if (payload.success && payload.data) {
                setSettings(payload.data.settings || defaultSettings);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            console.error('Failed to fetch settings', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleUpdateSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/tenants/${tenantId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings }),
            });
            const payload = await res.json();
            if (!payload.success)
                throw new Error(payload.error || 'Update failed');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateTenant = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            const payload = await res.json();
            if (payload.success && payload.data) {
                setTenantId(payload.data.id);
                setCreateForm({ name: '', slug: '', residency: 'US' });
            }
            else {
                throw new Error(payload.error || 'Creation failed');
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    if (!hasRole('admin') && !hasPermission('manage_tenants')) {
        return (<material_1.Box p={3}>
        <material_1.Alert severity="error">Access Denied: Administrative privileges required.</material_1.Alert>
      </material_1.Box>);
    }
    return (<material_1.Box p={3}>
      <material_1.Box mb={4}>
        <material_1.Typography variant="h4" gutterBottom>
          Partner Console
        </material_1.Typography>
        <material_1.Typography variant="body1" color="textSecondary">
          Multi-tenant administration and lifecycle management
        </material_1.Typography>
      </material_1.Box>

      {error && (<material_1.Box mb={3}>
          <material_1.Alert severity="error" onClose={() => setError(null)}>
            {error}
          </material_1.Alert>
        </material_1.Box>)}

      {loading && (<material_1.Box display="flex" justifyContent="center" my={4}>
          <material_1.CircularProgress />
        </material_1.Box>)}

      <AnyGrid container spacing={3}>
        <AnyGrid xs={12} md={6}>
          <material_1.Card variant="outlined">
            <material_1.CardHeader title="Create Tenant"/>
            <material_1.CardContent>
              <material_1.Stack spacing={2}>
                <material_1.TextField label="Tenant Name" fullWidth value={createForm.name} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}/>
                <material_1.TextField label="Tenant Slug" fullWidth value={createForm.slug} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}/>
                <material_1.TextField label="Data Residency" fullWidth value={createForm.residency} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(e) => setCreateForm({ ...createForm, residency: e.target.value })}/>
              </material_1.Stack>
            </material_1.CardContent>
            <material_1.CardActions>
              <material_1.Button variant="contained" onClick={handleCreateTenant} disabled={loading || !createForm.name}>
                Create Tenant
              </material_1.Button>
            </material_1.CardActions>
          </material_1.Card>
        </AnyGrid>

        <AnyGrid xs={12} md={6}>
          <material_1.Card variant="outlined">
            <material_1.CardHeader title="Settings" subheader={`Tenant: ${tenantId}`}/>
            <material_1.CardContent>
              <material_1.Stack spacing={2}>
                <material_1.TextField label="Active Tenant ID" fullWidth value={tenantId} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(e) => setTenantId(e.target.value)}/>
                <material_1.TextField label="Configuration JSON" fullWidth multiline rows={4} value={JSON.stringify(settings, null, 2)} 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange={(e) => {
            try {
                setSettings(JSON.parse(e.target.value));
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            }
            catch (err) {
                // ignore parse errors during typing
            }
        }}/>
              </material_1.Stack>
            </material_1.CardContent>
            <material_1.CardActions>
              <material_1.Button variant="outlined" onClick={() => fetchSettings(tenantId)} disabled={!tenantId || loading}>
                Load
              </material_1.Button>
              <material_1.Button variant="contained" onClick={handleUpdateSettings} disabled={!tenantId || loading}>
                Save
              </material_1.Button>
            </material_1.CardActions>
          </material_1.Card>
        </AnyGrid>

        <AnyGrid xs={12}>
          <PartnerBillingPanel_1.PartnerBillingPanel tenantId={tenantId}/>
        </AnyGrid>

        <AnyGrid xs={12}>
          <material_1.Card variant="outlined">
            <material_1.CardHeader title="Lifecycle"/>
            <material_1.Divider />
            <material_1.CardContent>
              <material_1.Typography variant="body2" gutterBottom>
                Advanced lifecycle operations for tenant management.
              </material_1.Typography>
              <material_1.Typography variant="caption" color="error" display="block">
                Warning: These operations are destructive and generally permanent.
              </material_1.Typography>
            </material_1.CardContent>
            <material_1.CardActions>
              <material_1.Button color="error" variant="outlined" disabled={!tenantId}>
                Suspend Tenant
              </material_1.Button>
              <material_1.Button color="error" variant="contained" disabled={!tenantId}>
                Decommission
              </material_1.Button>
            </material_1.CardActions>
          </material_1.Card>
        </AnyGrid>
      </AnyGrid>
    </material_1.Box>);
}
