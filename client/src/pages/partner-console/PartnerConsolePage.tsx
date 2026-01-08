// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = Grid as any;
import { useAuth } from "../../context/AuthContext.jsx";
import { PartnerBillingPanel } from "./billing/PartnerBillingPanel";

interface Receipt {
  id: string;
  hash: string;
  issuedAt: string;
  action: string;
}

interface TenantSettingsResponse {
  success: boolean;
  data?: {
    id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: Record<string, any>;
    status: string;
  };
  receipt?: Receipt;
  error?: string;
}

const defaultSettings = {
  theme: "light",
  mfaEnforced: false,
};

export default function PartnerConsolePage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  const { user, hasPermission, hasRole } = useAuth() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<Record<string, any>>(defaultSettings);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    residency: "US",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>("");

  const fetchSettings = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/tenants/${id}/settings`);
      const payload: TenantSettingsResponse = await res.json();
      if (payload.success && payload.data) {
        setSettings(payload.data.settings || defaultSettings);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/tenants/${tenantId}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload: TenantSettingsResponse = await res.json();
      if (!payload.success) throw new Error(payload.error || "Update failed");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const payload: TenantSettingsResponse = await res.json();
      if (payload.success && payload.data) {
        setTenantId(payload.data.id);
        setCreateForm({ name: "", slug: "", residency: "US" });
      } else {
        throw new Error(payload.error || "Creation failed");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasRole("admin") && !hasPermission("manage_tenants")) {
    return (
      <Box p={3}>
        <Alert severity="error">Access Denied: Administrative privileges required.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Partner Console
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Multi-tenant administration and lifecycle management
        </Typography>
      </Box>

      {error && (
        <Box mb={3}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      <AnyGrid container spacing={3}>
        <AnyGrid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Create Tenant" />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Tenant Name"
                  fullWidth
                  value={createForm.name}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => setCreateForm({ ...createForm, name: e.target.value })}
                />
                <TextField
                  label="Tenant Slug"
                  fullWidth
                  value={createForm.slug}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => setCreateForm({ ...createForm, slug: e.target.value })}
                />
                <TextField
                  label="Data Residency"
                  fullWidth
                  value={createForm.residency}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => setCreateForm({ ...createForm, residency: e.target.value })}
                />
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={handleCreateTenant}
                disabled={loading || !createForm.name}
              >
                Create Tenant
              </Button>
            </CardActions>
          </Card>
        </AnyGrid>

        <AnyGrid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Settings" subheader={`Tenant: ${tenantId}`} />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Active Tenant ID"
                  fullWidth
                  value={tenantId}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => setTenantId(e.target.value)}
                />
                <TextField
                  label="Configuration JSON"
                  fullWidth
                  multiline
                  rows={4}
                  value={JSON.stringify(settings, null, 2)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => {
                    try {
                      setSettings(JSON.parse(e.target.value));
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (err) {
                      // ignore parse errors during typing
                    }
                  }}
                />
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                onClick={() => fetchSettings(tenantId)}
                disabled={!tenantId || loading}
              >
                Load
              </Button>
              <Button
                variant="contained"
                onClick={handleUpdateSettings}
                disabled={!tenantId || loading}
              >
                Save
              </Button>
            </CardActions>
          </Card>
        </AnyGrid>

        <AnyGrid xs={12}>
          <PartnerBillingPanel tenantId={tenantId} />
        </AnyGrid>

        <AnyGrid xs={12}>
          <Card variant="outlined">
            <CardHeader title="Lifecycle" />
            <Divider />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                Advanced lifecycle operations for tenant management.
              </Typography>
              <Typography variant="caption" color="error" display="block">
                Warning: These operations are destructive and generally permanent.
              </Typography>
            </CardContent>
            <CardActions>
              <Button color="error" variant="outlined" disabled={!tenantId}>
                Suspend Tenant
              </Button>
              <Button color="error" variant="contained" disabled={!tenantId}>
                Decommission
              </Button>
            </CardActions>
          </Card>
        </AnyGrid>
      </AnyGrid>
    </Box>
  );
}
