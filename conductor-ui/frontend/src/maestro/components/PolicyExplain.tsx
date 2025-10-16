import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PolicyOutlined as PolicyIcon,
  RouteOutlined as RouteIcon,
  MonetizationOnOutlined as CostIcon,
  SpeedOutlined as PerformanceIcon,
  SimulationOutlined as SimulateIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`policy-tabpanel-${index}`}
      aria-labelledby={`policy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PolicyExplain({ context }: { context: any }) {
  const { postPolicyExplain } = api();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [simulation, setSimulation] = useState(null);
  const [simulateMode, setSimulateMode] = useState(false);
  const [proposedRules, setProposedRules] = useState('');
  const [explanation, setExplanation] = useState<any | null>(null);

  const runExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        queryId: context.queryId || context.id,
        extended: true,
      };

      // Fetch comprehensive explanation
      const response = await fetch('/api/maestro/v1/policies/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch explanation: ${response.statusText}`);
      }

      const explanationData = await response.json();
      setExplanation(explanationData);

      // Also run legacy explain for backwards compatibility
      const resp = await postPolicyExplain({ input: context });
      setResult(resp);
    } catch (e: any) {
      setError(e?.message || 'Explain failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!proposedRules.trim() || !context.queryId) return;

    try {
      const rules = JSON.parse(proposedRules);
      const response = await fetch('/api/maestro/v1/policies/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId: context.queryId,
          proposedRules: Array.isArray(rules) ? rules : [rules],
        }),
      });

      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSimulation(data.simulation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    }
  };

  const renderDecisionOverview = () => (
    <Box>
      {explanation ? (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Selected Expert:</strong>{' '}
              {explanation.decision.selectedExpert}
            </Typography>
            <Typography variant="body2">
              <strong>Confidence:</strong> {explanation.decision.confidence}
            </Typography>
            <Typography variant="body2">
              <strong>Reason:</strong> {explanation.decision.reason}
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom>
            Alternative Options
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Expert</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {explanation.decision.alternatives.map(
                  (alt: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{alt.expert}</TableCell>
                      <TableCell>{alt.score}</TableCell>
                      <TableCell>
                        <Chip
                          label={alt.rejectionReason || 'Available'}
                          size="small"
                          color={alt.rejectionReason ? 'default' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        result && (
          <div className="space-y-2 text-sm">
            <div>
              Decision:{' '}
              <span className="font-semibold">
                {result.allowed ? 'Allow' : 'Deny'}
              </span>
            </div>
            <div>
              Rule Path:{' '}
              <span className="font-mono text-xs">
                {result.rulePath || '—'}
              </span>
            </div>
            <div>
              Reasons:
              <ul className="list-disc pl-5">
                {(result.reasons || []).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      )}
    </Box>
  );

  const renderRulePath = () => (
    <Box>
      {explanation?.rulePath ? (
        <>
          <Typography variant="h6" gutterBottom>
            Applied Rules
          </Typography>
          {explanation.rulePath.map((rule: any, index: number) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PolicyIcon />
                  <Typography variant="subtitle1">{rule.name}</Typography>
                  <Chip
                    label={`Priority: ${rule.priority}`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={rule.action}
                    size="small"
                    color={rule.action === 'deny' ? 'error' : 'success'}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="textSecondary">
                  {rule.description}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}

          <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
            All Policy Evaluations
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rule</TableCell>
                  <TableCell>Matched</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {explanation.policyEvaluations.map(
                  (eval: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{eval.ruleName}</TableCell>
                      <TableCell>
                        <Chip
                          label={eval.matched ? 'Yes' : 'No'}
                          size="small"
                          color={eval.matched ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={eval.result}
                          size="small"
                          color={
                            eval.result === 'deny'
                              ? 'error'
                              : eval.result === 'allow'
                                ? 'success'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>{eval.description}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        result?.trace && (
          <details>
            <summary className="cursor-pointer">Rego Trace</summary>
            <pre className="overflow-auto rounded bg-slate-50 p-2 text-[11px]">
              {Array.isArray(result.trace)
                ? result.trace.join('\n')
                : JSON.stringify(result.trace, null, 2)}
            </pre>
          </details>
        )
      )}
    </Box>
  );

  const renderCostAnalysis = () => (
    <Box>
      {explanation?.costBreakdown ? (
        <>
          <Typography variant="h6" gutterBottom>
            Cost Breakdown
          </Typography>
          <Alert
            severity={
              explanation.costBreakdown.estimatedCost >
              explanation.costBreakdown.budgetRemaining * 0.8
                ? 'warning'
                : 'success'
            }
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              <strong>Estimated Cost:</strong> $
              {explanation.costBreakdown.estimatedCost.toFixed(4)}
            </Typography>
            <Typography variant="body2">
              <strong>Budget Remaining:</strong> $
              {explanation.costBreakdown.budgetRemaining.toFixed(2)}
            </Typography>
          </Alert>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cost Factor</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(explanation.costBreakdown.costFactors).map(
                  ([factor, amount]: [string, any]) => (
                    <TableRow key={factor}>
                      <TableCell>
                        {factor
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (str) => str.toUpperCase())}
                      </TableCell>
                      <TableCell>${amount.toFixed(4)}</TableCell>
                      <TableCell>
                        {(
                          (amount / explanation.costBreakdown.estimatedCost) *
                          100
                        ).toFixed(1)}
                        %
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Alert severity="info">
          Cost analysis not available for this decision
        </Alert>
      )}
    </Box>
  );

  const renderPerformanceMetrics = () => (
    <Box>
      {explanation?.performanceMetrics ? (
        <>
          <Typography variant="h6" gutterBottom>
            Performance Metrics
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Estimated Latency
              </Typography>
              <Typography
                variant="h4"
                color={
                  explanation.performanceMetrics.latencyEstimate > 5000
                    ? 'error'
                    : 'primary'
                }
              >
                {explanation.performanceMetrics.latencyEstimate}ms
              </Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Reliability Score
              </Typography>
              <Typography
                variant="h4"
                color={
                  explanation.performanceMetrics.reliabilityScore > 0.95
                    ? 'success'
                    : 'warning'
                }
              >
                {(
                  explanation.performanceMetrics.reliabilityScore * 100
                ).toFixed(1)}
                %
              </Typography>
            </Paper>
          </Box>

          <Alert
            severity={
              explanation.performanceMetrics.capacityAvailable
                ? 'success'
                : 'warning'
            }
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              <strong>Capacity Status:</strong>{' '}
              {explanation.performanceMetrics.capacityAvailable
                ? 'Available'
                : 'Limited'}
            </Typography>
          </Alert>
        </>
      ) : (
        <Alert severity="info">
          Performance metrics not available for this decision
        </Alert>
      )}
    </Box>
  );

  const renderWhatIfSimulation = () => (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={simulateMode}
            onChange={(e) => setSimulateMode(e.target.checked)}
          />
        }
        label="What-if Simulation Mode"
      />

      {simulateMode && (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Proposed Rules (JSON)"
            value={proposedRules}
            onChange={(e) => setProposedRules(e.target.value)}
            placeholder={`{
  "id": "new-rule",
  "name": "My Test Rule",
  "description": "Test rule description",
  "condition": "context.testFlag === true",
  "action": "route_to",
  "priority": 80
}`}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<SimulateIcon />}
            onClick={handleSimulate}
            disabled={!proposedRules.trim()}
          >
            Run Simulation
          </Button>
        </Box>
      )}

      {simulation && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">
            <Typography variant="h6">Simulation Results</Typography>
            <Typography variant="body2">
              <strong>Expert Would Change:</strong>{' '}
              {simulation.impact.expertWouldChange ? 'Yes' : 'No'}
            </Typography>
            <Typography variant="body2">
              <strong>Cost Delta:</strong> {simulation.impact.costDelta}
            </Typography>
            <Typography variant="body2">
              <strong>Latency Delta:</strong> {simulation.impact.latencyDelta}
            </Typography>
            <Typography variant="body2">
              <strong>Risk Delta:</strong> {simulation.impact.riskDelta}
            </Typography>
          </Alert>

          {simulation.impact.expertWouldChange && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>New Expert:</strong> {simulation.newDecision.expert}
              </Typography>
              <Typography variant="body2">
                <strong>New Reason:</strong> {simulation.newDecision.reason}
              </Typography>
              <Typography variant="body2">
                <strong>New Confidence:</strong>{' '}
                {simulation.newDecision.confidence}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {result?.whatIf && (
        <details>
          <summary className="cursor-pointer">
            What-if Simulation (Legacy)
          </summary>
          <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">
            {JSON.stringify(result.whatIf, null, 2)}
          </pre>
        </details>
      )}
    </Box>
  );

  return (
    <section className="rounded border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Policy Explain</h3>
        <button
          className="rounded border px-2 py-1 text-xs"
          onClick={runExplain}
          disabled={loading}
        >
          {loading ? 'Explaining...' : 'Explain'}
        </button>
      </div>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {(explanation || result) && (
        <>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
          >
            <Tab icon={<RouteIcon />} label="Decision" />
            <Tab icon={<PolicyIcon />} label="Rules" />
            <Tab icon={<CostIcon />} label="Cost" />
            <Tab icon={<PerformanceIcon />} label="Performance" />
            <Tab icon={<SimulateIcon />} label="What-If" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {renderDecisionOverview()}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {renderRulePath()}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {renderCostAnalysis()}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {renderPerformanceMetrics()}
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            {renderWhatIfSimulation()}
          </TabPanel>
        </>
      )}

      {result?.inputs && (
        <details className="mt-2">
          <summary className="cursor-pointer">Inputs</summary>
          <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">
            {JSON.stringify(result.inputs, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
