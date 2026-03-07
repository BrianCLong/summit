/**
 * Installed Plugins Page
 *
 * Plugin management dashboard with enable/disable controls.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration)
 *
 * @module pages/Plugins/InstalledPlugins
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Extension,
  Search,
  Settings,
  Delete,
  PlayArrow,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  HealthAndSafety,
} from "@mui/icons-material";
import {
  usePlugins,
  usePluginOperations,
  usePluginConfig,
  usePluginHealth,
} from "../../hooks/usePlugins";

// Plugin category colors
const categoryColors = {
  alerting: "error",
  notification: "info",
  integration: "primary",
  analytics: "secondary",
  automation: "success",
  security: "warning",
  compliance: "default",
  custom: "default",
};

// Plugin status colors
const statusColors = {
  registered: "default",
  installed: "info",
  enabled: "success",
  disabled: "warning",
  error: "error",
  deprecated: "default",
};

// Status icons
const StatusIcon = ({ status }) => {
  const icons = {
    enabled: <CheckCircle color="success" />,
    disabled: <Warning color="warning" />,
    error: <Error color="error" />,
    registered: <Info color="info" />,
    installed: <Info color="primary" />,
    deprecated: <Warning color="disabled" />,
  };
  return icons[status] || <Info />;
};

// Plugin Row Component
function PluginRow({ plugin, onConfigure, onToggle, onDelete, onExecute }) {
  const [toggling, setToggling] = useState(false);
  const { health, loading: healthLoading } = usePluginHealth(plugin.id);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(plugin.id, plugin.status !== "enabled");
    } finally {
      setToggling(false);
    }
  };

  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Extension color="primary" />
          <Box>
            <Typography variant="subtitle2">{plugin.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              v{plugin.version} by {plugin.author}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ maxWidth: 300 }} noWrap>
          {plugin.description}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={plugin.category}
          size="small"
          color={categoryColors[plugin.category] || "default"}
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StatusIcon status={plugin.status} />
          <Chip
            label={plugin.status}
            size="small"
            color={statusColors[plugin.status] || "default"}
            variant="outlined"
          />
        </Box>
      </TableCell>
      <TableCell>
        {healthLoading ? (
          <CircularProgress size={16} />
        ) : health?.healthy ? (
          <Tooltip title={health.message || "Healthy"}>
            <HealthAndSafety color="success" />
          </Tooltip>
        ) : (
          <Tooltip title={health?.message || "Unknown"}>
            <HealthAndSafety color="disabled" />
          </Tooltip>
        )}
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          <Tooltip title={plugin.status === "enabled" ? "Disable" : "Enable"}>
            <span>
              <Switch
                size="small"
                checked={plugin.status === "enabled"}
                onChange={handleToggle}
                disabled={toggling || plugin.status === "error"}
              />
            </span>
          </Tooltip>
          <Tooltip title="Execute Action">
            <IconButton
              size="small"
              onClick={() => onExecute(plugin)}
              disabled={plugin.status !== "enabled"}
            >
              <PlayArrow />
            </IconButton>
          </Tooltip>
          <Tooltip title="Configure">
            <IconButton size="small" onClick={() => onConfigure(plugin)}>
              <Settings />
            </IconButton>
          </Tooltip>
          <Tooltip title="Uninstall">
            <IconButton size="small" color="error" onClick={() => onDelete(plugin)}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

// Plugin Configuration Dialog
function PluginConfigDialog({ open, plugin, onClose, onSave }) {
  const { config, loading, error, saving, saveConfig } = usePluginConfig(plugin?.id);
  const [localConfig, setLocalConfig] = useState({});
  const [enabled, setEnabled] = useState(true);

  React.useEffect(() => {
    if (config) {
      setLocalConfig(config.config || {});
      setEnabled(config.enabled !== false);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await saveConfig(localConfig, enabled);
      onSave?.();
      onClose();
    } catch {
      // Error is handled by the hook
    }
  };

  if (!plugin) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Extension color="primary" />
          Configure: {plugin.name}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <LinearProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle1">Plugin Status</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2">{enabled ? "Enabled" : "Disabled"}</Typography>
                <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              </Box>
            </Box>

            <Divider />

            <Typography variant="subtitle1">Configuration</Typography>

            {plugin.manifest?.configSchema?.properties ? (
              Object.entries(plugin.manifest.configSchema.properties).map(([key, schema]) => (
                <Box key={key}>
                  {schema.type === "boolean" ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2">{key}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {schema.description}
                        </Typography>
                      </Box>
                      <Switch
                        checked={localConfig[key] ?? schema.default ?? false}
                        onChange={(e) =>
                          setLocalConfig({ ...localConfig, [key]: e.target.checked })
                        }
                      />
                    </Box>
                  ) : schema.type === "number" ? (
                    <TextField
                      fullWidth
                      type="number"
                      label={key}
                      helperText={schema.description}
                      value={localConfig[key] ?? schema.default ?? ""}
                      onChange={(e) =>
                        setLocalConfig({ ...localConfig, [key]: Number(e.target.value) })
                      }
                      inputProps={{
                        min: schema.minimum,
                        max: schema.maximum,
                      }}
                    />
                  ) : schema.type === "array" ? (
                    <TextField
                      fullWidth
                      label={key}
                      helperText={`${schema.description} (comma-separated)`}
                      value={(localConfig[key] || []).join(", ")}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          [key]: e.target.value.split(",").map((s) => s.trim()),
                        })
                      }
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label={key}
                      helperText={schema.description}
                      value={localConfig[key] ?? schema.default ?? ""}
                      onChange={(e) => setLocalConfig({ ...localConfig, [key]: e.target.value })}
                    />
                  )}
                </Box>
              ))
            ) : (
              <Alert severity="info">This plugin has no configurable options.</Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Execute Action Dialog
function ExecuteActionDialog({ open, plugin, onClose }) {
  const { executeAction, loading, error } = usePluginOperations();
  const [action, setAction] = useState("");
  const [params, setParams] = useState("{}");
  const [simulation, setSimulation] = useState(false);
  const [result, setResult] = useState(null);

  const handleExecute = async () => {
    try {
      const parsedParams = JSON.parse(params);
      const response = await executeAction(plugin.id, action, parsedParams, simulation);
      setResult(response);
    } catch {
      // Error handled by hook
    }
  };

  const availableActions = useMemo(() => {
    if (!plugin?.manifest?.hooks) return [];
    return [...new Set(plugin.manifest.hooks.map((h) => h.handler))];
  }, [plugin]);

  if (!plugin) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PlayArrow color="primary" />
          Execute: {plugin.name}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            fullWidth
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            helperText={
              availableActions.length > 0
                ? `Available: ${availableActions.join(", ")}`
                : "Enter action name"
            }
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Parameters (JSON)"
            value={params}
            onChange={(e) => setParams(e.target.value)}
            helperText="JSON object with action parameters"
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch checked={simulation} onChange={(e) => setSimulation(e.target.checked)} />
            <Typography variant="body2">Simulation Mode (dry run)</Typography>
          </Box>

          {result && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <Typography variant="subtitle2" gutterBottom>
                Result:
              </Typography>
              <pre style={{ margin: 0, overflow: "auto", maxHeight: 200 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </Paper>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleExecute}
          disabled={loading || !action}
          startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
        >
          {loading ? "Executing..." : "Execute"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Delete Confirmation Dialog
function DeleteConfirmDialog({ open, plugin, onClose, onConfirm }) {
  const { uninstallPlugin, loading } = usePluginOperations();

  const handleConfirm = async () => {
    try {
      await uninstallPlugin(plugin.id);
      onConfirm?.();
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  if (!plugin) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Uninstall Plugin</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone.
        </Alert>
        <Typography>
          Are you sure you want to uninstall <strong>{plugin.name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          All tenant configurations for this plugin will be removed.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleConfirm} disabled={loading}>
          {loading ? "Uninstalling..." : "Uninstall"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Main Component
export default function InstalledPlugins() {
  const { plugins, loading, error, filters, pagination, updateFilters, changePage, refresh } =
    usePlugins();
  const { enablePlugin, disablePlugin } = usePluginOperations();

  const [configPlugin, setConfigPlugin] = useState(null);
  const [executePlugin, setExecutePlugin] = useState(null);
  const [deletePlugin, setDeletePlugin] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    updateFilters({ search: e.target.value });
  };

  const handleCategoryFilter = (e) => {
    updateFilters({ category: e.target.value || undefined });
  };

  const handleStatusFilter = (e) => {
    updateFilters({ status: e.target.value || undefined });
  };

  const handleToggle = async (pluginId, enable) => {
    if (enable) {
      await enablePlugin(pluginId);
    } else {
      await disablePlugin(pluginId);
    }
    refresh();
  };

  const handlePageChange = (event, newPage) => {
    changePage(newPage + 1);
  };

  const handleRowsPerPageChange = (event) => {
    updateFilters({ pageSize: parseInt(event.target.value, 10) });
  };

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: plugins.length,
      enabled: plugins.filter((p) => p.status === "enabled").length,
      disabled: plugins.filter((p) => p.status === "disabled").length,
      error: plugins.filter((p) => p.status === "error").length,
    };
  }, [plugins]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Plugin Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage installed plugins and their configurations.
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Plugins
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" color="success.main">
                {stats.enabled}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enabled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" color="warning.main">
                {stats.disabled}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Disabled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" color="error.main">
                {stats.error}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Errors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search plugins..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ""}
                  label="Category"
                  onChange={handleCategoryFilter}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  <MenuItem value="alerting">Alerting</MenuItem>
                  <MenuItem value="notification">Notification</MenuItem>
                  <MenuItem value="integration">Integration</MenuItem>
                  <MenuItem value="analytics">Analytics</MenuItem>
                  <MenuItem value="automation">Automation</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="compliance">Compliance</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={filters.status || ""} label="Status" onChange={handleStatusFilter}>
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="enabled">Enabled</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                  <MenuItem value="installed">Installed</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={refresh}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Plugins Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Plugin</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Health</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plugins.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No plugins found. Install plugins from the marketplace.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              plugins.map((plugin) => (
                <PluginRow
                  key={plugin.id}
                  plugin={plugin}
                  onConfigure={setConfigPlugin}
                  onToggle={handleToggle}
                  onDelete={setDeletePlugin}
                  onExecute={setExecutePlugin}
                />
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </TableContainer>

      {/* Dialogs */}
      <PluginConfigDialog
        open={!!configPlugin}
        plugin={configPlugin}
        onClose={() => setConfigPlugin(null)}
        onSave={refresh}
      />
      <ExecuteActionDialog
        open={!!executePlugin}
        plugin={executePlugin}
        onClose={() => setExecutePlugin(null)}
      />
      <DeleteConfirmDialog
        open={!!deletePlugin}
        plugin={deletePlugin}
        onClose={() => setDeletePlugin(null)}
        onConfirm={refresh}
      />
    </Container>
  );
}
