import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Delete,
  HealthAndSafety,
  Refresh,
} from '@mui/icons-material';

type Server = {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  tags: string[];
};

export default function MCPRegistry() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', scopes: '', tags: '' });

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maestro/v1/mcp/servers');
      const data = await res.json();
      setServers(data);
    } catch (e) {
      console.error('Failed to load servers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const createServer = async () => {
    const body = {
      name: form.name.trim(),
      url: form.url.trim(),
      scopes: form.scopes.trim()
        ? form.scopes.split(',').map((s) => s.trim())
        : [],
      tags: form.tags.trim() ? form.tags.split(',').map((s) => s.trim()) : [],
    };
    const res = await fetch('/api/maestro/v1/mcp/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({ name: '', url: '', scopes: '', tags: '' });
      fetchServers();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Failed to create: ${err.error || res.statusText}`);
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('Delete this MCP server?')) return;
    const res = await fetch(`/api/maestro/v1/mcp/servers/${id}`, {
      method: 'DELETE',
    });
    if (res.status === 204) fetchServers();
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h5">MCP Server Registry</Typography>
        <Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchServers}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setDialogOpen(true)}
          >
            Add Server
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress />}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Scopes</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {servers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {s.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.scopes?.map((sc) => (
                        <Chip
                          key={sc}
                          size="small"
                          label={sc}
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {s.tags?.map((t) => (
                        <Chip
                          key={t}
                          size="small"
                          label={t}
                          color="default"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => deleteServer(s.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {servers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2">
                        No servers yet. Click "Add Server" to register one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Register MCP Server</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            margin="dense"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            fullWidth
            label="URL (ws:// or wss://)"
            margin="dense"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <TextField
            fullWidth
            label="Scopes (comma separated)"
            margin="dense"
            value={form.scopes}
            onChange={(e) => setForm({ ...form, scopes: e.target.value })}
          />
          <TextField
            fullWidth
            label="Tags (comma separated)"
            margin="dense"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createServer}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
