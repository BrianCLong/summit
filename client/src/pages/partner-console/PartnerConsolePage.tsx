import React, { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';
import { PartnerBillingPanel } from './billing/PartnerBillingPanel';

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
    settings: Record<string, any>;
    config: Record<string, any>;
    status: string;
  };
  receipt?: Receipt;
  error?: string;
}

const defaultSettings = {
  theme: 'light',
  mfaEnforced: false,
};

export default function PartnerConsolePage() {
  const { user, hasPermission, hasRole } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>(defaultSettings);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    residency: 'US',
  });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const tenantId = useMemo(
    () => user?.tenantId || (user as any)?.tenant_id || 'tenant-demo',
    [user],
  );

  const canManage = useMemo(
    () => hasPermission?.('manage_settings') || hasRole?.('ADMIN'),
    [hasPermission, hasRole],
  );

  useEffect(() => {
    if (!tenantId) return;
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/settings`);
      const data: TenantSettingsResponse = await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Failed to load settings');
      }
      setSettings({
        theme: data.data.settings?.theme || 'light',
        mfaEnforced: Boolean(data.data.settings?.mfaEnforced),
      });
      if (data.receipt) setReceipt(data.receipt);
      setStatusMessage('');
    } catch (error: any) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    setStatusMessage('');
    setReceipt(null);
    try {
      setLoading(true);
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant');
      }
      setStatusMessage(`Tenant created: ${data.data.name}`);
      if (data.receipt) setReceipt(data.receipt);
    } catch (error: any) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    setStatusMessage('');
    setReceipt(null);
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }
      setStatusMessage('Settings updated');
      if (data.receipt) setReceipt(data.receipt);
    } catch (error: any) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setStatusMessage('');
    setReceipt(null);
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'admin-request' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disable tenant');
      }
      setStatusMessage('Tenant disabled');
      if (data.receipt) setReceipt(data.receipt);
    } catch (error: any) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!canManage) {
    return (
      <Box p={4}>
        <Alert severity="warning" data-testid="policy-block">
          You do not have permission to access the Partner Console.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Partner Console
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Manage tenant lifecycle with policy-backed actions. Actions are receipt-backed for auditability.
      </Typography>

      {statusMessage && (
        <Alert severity="info" sx={{ my: 2 }} data-testid="status-banner">
          {statusMessage}
        </Alert>
      )}

      {receipt && (
        <Card variant="outlined" sx={{ mb: 3 }} data-testid="receipt-card">
          <CardHeader title="Receipt" subheader={receipt.action} />
          <CardContent>
            <Typography variant="body2">ID: {receipt.id}</Typography>
            <Typography variant="body2">Hash: {receipt.hash}</Typography>
            <Typography variant="body2">Issued: {receipt.issuedAt}</Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Create Tenant" />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  value={createForm.name}
                  inputProps={{ 'data-testid': 'create-name' }}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
                <TextField
                  label="Slug"
                  value={createForm.slug}
                  inputProps={{ 'data-testid': 'create-slug' }}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  helperText="lowercase with hyphens"
                />
                <TextField
                  label="Residency"
                  value={createForm.residency}
                  inputProps={{ 'data-testid': 'create-residency' }}
                  onChange={(e) => setCreateForm({ ...createForm, residency: e.target.value })}
                />
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={handleCreateTenant}
                data-testid="create-tenant"
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Create Tenant'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Settings" subheader={`Tenant: ${tenantId}`} />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Theme"
                  value={settings.theme}
                  inputProps={{ 'data-testid': 'settings-theme' }}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                />
                <TextField
                  label="MFA Enforced"
                  value={String(settings.mfaEnforced)}
                  inputProps={{ 'data-testid': 'settings-mfa' }}
                  onChange={(e) =>
                    setSettings({ ...settings, mfaEnforced: e.target.value === 'true' })
                  }
                />
              </Stack>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={handleSettingsSave}
                data-testid="save-settings"
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Save Settings'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <PartnerBillingPanel tenantId={tenantId} />
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardHeader title="Lifecycle" />
            <Divider />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                Disable tenant access with audit receipt and policy enforcement.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                color="error"
                variant="contained"
                onClick={handleDisable}
                data-testid="disable-tenant"
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Disable Tenant'}
              </Button>
              <Button variant="outlined" onClick={loadSettings} data-testid="refresh-settings">
                Refresh
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
