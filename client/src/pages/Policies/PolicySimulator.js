"use strict";
/**
 * Policy Simulator Page
 *
 * Interactive policy simulation and what-if analysis.
 *
 * SOC 2 Controls: CC7.2, PI1.1
 *
 * @module pages/Policies/PolicySimulator
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
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const usePolicies_1 = require("../../hooks/usePolicies");
// ============================================================================
// Helper Components
// ============================================================================
const TabPanel = ({ children, value, index }) => (<material_1.Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </material_1.Box>);
const VerdictChip = ({ action }) => {
    const getColor = () => {
        switch (action) {
            case 'ALLOW': return 'success';
            case 'DENY': return 'error';
            case 'ESCALATE': return 'warning';
            case 'WARN': return 'info';
            default: return 'info';
        }
    };
    return <material_1.Chip label={action} color={getColor()} size="medium"/>;
};
const RiskLevelChip = ({ level }) => {
    const getColor = () => {
        switch (level) {
            case 'low': return 'success';
            case 'medium': return 'warning';
            case 'high': return 'error';
            case 'critical': return 'error';
            default: return 'default';
        }
    };
    return <material_1.Chip label={level.toUpperCase()} color={getColor()} size="small"/>;
};
// ============================================================================
// Default Values
// ============================================================================
const defaultPolicy = {
    id: 'test-policy',
    description: 'Test policy for simulation',
    scope: {
        stages: ['runtime'],
        tenants: ['*'],
    },
    rules: [],
    action: 'ALLOW',
};
const defaultContext = {
    stage: 'runtime',
    tenantId: 'default-tenant',
    region: 'us-east-1',
    payload: {},
    metadata: {},
    simulation: true,
};
const getErrorMessage = (err) => {
    if (err instanceof Error)
        return err.message;
    return 'Invalid JSON';
};
// ============================================================================
// Component
// ============================================================================
const PolicySimulator = () => {
    // State
    const [tab, setTab] = (0, react_1.useState)(0);
    const [policyJson, setPolicyJson] = (0, react_1.useState)(JSON.stringify(defaultPolicy, null, 2));
    const [contextJson, setContextJson] = (0, react_1.useState)(JSON.stringify(defaultContext, null, 2));
    const [comparePolicy, setComparePolicy] = (0, react_1.useState)(null);
    const [comparePolicyJson, setComparePolicyJson] = (0, react_1.useState)('');
    const [jsonErrors, setJsonErrors] = (0, react_1.useState)({});
    // Hooks
    const simulator = (0, usePolicies_1.usePolicySimulator)();
    const { policies } = (0, usePolicies_1.usePolicies)({ pageSize: 100 });
    // Memoized values
    const activePolicies = (0, react_1.useMemo)(() => policies.filter((p) => p.status === 'active' || p.status === 'approved'), [policies]);
    // Handlers
    const handleTabChange = (0, react_1.useCallback)((_, newValue) => {
        setTab(newValue);
    }, []);
    const validateJson = (0, react_1.useCallback)((json, field) => {
        try {
            JSON.parse(json);
            setJsonErrors((prev) => ({ ...prev, [field]: undefined }));
            return true;
        }
        catch (err) {
            setJsonErrors((prev) => ({ ...prev, [field]: getErrorMessage(err) }));
            return false;
        }
    }, []);
    const handleRunSimulation = (0, react_1.useCallback)(async () => {
        // Validate inputs
        const policyValid = validateJson(policyJson, 'policy');
        const contextValid = validateJson(contextJson, 'context');
        if (!policyValid || !contextValid)
            return;
        try {
            const policy = JSON.parse(policyJson);
            const context = JSON.parse(contextJson);
            const request = {
                policy,
                context,
            };
            // Add comparison if enabled
            if (comparePolicy && comparePolicyJson) {
                const compareValid = validateJson(comparePolicyJson, 'compare');
                if (compareValid) {
                    request.compareWith = JSON.parse(comparePolicyJson);
                }
            }
            await simulator.simulate(request);
        }
        catch (err) {
            console.error('Simulation error:', err);
        }
    }, [policyJson, contextJson, comparePolicy, comparePolicyJson, validateJson, simulator]);
    const handleAnalyzeImpact = (0, react_1.useCallback)(async () => {
        const currentValid = validateJson(policyJson, 'policy');
        const newValid = validateJson(comparePolicyJson, 'compare');
        if (!currentValid || !newValid)
            return;
        try {
            const currentPolicy = JSON.parse(policyJson);
            const newPolicy = JSON.parse(comparePolicyJson);
            await simulator.analyzeImpact(currentPolicy, newPolicy);
        }
        catch (err) {
            console.error('Impact analysis error:', err);
        }
    }, [policyJson, comparePolicyJson, validateJson, simulator]);
    const handleLoadPolicy = (0, react_1.useCallback)((policy, target) => {
        const policyData = {
            id: policy.id,
            description: policy.description,
            scope: policy.scope,
            rules: policy.rules,
            action: policy.action,
        };
        const json = JSON.stringify(policyData, null, 2);
        if (target === 'main') {
            setPolicyJson(json);
            setJsonErrors((prev) => ({ ...prev, policy: undefined }));
        }
        else {
            setComparePolicy(policy.id);
            setComparePolicyJson(json);
            setJsonErrors((prev) => ({ ...prev, compare: undefined }));
        }
    }, []);
    const handleCopyResult = (0, react_1.useCallback)(() => {
        if (simulator.result) {
            navigator.clipboard.writeText(JSON.stringify(simulator.result, null, 2));
        }
    }, [simulator.result]);
    // Render
    return (<material_1.Box sx={{ p: 3 }}>
      {/* Header */}
      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <material_1.Typography variant="h4" component="h1">
          Policy Simulator
        </material_1.Typography>
        <material_1.Button variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={simulator.clearResults} disabled={simulator.loading}>
          Clear Results
        </material_1.Button>
      </material_1.Box>

      {/* Error Display */}
      {simulator.error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {simulator.error}
        </material_1.Alert>)}

      <material_1.Grid container spacing={3}>
        {/* Left Panel - Input */}
        <material_1.Grid item xs={12} lg={6}>
          <material_1.Paper sx={{ p: 2 }}>
            <material_1.Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <material_1.Tab label="Simulate"/>
              <material_1.Tab label="Compare"/>
              <material_1.Tab label="Impact Analysis"/>
            </material_1.Tabs>

            {/* Simulate Tab */}
            <TabPanel value={tab} index={0}>
              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <material_1.Typography variant="subtitle2">Policy Definition</material_1.Typography>
                  <material_1.FormControl size="small" sx={{ minWidth: 200 }}>
                    <material_1.InputLabel>Load from...</material_1.InputLabel>
                    <material_1.Select value="" onChange={(e) => {
            const policy = activePolicies.find((p) => p.id === e.target.value);
            if (policy)
                handleLoadPolicy(policy, 'main');
        }} label="Load from...">
                      {activePolicies.map((p) => (<material_1.MenuItem key={p.id} value={p.id}>
                          {p.displayName}
                        </material_1.MenuItem>))}
                    </material_1.Select>
                  </material_1.FormControl>
                </material_1.Box>
                <material_1.TextField fullWidth multiline rows={10} value={policyJson} onChange={(e) => {
            setPolicyJson(e.target.value);
            validateJson(e.target.value, 'policy');
        }} error={Boolean(jsonErrors.policy)} helperText={jsonErrors.policy} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Divider sx={{ my: 2 }}/>

              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Simulation Context
                </material_1.Typography>
                <material_1.TextField fullWidth multiline rows={8} value={contextJson} onChange={(e) => {
            setContextJson(e.target.value);
            validateJson(e.target.value, 'context');
        }} error={Boolean(jsonErrors.context)} helperText={jsonErrors.context} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Button fullWidth variant="contained" startIcon={simulator.loading ? <material_1.CircularProgress size={20}/> : <icons_material_1.PlayArrow />} onClick={handleRunSimulation} disabled={simulator.loading || Boolean(jsonErrors.policy) || Boolean(jsonErrors.context)}>
                Run Simulation
              </material_1.Button>
            </TabPanel>

            {/* Compare Tab */}
            <TabPanel value={tab} index={1}>
              <material_1.Alert severity="info" sx={{ mb: 2 }}>
                Compare two policies to see how they differ in behavior.
              </material_1.Alert>

              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Current Policy
                </material_1.Typography>
                <material_1.TextField fullWidth multiline rows={8} value={policyJson} onChange={(e) => {
            setPolicyJson(e.target.value);
            validateJson(e.target.value, 'policy');
        }} error={Boolean(jsonErrors.policy)} helperText={jsonErrors.policy} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <material_1.Typography variant="subtitle2">Compare With</material_1.Typography>
                  <material_1.FormControl size="small" sx={{ minWidth: 200 }}>
                    <material_1.InputLabel>Load from...</material_1.InputLabel>
                    <material_1.Select value={comparePolicy || ''} onChange={(e) => {
            const policy = activePolicies.find((p) => p.id === e.target.value);
            if (policy)
                handleLoadPolicy(policy, 'compare');
        }} label="Load from...">
                      {activePolicies.map((p) => (<material_1.MenuItem key={p.id} value={p.id}>
                          {p.displayName}
                        </material_1.MenuItem>))}
                    </material_1.Select>
                  </material_1.FormControl>
                </material_1.Box>
                <material_1.TextField fullWidth multiline rows={8} value={comparePolicyJson} onChange={(e) => {
            setComparePolicyJson(e.target.value);
            validateJson(e.target.value, 'compare');
        }} error={Boolean(jsonErrors.compare)} helperText={jsonErrors.compare} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Test Context
                </material_1.Typography>
                <material_1.TextField fullWidth multiline rows={6} value={contextJson} onChange={(e) => {
            setContextJson(e.target.value);
            validateJson(e.target.value, 'context');
        }} error={Boolean(jsonErrors.context)} helperText={jsonErrors.context} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Button fullWidth variant="contained" startIcon={simulator.loading ? <material_1.CircularProgress size={20}/> : <icons_material_1.CompareArrows />} onClick={handleRunSimulation} disabled={simulator.loading || !comparePolicyJson}>
                Compare Policies
              </material_1.Button>
            </TabPanel>

            {/* Impact Analysis Tab */}
            <TabPanel value={tab} index={2}>
              <material_1.Alert severity="info" sx={{ mb: 2 }}>
                Analyze the potential impact of changing from one policy to another.
              </material_1.Alert>

              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Current Policy
                </material_1.Typography>
                <material_1.TextField fullWidth multiline rows={8} value={policyJson} onChange={(e) => {
            setPolicyJson(e.target.value);
            validateJson(e.target.value, 'policy');
        }} error={Boolean(jsonErrors.policy)} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Box sx={{ mb: 2 }}>
                <material_1.Typography variant="subtitle2" gutterBottom>
                  Proposed New Policy
                </material_1.Typography>
                <material_1.TextField fullWidth multiline rows={8} value={comparePolicyJson} onChange={(e) => {
            setComparePolicyJson(e.target.value);
            validateJson(e.target.value, 'compare');
        }} error={Boolean(jsonErrors.compare)} sx={{ fontFamily: 'monospace' }}/>
              </material_1.Box>

              <material_1.Button fullWidth variant="contained" color="warning" startIcon={simulator.loading ? <material_1.CircularProgress size={20}/> : <icons_material_1.Warning />} onClick={handleAnalyzeImpact} disabled={simulator.loading || !comparePolicyJson}>
                Analyze Impact
              </material_1.Button>
            </TabPanel>
          </material_1.Paper>
        </material_1.Grid>

        {/* Right Panel - Results */}
        <material_1.Grid item xs={12} lg={6}>
          {/* Simulation Result */}
          {simulator.result && (<material_1.Card sx={{ mb: 2 }}>
              <material_1.CardHeader title="Simulation Result" action={<material_1.Tooltip title="Copy JSON">
                    <material_1.IconButton onClick={handleCopyResult}>
                      <icons_material_1.ContentCopy />
                    </material_1.IconButton>
                  </material_1.Tooltip>}/>
              <material_1.CardContent>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <material_1.Typography variant="subtitle1">Verdict:</material_1.Typography>
                  <VerdictChip action={simulator.result.verdict.action}/>
                  <material_1.Typography variant="body2" color="text.secondary">
                    ({simulator.result.verdict.metadata.latencyMs}ms)
                  </material_1.Typography>
                </material_1.Box>

                {simulator.result.verdict.reasons.length > 0 && (<material_1.Box sx={{ mb: 2 }}>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Reasons:
                    </material_1.Typography>
                    <material_1.List dense>
                      {simulator.result.verdict.reasons.map((reason, i) => (<material_1.ListItem key={i}>
                          <material_1.ListItemText primary={reason}/>
                        </material_1.ListItem>))}
                    </material_1.List>
                  </material_1.Box>)}

                {/* Evaluation Path */}
                <material_1.Accordion>
                  <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                    <material_1.Typography>Evaluation Path ({simulator.result.evaluationPath.length} steps)</material_1.Typography>
                  </material_1.AccordionSummary>
                  <material_1.AccordionDetails>
                    <material_1.List dense>
                      {simulator.result.evaluationPath.map((step) => (<material_1.ListItem key={step.step}>
                          <material_1.ListItemIcon>
                            {step.result === 'passed' ? (<icons_material_1.Check color="success"/>) : step.result === 'failed' ? (<icons_material_1.Close color="error"/>) : (<icons_material_1.Warning color="disabled"/>)}
                          </material_1.ListItemIcon>
                          <material_1.ListItemText primary={`Step ${step.step}: ${step.description}`} secondary={step.details ? JSON.stringify(step.details) : undefined}/>
                        </material_1.ListItem>))}
                    </material_1.List>
                  </material_1.AccordionDetails>
                </material_1.Accordion>

                {/* Matched Rules */}
                {simulator.result.matchedRules.length > 0 && (<material_1.Accordion>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.Typography>
                        Rules ({simulator.result.matchedRules.filter((r) => r.matched).length}/
                        {simulator.result.matchedRules.length} matched)
                      </material_1.Typography>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.List dense>
                        {simulator.result.matchedRules.map((match, i) => (<material_1.ListItem key={i}>
                            <material_1.ListItemIcon>
                              {match.matched ? <icons_material_1.Check color="success"/> : <icons_material_1.Close color="error"/>}
                            </material_1.ListItemIcon>
                            <material_1.ListItemText primary={`${match.rule.field} ${match.rule.operator} ${JSON.stringify(match.rule.value)}`} secondary={match.reason}/>
                          </material_1.ListItem>))}
                      </material_1.List>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>)}

                {/* Comparison Diff */}
                {simulator.result.comparisonDiff && (<material_1.Accordion>
                    <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                      <material_1.Typography>Policy Differences</material_1.Typography>
                    </material_1.AccordionSummary>
                    <material_1.AccordionDetails>
                      <material_1.Grid container spacing={2}>
                        {simulator.result.comparisonDiff.actionChanged && (<material_1.Grid item xs={12}>
                            <material_1.Alert severity="warning">
                              Action changed: {simulator.result.comparisonDiff.beforeAction} → {simulator.result.comparisonDiff.afterAction}
                            </material_1.Alert>
                          </material_1.Grid>)}
                        {simulator.result.comparisonDiff.addedRules.length > 0 && (<material_1.Grid item xs={12}>
                            <material_1.Typography variant="subtitle2" color="success.main">
                              Added Rules:
                            </material_1.Typography>
                            {simulator.result.comparisonDiff.addedRules.map((rule, i) => (<material_1.Chip key={i} size="small" label={`${rule.field} ${rule.operator}`} color="success" sx={{ mr: 0.5, mb: 0.5 }}/>))}
                          </material_1.Grid>)}
                        {simulator.result.comparisonDiff.removedRules.length > 0 && (<material_1.Grid item xs={12}>
                            <material_1.Typography variant="subtitle2" color="error.main">
                              Removed Rules:
                            </material_1.Typography>
                            {simulator.result.comparisonDiff.removedRules.map((rule, i) => (<material_1.Chip key={i} size="small" label={`${rule.field} ${rule.operator}`} color="error" sx={{ mr: 0.5, mb: 0.5 }}/>))}
                          </material_1.Grid>)}
                      </material_1.Grid>
                    </material_1.AccordionDetails>
                  </material_1.Accordion>)}
              </material_1.CardContent>
            </material_1.Card>)}

          {/* Impact Analysis Result */}
          {simulator.impactAnalysis && (<material_1.Card>
              <material_1.CardHeader title="Impact Analysis"/>
              <material_1.CardContent>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <material_1.Typography variant="subtitle1">Risk Level:</material_1.Typography>
                  <RiskLevelChip level={simulator.impactAnalysis.riskLevel}/>
                </material_1.Box>

                <material_1.Grid container spacing={2} sx={{ mb: 2 }}>
                  <material_1.Grid item xs={6}>
                    <material_1.Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <material_1.Typography variant="h4">
                        {simulator.impactAnalysis.estimatedAffectedUsers}
                      </material_1.Typography>
                      <material_1.Typography variant="body2" color="text.secondary">
                        Estimated Affected Users
                      </material_1.Typography>
                    </material_1.Paper>
                  </material_1.Grid>
                  <material_1.Grid item xs={6}>
                    <material_1.Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <material_1.Typography variant="h4">
                        {simulator.impactAnalysis.estimatedAffectedResources}
                      </material_1.Typography>
                      <material_1.Typography variant="body2" color="text.secondary">
                        Estimated Affected Resources
                      </material_1.Typography>
                    </material_1.Paper>
                  </material_1.Grid>
                </material_1.Grid>

                {simulator.impactAnalysis.warnings.length > 0 && (<material_1.Box sx={{ mb: 2 }}>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Warnings:
                    </material_1.Typography>
                    {simulator.impactAnalysis.warnings.map((warning, i) => (<material_1.Alert key={i} severity="warning" sx={{ mb: 1 }}>
                        {warning}
                      </material_1.Alert>))}
                  </material_1.Box>)}

                {simulator.impactAnalysis.recommendations.length > 0 && (<material_1.Box>
                    <material_1.Typography variant="subtitle2" gutterBottom>
                      Recommendations:
                    </material_1.Typography>
                    <material_1.List dense>
                      {simulator.impactAnalysis.recommendations.map((rec, i) => (<material_1.ListItem key={i}>
                          <material_1.ListItemIcon>
                            <icons_material_1.Check color="primary"/>
                          </material_1.ListItemIcon>
                          <material_1.ListItemText primary={rec}/>
                        </material_1.ListItem>))}
                    </material_1.List>
                  </material_1.Box>)}
              </material_1.CardContent>
            </material_1.Card>)}

          {/* No Results */}
          {!simulator.result && !simulator.impactAnalysis && !simulator.loading && (<material_1.Paper sx={{ p: 4, textAlign: 'center' }}>
              <material_1.Typography color="text.secondary">
                Run a simulation to see results here.
              </material_1.Typography>
            </material_1.Paper>)}

          {/* Loading */}
          {simulator.loading && (<material_1.Paper sx={{ p: 4, textAlign: 'center' }}>
              <material_1.CircularProgress />
              <material_1.Typography sx={{ mt: 2 }}>Running simulation...</material_1.Typography>
            </material_1.Paper>)}
        </material_1.Grid>
      </material_1.Grid>
    </material_1.Box>);
};
exports.default = PolicySimulator;
