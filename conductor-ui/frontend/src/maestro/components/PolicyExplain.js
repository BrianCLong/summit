import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Tabs, Tab, Box, Typography, Alert, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Accordion, AccordionSummary, AccordionDetails, Button, TextField, Switch, FormControlLabel } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, PolicyOutlined as PolicyIcon, RouteOutlined as RouteIcon, MonetizationOnOutlined as CostIcon, SpeedOutlined as PerformanceIcon, PlayArrowOutlined as SimulateIcon } from '@mui/icons-material';
import { api } from '../api';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `policy-tabpanel-${index}`, "aria-labelledby": `policy-tab-${index}`, ...other, children: value === index && _jsx(Box, { sx: { p: 2 }, children: children }) }));
}
export default function PolicyExplain({ context }) {
    const { postPolicyExplain } = api();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [simulation, setSimulation] = useState(null);
    const [simulateMode, setSimulateMode] = useState(false);
    const [proposedRules, setProposedRules] = useState('');
    const [explanation, setExplanation] = useState(null);
    const runExplain = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = { queryId: context.queryId || context.id, extended: true };
            // Fetch comprehensive explanation
            const response = await fetch('/api/maestro/v1/policies/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
                    proposedRules: Array.isArray(rules) ? rules : [rules]
                })
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
    const renderDecisionOverview = () => (_jsx(Box, { children: explanation ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Selected Expert:" }), " ", explanation.decision.selectedExpert] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Confidence:" }), " ", explanation.decision.confidence] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Reason:" }), " ", explanation.decision.reason] })] }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "Alternative Options" }), _jsx(TableContainer, { component: Paper, sx: { mb: 2 }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Expert" }), _jsx(TableCell, { children: "Score" }), _jsx(TableCell, { children: "Status" })] }) }), _jsx(TableBody, { children: explanation.decision.alternatives.map((alt, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: alt.expert }), _jsx(TableCell, { children: alt.score }), _jsx(TableCell, { children: _jsx(Chip, { label: alt.rejectionReason || 'Available', size: "small", color: alt.rejectionReason ? 'default' : 'success' }) })] }, index))) })] }) })] })) : result && (_jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { children: ["Decision: ", _jsx("span", { className: "font-semibold", children: result.allowed ? 'Allow' : 'Deny' })] }), _jsxs("div", { children: ["Rule Path: ", _jsx("span", { className: "font-mono text-xs", children: result.rulePath || '—' })] }), _jsxs("div", { children: ["Reasons:", _jsx("ul", { className: "list-disc pl-5", children: (result.reasons || []).map((r, i) => (_jsx("li", { children: r }, i))) })] })] })) }));
    const renderRulePath = () => (_jsx(Box, { children: explanation?.rulePath ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Applied Rules" }), explanation.rulePath.map((rule, index) => (_jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PolicyIcon, {}), _jsx(Typography, { variant: "subtitle1", children: rule.name }), _jsx(Chip, { label: `Priority: ${rule.priority}`, size: "small", color: "primary" }), _jsx(Chip, { label: rule.action, size: "small", color: rule.action === 'deny' ? 'error' : 'success' })] }) }), _jsx(AccordionDetails, { children: _jsx(Typography, { variant: "body2", color: "textSecondary", children: rule.description }) })] }, index))), _jsx(Typography, { variant: "h6", sx: { mt: 3 }, gutterBottom: true, children: "All Policy Evaluations" }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Rule" }), _jsx(TableCell, { children: "Matched" }), _jsx(TableCell, { children: "Result" }), _jsx(TableCell, { children: "Description" })] }) }), _jsx(TableBody, { children: explanation.policyEvaluations.map((policyEval, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: policyEval.ruleName }), _jsx(TableCell, { children: _jsx(Chip, { label: policyEval.matched ? 'Yes' : 'No', size: "small", color: policyEval.matched ? 'success' : 'default' }) }), _jsx(TableCell, { children: _jsx(Chip, { label: policyEval.result, size: "small", color: policyEval.result === 'deny' ? 'error' : policyEval.result === 'allow' ? 'success' : 'warning' }) }), _jsx(TableCell, { children: policyEval.description })] }, index))) })] }) })] })) : result?.trace && (_jsxs("details", { children: [_jsx("summary", { className: "cursor-pointer", children: "Rego Trace" }), _jsx("pre", { className: "overflow-auto rounded bg-slate-50 p-2 text-[11px]", children: Array.isArray(result.trace)
                        ? result.trace.join('\n')
                        : JSON.stringify(result.trace, null, 2) })] })) }));
    const renderCostAnalysis = () => (_jsx(Box, { children: explanation?.costBreakdown ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Cost Breakdown" }), _jsxs(Alert, { severity: explanation.costBreakdown.estimatedCost > explanation.costBreakdown.budgetRemaining * 0.8 ? 'warning' : 'success', sx: { mb: 2 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Estimated Cost:" }), " $", explanation.costBreakdown.estimatedCost.toFixed(4)] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Budget Remaining:" }), " $", explanation.costBreakdown.budgetRemaining.toFixed(2)] })] }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Cost Factor" }), _jsx(TableCell, { children: "Amount" }), _jsx(TableCell, { children: "Percentage" })] }) }), _jsx(TableBody, { children: Object.entries(explanation.costBreakdown.costFactors).map(([factor, amount]) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) }), _jsxs(TableCell, { children: ["$", amount.toFixed(4)] }), _jsxs(TableCell, { children: [((amount / explanation.costBreakdown.estimatedCost) * 100).toFixed(1), "%"] })] }, factor))) })] }) })] })) : (_jsx(Alert, { severity: "info", children: "Cost analysis not available for this decision" })) }));
    const renderPerformanceMetrics = () => (_jsx(Box, { children: explanation?.performanceMetrics ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Performance Metrics" }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }, children: [_jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "subtitle2", color: "textSecondary", children: "Estimated Latency" }), _jsxs(Typography, { variant: "h4", color: explanation.performanceMetrics.latencyEstimate > 5000 ? 'error' : 'primary', children: [explanation.performanceMetrics.latencyEstimate, "ms"] })] }), _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "subtitle2", color: "textSecondary", children: "Reliability Score" }), _jsxs(Typography, { variant: "h4", color: explanation.performanceMetrics.reliabilityScore > 0.95 ? 'success' : 'warning', children: [(explanation.performanceMetrics.reliabilityScore * 100).toFixed(1), "%"] })] })] }), _jsx(Alert, { severity: explanation.performanceMetrics.capacityAvailable ? 'success' : 'warning', sx: { mt: 2 }, children: _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Capacity Status:" }), " ", explanation.performanceMetrics.capacityAvailable ? 'Available' : 'Limited'] }) })] })) : (_jsx(Alert, { severity: "info", children: "Performance metrics not available for this decision" })) }));
    const renderWhatIfSimulation = () => (_jsxs(Box, { children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: simulateMode, onChange: (e) => setSimulateMode(e.target.checked) }), label: "What-if Simulation Mode" }), simulateMode && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(TextField, { fullWidth: true, multiline: true, rows: 6, label: "Proposed Rules (JSON)", value: proposedRules, onChange: (e) => setProposedRules(e.target.value), placeholder: `{
  "id": "new-rule",
  "name": "My Test Rule",
  "description": "Test rule description",
  "condition": "context.testFlag === true",
  "action": "route_to",
  "priority": 80
}`, sx: { mb: 2 } }), _jsx(Button, { variant: "contained", startIcon: _jsx(SimulateIcon, {}), onClick: handleSimulate, disabled: !proposedRules.trim(), children: "Run Simulation" })] })), simulation && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsxs(Alert, { severity: "info", children: [_jsx(Typography, { variant: "h6", children: "Simulation Results" }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Expert Would Change:" }), " ", simulation.impact.expertWouldChange ? 'Yes' : 'No'] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Cost Delta:" }), " ", simulation.impact.costDelta] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Latency Delta:" }), " ", simulation.impact.latencyDelta] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Risk Delta:" }), " ", simulation.impact.riskDelta] })] }), simulation.impact.expertWouldChange && (_jsxs(Alert, { severity: "warning", sx: { mt: 1 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "New Expert:" }), " ", simulation.newDecision.expert] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "New Reason:" }), " ", simulation.newDecision.reason] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "New Confidence:" }), " ", simulation.newDecision.confidence] })] }))] })), result?.whatIf && (_jsxs("details", { children: [_jsx("summary", { className: "cursor-pointer", children: "What-if Simulation (Legacy)" }), _jsx("pre", { className: "overflow-auto rounded bg-slate-50 p-2 text-xs", children: JSON.stringify(result.whatIf, null, 2) })] }))] }));
    return (_jsxs("section", { className: "rounded border bg-white p-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-700", children: "Policy Explain" }), _jsx("button", { className: "rounded border px-2 py-1 text-xs", onClick: runExplain, disabled: loading, children: loading ? 'Explaining...' : 'Explain' })] }), loading && (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 2 }, children: _jsx(CircularProgress, { size: 24 }) })), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), (explanation || result) && (_jsxs(_Fragment, { children: [_jsxs(Tabs, { value: tabValue, onChange: (_, newValue) => setTabValue(newValue), variant: "scrollable", children: [_jsx(Tab, { icon: _jsx(RouteIcon, {}), label: "Decision" }), _jsx(Tab, { icon: _jsx(PolicyIcon, {}), label: "Rules" }), _jsx(Tab, { icon: _jsx(CostIcon, {}), label: "Cost" }), _jsx(Tab, { icon: _jsx(PerformanceIcon, {}), label: "Performance" }), _jsx(Tab, { icon: _jsx(SimulateIcon, {}), label: "What-If" })] }), _jsx(TabPanel, { value: tabValue, index: 0, children: renderDecisionOverview() }), _jsx(TabPanel, { value: tabValue, index: 1, children: renderRulePath() }), _jsx(TabPanel, { value: tabValue, index: 2, children: renderCostAnalysis() }), _jsx(TabPanel, { value: tabValue, index: 3, children: renderPerformanceMetrics() }), _jsx(TabPanel, { value: tabValue, index: 4, children: renderWhatIfSimulation() })] })), result?.inputs && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer", children: "Inputs" }), _jsx("pre", { className: "overflow-auto rounded bg-slate-50 p-2 text-xs", children: JSON.stringify(result.inputs, null, 2) })] }))] }));
}
