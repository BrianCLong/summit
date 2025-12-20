import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import {
  Add,
  Delete,
  Key,
  PlayArrow,
  Refresh,
  Science,
  Timeline,
} from '@mui/icons-material';
import { WebhookAPI } from '../services/api';

const emptyForm = {
  url: '',
  event_types: '',
  secret: '',
};

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString();
}

function StatusChip({ status }) {
  const color = status === 'success' ? 'success' : status === 'pending' ? 'warning' : 'error';
  return <Chip label={status} color={color} size="small" sx={{ textTransform: 'capitalize' }} />;
}

function WebhookFormDialog({ open, onClose, onSave, initial }) {
  const [formData, setFormData] = useState(initial || emptyForm);

  useEffect(() => {
    setFormData(initial || emptyForm);
  }, [initial]);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = () => {
    const payload = {
      url: formData.url,
      event_types: (formData.event_types || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    };

    if (formData.secret) {
      payload.secret = formData.secret;
    }

    onSave(payload);
  };

  const isValid = formData.url && formData.event_types;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit Webhook' : 'Register Webhook'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Destination URL"
            value={formData.url}
            onChange={handleChange('url')}
            placeholder="https://example.com/webhook"
            fullWidth
          />
          <TextField
            label="Event Types"
            value={formData.event_types}
            onChange={handleChange('event_types')}
            helperText="Comma-separated list (e.g. incident.created, incident.closed)"
            fullWidth
          />
          <TextField
            label="Signing Secret (optional)"
            value={formData.secret}
            onChange={handleChange('secret')}
            helperText="Leave blank to generate a secure random secret"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid}>
          {initial ? 'Save Changes' : 'Create Webhook'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeliveryTable({ deliveries, onSelectDelivery }) {
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Recent Deliveries</Typography>
          <Tooltip title="Most recent first">
            <Timeline fontSize="small" color="action" />
          </Tooltip>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Attempts</TableCell>
              <TableCell>Last Attempt</TableCell>
              <TableCell>Next Retry</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow
                key={delivery.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onSelectDelivery(delivery)}
              >
                <TableCell>{delivery.event_type}</TableCell>
                <TableCell>
                  <StatusChip status={delivery.status} />
                </TableCell>
                <TableCell>{delivery.attempt_count || 0}</TableCell>
                <TableCell>{formatDate(delivery.last_attempt_at || delivery.updated_at)}</TableCell>
                <TableCell>{delivery.next_retry_at ? formatDate(delivery.next_retry_at) : '—'}</TableCell>
              </TableRow>
            ))}
            {deliveries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No deliveries yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AttemptTable({ attempts }) {
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Delivery Attempts</Typography>
          <Tooltip title="Includes retried deliveries">
            <Science fontSize="small" color="action" />
          </Tooltip>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Attempt</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>HTTP</TableCell>
              <TableCell>Duration (ms)</TableCell>
              <TableCell>Recorded At</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attempts.map((attempt) => (
              <TableRow key={attempt.id} hover>
                <TableCell>{attempt.attempt_number}</TableCell>
                <TableCell>
                  <StatusChip status={attempt.status} />
                </TableCell>
                <TableCell>{attempt.response_status || '—'}</TableCell>
                <TableCell>{attempt.duration_ms || '—'}</TableCell>
                <TableCell>{formatDate(attempt.created_at)}</TableCell>
                <TableCell sx={{ maxWidth: 260 }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {attempt.error_message || attempt.response_body?.slice(0, 120) || '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {attempts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No attempts recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function WebhookDashboard() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const data = await WebhookAPI.list();
      setWebhooks(data);
      if (selectedWebhook) {
        const refreshed = data.find((w) => w.id === selectedWebhook.id);
        setSelectedWebhook(refreshed || null);
      }
    } catch (error) {
      notify(`Failed to load webhooks: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (webhookId) => {
    try {
      const data = await WebhookAPI.deliveries(webhookId, { limit: 15 });
      setDeliveries(data);
    } catch (error) {
      notify(`Failed to load deliveries: ${error.message}`, 'error');
    }
  };

  const loadAttempts = async (webhookId, deliveryId) => {
    try {
      const data = await WebhookAPI.attempts(webhookId, { deliveryId, limit: 40 });
      setAttempts(data);
    } catch (error) {
      notify(`Failed to load attempts: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleSelectWebhook = async (webhook) => {
    setSelectedWebhook(webhook);
    await loadDeliveries(webhook.id);
    await loadAttempts(webhook.id);
  };

  const handleCreateOrUpdate = async (payload) => {
    setActionLoading(true);
    try {
      if (editingWebhook) {
        await WebhookAPI.update(editingWebhook.id, payload);
        notify('Webhook updated');
      } else {
        await WebhookAPI.create(payload);
        notify('Webhook registered');
      }
      setDialogOpen(false);
      setEditingWebhook(null);
      await loadWebhooks();
    } catch (error) {
      notify(`Save failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (webhook) => {
    setActionLoading(true);
    try {
      await WebhookAPI.remove(webhook.id);
      notify('Webhook deleted');
      setSelectedWebhook(null);
      await loadWebhooks();
    } catch (error) {
      notify(`Delete failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTest = async (webhook) => {
    setActionLoading(true);
    try {
      await WebhookAPI.testSingle(webhook.id, {
        eventType: 'webhook.test',
        payload: {
          type: 'webhook.test',
          preview: true,
          url: webhook.url,
          event_types: webhook.event_types,
        },
      });
      notify('Test delivery queued');
      await loadDeliveries(webhook.id);
    } catch (error) {
      notify(`Test failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcastTest = async () => {
    setActionLoading(true);
    try {
      await WebhookAPI.triggerTest({ eventType: 'webhook.test' });
      notify('Broadcast test queued to all active webhooks');
    } catch (error) {
      notify(`Broadcast failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (webhook, isActive) => {
    setActionLoading(true);
    try {
      await WebhookAPI.update(webhook.id, { is_active: isActive });
      notify(`Webhook ${isActive ? 'enabled' : 'disabled'}`);
      await loadWebhooks();
    } catch (error) {
      notify(`Update failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateSecret = async (webhook) => {
    setActionLoading(true);
    try {
      const generatedSecret = (crypto?.randomUUID?.() || `${Date.now()}`).replace(/-/g, '');
      await WebhookAPI.update(webhook.id, { secret: generatedSecret });
      notify('Signing secret rotated');
      await loadWebhooks();
    } catch (error) {
      notify(`Secret rotation failed: ${error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedEvents = useMemo(
    () => (selectedWebhook?.event_types || []).join(', '),
    [selectedWebhook]
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4">Webhook Management</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<Refresh />}
            onClick={loadWebhooks}
            disabled={loading || actionLoading}
            variant="outlined"
          >
            Refresh
          </Button>
          <Button
            startIcon={<PlayArrow />}
            onClick={handleBroadcastTest}
            disabled={actionLoading}
            variant="contained"
            color="secondary"
          >
            Broadcast Test
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => {
              setEditingWebhook(null);
              setDialogOpen(true);
            }}
          >
            Register Webhook
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Subscribers</Typography>
                {loading && <CircularProgress size={20} />}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                {webhooks.map((webhook) => (
                  <Card
                    key={webhook.id}
                    variant={selectedWebhook?.id === webhook.id ? 'outlined' : undefined}
                    sx={{
                      p: 1.5,
                      borderColor:
                        selectedWebhook?.id === webhook.id ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSelectWebhook(webhook)}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="subtitle1">{webhook.url}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            label={webhook.is_active ? 'Active' : 'Paused'}
                            color={webhook.is_active ? 'success' : 'default'}
                            size="small"
                          />
                          <Chip
                            label={`${webhook.event_types?.length || 0} events`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Rotate signing secret">
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRotateSecret(webhook);
                            }}
                          >
                            <Key fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Send test event">
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleTest(webhook);
                            }}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={webhook.is_active ? 'Pause delivery' : 'Resume delivery'}>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleActive(webhook, !webhook.is_active);
                            }}
                          >
                            <Refresh fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove webhook">
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(webhook);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
                {webhooks.length === 0 && !loading && (
                  <Alert severity="info">No webhooks registered yet.</Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          {selectedWebhook ? (
            <>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6">Subscriber Details</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setEditingWebhook({
                            ...selectedWebhook,
                            event_types: selectedEvents,
                          });
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => handleTest(selectedWebhook)}
                        disabled={actionLoading}
                      >
                        Send Test
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {selectedWebhook.url}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {(selectedWebhook.event_types || []).map((event) => (
                      <Chip key={event} label={event} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <DeliveryTable
                deliveries={deliveries}
                onSelectDelivery={(delivery) => loadAttempts(selectedWebhook.id, delivery.id)}
              />
              <AttemptTable attempts={attempts} />
            </>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select a webhook to view delivery history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the actions on the left to register subscribers, send signed test events, and inspect delivery attempts
                  with exponential backoff retries.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <WebhookFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreateOrUpdate}
        initial={editingWebhook}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {(actionLoading || loading) && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
          <CircularProgress size={32} />
        </Box>
      )}
    </Box>
  );
}
