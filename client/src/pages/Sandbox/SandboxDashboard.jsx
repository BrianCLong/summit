/**
 * Sandbox Dashboard Page
 *
 * Policy testing sandbox management and execution.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC8.1 (Change Management)
 *
 * @module pages/Sandbox/SandboxDashboard
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add,
  Delete,
  PlayArrow,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  ExpandMore,
  Science,
  Assignment,
  Timeline,
  BugReport,
} from "@mui/icons-material";
import { SandboxAPI } from "../../services/sandbox-api";

// Status colors
const statusColors = {
  created: "info",
  running: "warning",
  completed: "success",
  failed: "error",
  expired: "default",
};

// Verdict colors
const verdictColors = {
  ALLOW: "success",
  DENY: "error",
  FLAG: "warning",
  REVIEW_REQUIRED: "info",
};

// Tab Panel
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Create Sandbox Dialog
function CreateSandboxDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState(24);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name, expiresIn });
      setName("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Sandbox</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Sandbox Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Policy Test Environment"
        />
        <TextField
          margin="dense"
          label="Expires In (hours)"
          type="number"
          fullWidth
          value={expiresIn}
          onChange={(e) => setExpiresIn(parseInt(e.target.value, 10))}
          inputProps={{ min: 1, max: 168 }}
        />
        <Typography variant="caption" color="text.secondary">
          Sandbox will be automatically deleted after expiration.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={loading || !name.trim()}>
          {loading ? <CircularProgress size={20} /> : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Add Scenario Dialog
function AddScenarioDialog({ open, onClose, onAdd }) {
  const [scenario, setScenario] = useState({
    name: "",
    description: "",
    actor: { type: "user", role: "analyst" },
    action: "read",
    resource: { type: "document" },
    expectedVerdict: "ALLOW",
  });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!scenario.name.trim()) return;
    setLoading(true);
    try {
      await onAdd(scenario);
      setScenario({
        name: "",
        description: "",
        actor: { type: "user", role: "analyst" },
        action: "read",
        resource: { type: "document" },
        expectedVerdict: "ALLOW",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Test Scenario</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Scenario Name"
              fullWidth
              value={scenario.name}
              onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={scenario.description}
              onChange={(e) => setScenario({ ...scenario, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Actor Role"
              fullWidth
              value={scenario.actor.role}
              onChange={(e) =>
                setScenario({
                  ...scenario,
                  actor: { ...scenario.actor, role: e.target.value },
                })
              }
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Action"
              fullWidth
              value={scenario.action}
              onChange={(e) => setScenario({ ...scenario, action: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Resource Type"
              fullWidth
              value={scenario.resource.type}
              onChange={(e) =>
                setScenario({
                  ...scenario,
                  resource: { ...scenario.resource, type: e.target.value },
                })
              }
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              select
              label="Expected Verdict"
              fullWidth
              value={scenario.expectedVerdict}
              onChange={(e) => setScenario({ ...scenario, expectedVerdict: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
              <option value="FLAG">FLAG</option>
              <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={loading || !scenario.name.trim()}>
          {loading ? <CircularProgress size={20} /> : "Add Scenario"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Sandbox List Component
function SandboxList({ sandboxes, onSelect, onDelete, selectedId }) {
  if (sandboxes.length === 0) {
    return <Alert severity="info">No sandboxes found. Create one to start testing policies.</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Scenarios</TableCell>
            <TableCell>Policies</TableCell>
            <TableCell>Expires</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sandboxes.map((sandbox) => (
            <TableRow
              key={sandbox.id}
              selected={sandbox.id === selectedId}
              sx={{ cursor: "pointer" }}
              onClick={() => onSelect(sandbox)}
            >
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {sandbox.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sandbox.id}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={sandbox.status} size="small" color={statusColors[sandbox.status]} />
              </TableCell>
              <TableCell>{sandbox.testData?.scenarios?.length || 0}</TableCell>
              <TableCell>{sandbox.policies?.length || 0}</TableCell>
              <TableCell>
                <Typography variant="caption">
                  {new Date(sandbox.expiresAt).toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(sandbox.id);
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Execution Results Component
function ExecutionResults({ result }) {
  if (!result) {
    return <Alert severity="info">No execution results yet. Run the sandbox to see results.</Alert>;
  }

  return (
    <Box>
      {/* Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Execution Summary
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Chip
                  icon={<CheckCircle />}
                  label={`${result.summary.passed} Passed`}
                  color="success"
                />
                <Chip icon={<Error />} label={`${result.summary.failed} Failed`} color="error" />
                <Chip
                  icon={<Warning />}
                  label={`${result.summary.skipped} Skipped`}
                  color="warning"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Execution Time: {result.summary.executionTime}ms
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Verdict Distribution
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={`ALLOW: ${result.summary.verdictDistribution.allow}`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`DENY: ${result.summary.verdictDistribution.deny}`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
                <Chip
                  label={`FLAG: ${result.summary.verdictDistribution.flag}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  label={`REVIEW: ${result.summary.verdictDistribution.reviewRequired}`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Policy Coverage
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress
                variant="determinate"
                value={result.coverage.coveragePercent}
                color={result.coverage.coveragePercent >= 80 ? "success" : "warning"}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="body2" fontWeight="bold">
              {result.coverage.coveragePercent}%
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {result.coverage.rulesCovered} of {result.coverage.totalRules} rules covered
          </Typography>

          {result.coverage.uncoveredRules.length > 0 && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2">
                  Uncovered Rules ({result.coverage.uncoveredRules.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {result.coverage.uncoveredRules.slice(0, 5).map((rule, i) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={`${rule.policyId}: ${rule.ruleId}`}
                        secondary={rule.condition}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Issues */}
      {result.issues.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detected Issues
            </Typography>
            <List>
              {result.issues.map((issue, i) => (
                <ListItem key={i}>
                  <ListItemIcon>
                    {issue.severity === "critical" || issue.severity === "high" ? (
                      <Error color="error" />
                    ) : (
                      <Warning color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText primary={issue.description} secondary={issue.recommendation} />
                  <Chip
                    label={issue.severity}
                    size="small"
                    color={
                      issue.severity === "critical"
                        ? "error"
                        : issue.severity === "high"
                          ? "warning"
                          : "default"
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Scenario Results */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Scenario Results
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scenario</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Verdict</TableCell>
                  <TableCell>Expected</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.scenarioResults.map((sr) => (
                  <TableRow key={sr.scenarioId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {sr.scenarioName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sr.status}
                        size="small"
                        color={sr.status === "passed" ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sr.verdict}
                        size="small"
                        color={verdictColors[sr.verdict]}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {sr.expectedVerdict && (
                        <Chip label={sr.expectedVerdict} size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{sr.executionTime}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

// Main Component
export default function SandboxDashboard() {
  const [sandboxes, setSandboxes] = useState([]);
  const [selectedSandbox, setSelectedSandbox] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);

  const fetchSandboxes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await SandboxAPI.list();
      setSandboxes(response.data || []);
    } catch (err) {
      console.error("Failed to fetch sandboxes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSandboxes();
  }, [fetchSandboxes]);

  const handleCreate = async (data) => {
    try {
      const response = await SandboxAPI.create(data);
      setSandboxes([...sandboxes, response.data]);
      setSelectedSandbox(response.data);
    } catch (err) {
      console.error("Failed to create sandbox:", err);
    }
  };

  const handleDelete = async (sandboxId) => {
    if (!window.confirm("Are you sure you want to delete this sandbox?")) return;
    try {
      await SandboxAPI.delete(sandboxId);
      setSandboxes(sandboxes.filter((s) => s.id !== sandboxId));
      if (selectedSandbox?.id === sandboxId) {
        setSelectedSandbox(null);
        setExecutionResult(null);
      }
    } catch (err) {
      console.error("Failed to delete sandbox:", err);
    }
  };

  const handleAddScenario = async (scenario) => {
    if (!selectedSandbox) return;
    try {
      await SandboxAPI.addScenario(selectedSandbox.id, scenario);
      // Refresh sandbox data
      const response = await SandboxAPI.get(selectedSandbox.id);
      setSelectedSandbox(response.data);
    } catch (err) {
      console.error("Failed to add scenario:", err);
    }
  };

  const handleExecute = async () => {
    if (!selectedSandbox) return;
    try {
      setExecuting(true);
      const response = await SandboxAPI.execute(selectedSandbox.id);
      setExecutionResult(response.data);
      setTabValue(1); // Switch to results tab
    } catch (err) {
      console.error("Failed to execute sandbox:", err);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Policy Sandbox
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Test and validate governance policies in an isolated environment.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={fetchSandboxes}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Sandbox
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Sandbox List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sandboxes
              </Typography>
              <SandboxList
                sandboxes={sandboxes}
                selectedId={selectedSandbox?.id}
                onSelect={setSelectedSandbox}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Sandbox Details */}
        <Grid item xs={12} md={8}>
          {selectedSandbox ? (
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6">{selectedSandbox.name}</Typography>
                    <Chip
                      label={selectedSandbox.status}
                      size="small"
                      color={statusColors[selectedSandbox.status]}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button startIcon={<Assignment />} onClick={() => setScenarioDialogOpen(true)}>
                      Add Scenario
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={executing ? <CircularProgress size={20} /> : <PlayArrow />}
                      onClick={handleExecute}
                      disabled={executing || selectedSandbox.status === "running"}
                    >
                      {executing ? "Running..." : "Execute"}
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab icon={<Science />} label="Scenarios" iconPosition="start" />
                    <Tab icon={<Timeline />} label="Results" iconPosition="start" />
                    <Tab icon={<BugReport />} label="Issues" iconPosition="start" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  {selectedSandbox.testData?.scenarios?.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Actor</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Resource</TableCell>
                            <TableCell>Expected</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedSandbox.testData.scenarios.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {s.name}
                                </Typography>
                              </TableCell>
                              <TableCell>{s.actor.role}</TableCell>
                              <TableCell>{s.action}</TableCell>
                              <TableCell>{s.resource.type}</TableCell>
                              <TableCell>
                                {s.expectedVerdict && (
                                  <Chip
                                    label={s.expectedVerdict}
                                    size="small"
                                    color={verdictColors[s.expectedVerdict]}
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      No scenarios configured. Add scenarios to test policies.
                    </Alert>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <ExecutionResults result={executionResult} />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  {executionResult?.issues?.length > 0 ? (
                    <List>
                      {executionResult.issues.map((issue, i) => (
                        <ListItem key={i} divider>
                          <ListItemIcon>
                            {issue.type === "security" ? (
                              <Error color="error" />
                            ) : (
                              <Warning color="warning" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="body1">{issue.description}</Typography>
                                <Chip label={issue.type} size="small" variant="outlined" />
                                <Chip
                                  label={issue.severity}
                                  size="small"
                                  color={
                                    issue.severity === "critical" || issue.severity === "high"
                                      ? "error"
                                      : "warning"
                                  }
                                />
                              </Box>
                            }
                            secondary={issue.recommendation}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="success">
                      No issues detected. Run the sandbox to analyze policies.
                    </Alert>
                  )}
                </TabPanel>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 8 }}>
                <Science sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a sandbox to view details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Or create a new one to start testing policies
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <CreateSandboxDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />

      <AddScenarioDialog
        open={scenarioDialogOpen}
        onClose={() => setScenarioDialogOpen(false)}
        onAdd={handleAddScenario}
      />
    </Container>
  );
}
