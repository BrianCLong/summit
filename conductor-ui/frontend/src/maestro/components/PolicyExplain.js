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
exports.default = PolicyExplain;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../api");
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (<div role="tabpanel" hidden={value !== index} id={`policy-tabpanel-${index}`} aria-labelledby={`policy-tab-${index}`} {...other}>
      {value === index && <material_1.Box sx={{ p: 2 }}>{children}</material_1.Box>}
    </div>);
}
function PolicyExplain({ context }) {
    const { postPolicyExplain } = (0, api_1.api)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [result, setResult] = (0, react_1.useState)(null);
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const [simulation, setSimulation] = (0, react_1.useState)(null);
    const [simulateMode, setSimulateMode] = (0, react_1.useState)(false);
    const [proposedRules, setProposedRules] = (0, react_1.useState)('');
    const [explanation, setExplanation] = (0, react_1.useState)(null);
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
        }
        catch (e) {
            setError(e?.message || 'Explain failed');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSimulate = async () => {
        if (!proposedRules.trim() || !context.queryId)
            return;
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Simulation failed');
        }
    };
    const renderDecisionOverview = () => (<material_1.Box>
      {explanation ? (<>
          <material_1.Alert severity="info" sx={{ mb: 2 }}>
            <material_1.Typography variant="body2">
              <strong>Selected Expert:</strong>{' '}
              {explanation.decision.selectedExpert}
            </material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Confidence:</strong> {explanation.decision.confidence}
            </material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Reason:</strong> {explanation.decision.reason}
            </material_1.Typography>
          </material_1.Alert>

          <material_1.Typography variant="h6" gutterBottom>
            Alternative Options
          </material_1.Typography>
          <material_1.TableContainer component={material_1.Paper} sx={{ mb: 2 }}>
            <material_1.Table size="small">
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Expert</material_1.TableCell>
                  <material_1.TableCell>Score</material_1.TableCell>
                  <material_1.TableCell>Status</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {explanation.decision.alternatives.map((alt, index) => (<material_1.TableRow key={index}>
                      <material_1.TableCell>{alt.expert}</material_1.TableCell>
                      <material_1.TableCell>{alt.score}</material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Chip label={alt.rejectionReason || 'Available'} size="small" color={alt.rejectionReason ? 'default' : 'success'}/>
                      </material_1.TableCell>
                    </material_1.TableRow>))}
              </material_1.TableBody>
            </material_1.Table>
          </material_1.TableContainer>
        </>) : (result && (<div className="space-y-2 text-sm">
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
                {(result.reasons || []).map((r, i) => (<li key={i}>{r}</li>))}
              </ul>
            </div>
          </div>))}
    </material_1.Box>);
    const renderRulePath = () => (<material_1.Box>
      {explanation?.rulePath ? (<>
          <material_1.Typography variant="h6" gutterBottom>
            Applied Rules
          </material_1.Typography>
          {explanation.rulePath.map((rule, index) => (<material_1.Accordion key={index}>
              <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <icons_material_1.PolicyOutlined />
                  <material_1.Typography variant="subtitle1">{rule.name}</material_1.Typography>
                  <material_1.Chip label={`Priority: ${rule.priority}`} size="small" color="primary"/>
                  <material_1.Chip label={rule.action} size="small" color={rule.action === 'deny' ? 'error' : 'success'}/>
                </material_1.Box>
              </material_1.AccordionSummary>
              <material_1.AccordionDetails>
                <material_1.Typography variant="body2" color="textSecondary">
                  {rule.description}
                </material_1.Typography>
              </material_1.AccordionDetails>
            </material_1.Accordion>))}

          <material_1.Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
            All Policy Evaluations
          </material_1.Typography>
          <material_1.TableContainer component={material_1.Paper}>
            <material_1.Table size="small">
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Rule</material_1.TableCell>
                  <material_1.TableCell>Matched</material_1.TableCell>
                  <material_1.TableCell>Result</material_1.TableCell>
                  <material_1.TableCell>Description</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {explanation.policyEvaluations.map((eval, index) => (<material_1.TableRow key={index}>
                      <material_1.TableCell>{eval.ruleName}</material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Chip label={eval.matched ? 'Yes' : 'No'} size="small" color={eval.matched ? 'success' : 'default'}/>
                      </material_1.TableCell>
                      <material_1.TableCell>
                        <material_1.Chip label={eval.result} size="small" color={eval.result === 'deny'
                    ? 'error'
                    : eval.result === 'allow'
                        ? 'success'
                        : 'warning'}/>
                      </material_1.TableCell>
                      <material_1.TableCell>{eval.description}</material_1.TableCell>
                    </material_1.TableRow>))}
              </material_1.TableBody>
            </material_1.Table>
          </material_1.TableContainer>
        </>) : (result?.trace && (<details>
            <summary className="cursor-pointer">Rego Trace</summary>
            <pre className="overflow-auto rounded bg-slate-50 p-2 text-[11px]">
              {Array.isArray(result.trace)
                ? result.trace.join('\n')
                : JSON.stringify(result.trace, null, 2)}
            </pre>
          </details>))}
    </material_1.Box>);
    const renderCostAnalysis = () => (<material_1.Box>
      {explanation?.costBreakdown ? (<>
          <material_1.Typography variant="h6" gutterBottom>
            Cost Breakdown
          </material_1.Typography>
          <material_1.Alert severity={explanation.costBreakdown.estimatedCost >
                explanation.costBreakdown.budgetRemaining * 0.8
                ? 'warning'
                : 'success'} sx={{ mb: 2 }}>
            <material_1.Typography variant="body2">
              <strong>Estimated Cost:</strong> $
              {explanation.costBreakdown.estimatedCost.toFixed(4)}
            </material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Budget Remaining:</strong> $
              {explanation.costBreakdown.budgetRemaining.toFixed(2)}
            </material_1.Typography>
          </material_1.Alert>

          <material_1.TableContainer component={material_1.Paper}>
            <material_1.Table size="small">
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Cost Factor</material_1.TableCell>
                  <material_1.TableCell>Amount</material_1.TableCell>
                  <material_1.TableCell>Percentage</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {Object.entries(explanation.costBreakdown.costFactors).map(([factor, amount]) => (<material_1.TableRow key={factor}>
                      <material_1.TableCell>
                        {factor
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase())}
                      </material_1.TableCell>
                      <material_1.TableCell>${amount.toFixed(4)}</material_1.TableCell>
                      <material_1.TableCell>
                        {((amount / explanation.costBreakdown.estimatedCost) *
                    100).toFixed(1)}
                        %
                      </material_1.TableCell>
                    </material_1.TableRow>))}
              </material_1.TableBody>
            </material_1.Table>
          </material_1.TableContainer>
        </>) : (<material_1.Alert severity="info">
          Cost analysis not available for this decision
        </material_1.Alert>)}
    </material_1.Box>);
    const renderPerformanceMetrics = () => (<material_1.Box>
      {explanation?.performanceMetrics ? (<>
          <material_1.Typography variant="h6" gutterBottom>
            Performance Metrics
          </material_1.Typography>
          <material_1.Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <material_1.Paper sx={{ p: 2 }}>
              <material_1.Typography variant="subtitle2" color="textSecondary">
                Estimated Latency
              </material_1.Typography>
              <material_1.Typography variant="h4" color={explanation.performanceMetrics.latencyEstimate > 5000
                ? 'error'
                : 'primary'}>
                {explanation.performanceMetrics.latencyEstimate}ms
              </material_1.Typography>
            </material_1.Paper>
            <material_1.Paper sx={{ p: 2 }}>
              <material_1.Typography variant="subtitle2" color="textSecondary">
                Reliability Score
              </material_1.Typography>
              <material_1.Typography variant="h4" color={explanation.performanceMetrics.reliabilityScore > 0.95
                ? 'success'
                : 'warning'}>
                {(explanation.performanceMetrics.reliabilityScore * 100).toFixed(1)}
                %
              </material_1.Typography>
            </material_1.Paper>
          </material_1.Box>

          <material_1.Alert severity={explanation.performanceMetrics.capacityAvailable
                ? 'success'
                : 'warning'} sx={{ mt: 2 }}>
            <material_1.Typography variant="body2">
              <strong>Capacity Status:</strong>{' '}
              {explanation.performanceMetrics.capacityAvailable
                ? 'Available'
                : 'Limited'}
            </material_1.Typography>
          </material_1.Alert>
        </>) : (<material_1.Alert severity="info">
          Performance metrics not available for this decision
        </material_1.Alert>)}
    </material_1.Box>);
    const renderWhatIfSimulation = () => (<material_1.Box>
      <material_1.FormControlLabel control={<material_1.Switch checked={simulateMode} onChange={(e) => setSimulateMode(e.target.checked)}/>} label="What-if Simulation Mode"/>

      {simulateMode && (<material_1.Box sx={{ mt: 2 }}>
          <material_1.TextField fullWidth multiline rows={6} label="Proposed Rules (JSON)" value={proposedRules} onChange={(e) => setProposedRules(e.target.value)} placeholder={`{
  "id": "new-rule",
  "name": "My Test Rule",
  "description": "Test rule description",
  "condition": "context.testFlag === true",
  "action": "route_to",
  "priority": 80
}`} sx={{ mb: 2 }}/>
          <material_1.Button variant="contained" startIcon={<icons_material_1.SimulationOutlined />} onClick={handleSimulate} disabled={!proposedRules.trim()}>
            Run Simulation
          </material_1.Button>
        </material_1.Box>)}

      {simulation && (<material_1.Box sx={{ mt: 2 }}>
          <material_1.Alert severity="info">
            <material_1.Typography variant="h6">Simulation Results</material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Expert Would Change:</strong>{' '}
              {simulation.impact.expertWouldChange ? 'Yes' : 'No'}
            </material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Cost Delta:</strong> {simulation.impact.costDelta}
            </material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Latency Delta:</strong> {simulation.impact.latencyDelta}
            </material_1.Typography>
            <material_1.Typography variant="body2">
              <strong>Risk Delta:</strong> {simulation.impact.riskDelta}
            </material_1.Typography>
          </material_1.Alert>

          {simulation.impact.expertWouldChange && (<material_1.Alert severity="warning" sx={{ mt: 1 }}>
              <material_1.Typography variant="body2">
                <strong>New Expert:</strong> {simulation.newDecision.expert}
              </material_1.Typography>
              <material_1.Typography variant="body2">
                <strong>New Reason:</strong> {simulation.newDecision.reason}
              </material_1.Typography>
              <material_1.Typography variant="body2">
                <strong>New Confidence:</strong>{' '}
                {simulation.newDecision.confidence}
              </material_1.Typography>
            </material_1.Alert>)}
        </material_1.Box>)}

      {result?.whatIf && (<details>
          <summary className="cursor-pointer">
            What-if Simulation (Legacy)
          </summary>
          <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">
            {JSON.stringify(result.whatIf, null, 2)}
          </pre>
        </details>)}
    </material_1.Box>);
    return (<section className="rounded border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Policy Explain</h3>
        <button className="rounded border px-2 py-1 text-xs" onClick={runExplain} disabled={loading}>
          {loading ? 'Explaining...' : 'Explain'}
        </button>
      </div>

      {loading && (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <material_1.CircularProgress size={24}/>
        </material_1.Box>)}

      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}

      {(explanation || result) && (<>
          <material_1.Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} variant="scrollable">
            <material_1.Tab icon={<icons_material_1.RouteOutlined />} label="Decision"/>
            <material_1.Tab icon={<icons_material_1.PolicyOutlined />} label="Rules"/>
            <material_1.Tab icon={<icons_material_1.MonetizationOnOutlined />} label="Cost"/>
            <material_1.Tab icon={<icons_material_1.SpeedOutlined />} label="Performance"/>
            <material_1.Tab icon={<icons_material_1.SimulationOutlined />} label="What-If"/>
          </material_1.Tabs>

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
        </>)}

      {result?.inputs && (<details className="mt-2">
          <summary className="cursor-pointer">Inputs</summary>
          <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">
            {JSON.stringify(result.inputs, null, 2)}
          </pre>
        </details>)}
    </section>);
}
