import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { fetchSnapshot } from './api';
const cardStyle = {
    border: '1px solid #d9e1ec',
    borderRadius: 8,
    padding: 16,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};
const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 24,
};
const statusColors = {
    pass: '#0f9d58',
    fail: '#d93025',
    warning: '#f29900',
    unknown: '#6b7280',
};
function StatusPill({ status }) {
    return (_jsx("span", { style: {
            background: `${statusColors[status] ?? '#6b7280'}15`,
            color: statusColors[status] ?? '#6b7280',
            padding: '4px 8px',
            borderRadius: 999,
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: 12,
        }, children: status }));
}
function Section({ title, children }) {
    return (_jsxs("section", { style: { marginBottom: 24 }, children: [_jsx("h2", { style: { marginBottom: 12 }, children: title }), children] }));
}
function SummaryTable({ rows, }) {
    return (_jsx("div", { style: cardStyle, children: _jsx("table", { style: { width: '100%', borderSpacing: 0 }, children: _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { children: [_jsx("td", { style: { padding: '6px 0', fontWeight: 600 }, children: row.label }), _jsx("td", { style: { padding: '6px 0', textAlign: 'right' }, children: row.status ? _jsx(StatusPill, { status: row.status }) : row.value })] }, row.label))) }) }) }));
}
export default function App() {
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const enabled = (import.meta.env.VITE_COMMAND_CONSOLE_ENABLED ?? 'true').toLowerCase() !==
        'false';
    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setError('Command console is disabled by configuration.');
            return;
        }
        fetchSnapshot()
            .then((data) => setSnapshot(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [enabled]);
    const incidentCount = useMemo(() => (snapshot?.incidents.gaGateFailures.length ?? 0) +
        (snapshot?.incidents.policyDenials.length ?? 0) +
        (snapshot?.incidents.killSwitchActivations.length ?? 0), [snapshot]);
    if (loading) {
        return _jsx("div", { style: { padding: 24 }, children: "Loading command console\u2026" });
    }
    if (error) {
        return (_jsxs("div", { style: { padding: 24, color: '#b42318' }, children: [_jsx("strong", { children: "Access blocked:" }), " ", error] }));
    }
    if (!snapshot)
        return null;
    return (_jsxs("div", { style: { padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }, children: [_jsxs("header", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { margin: 0 }, children: "Summit Command Console" }), _jsx("p", { style: { color: '#475569', marginTop: 4 }, children: "Real-time operational visibility, governance posture, and kill-switch readiness." })] }), _jsx(Section, { title: "Health & Status", children: _jsxs("div", { style: gridStyle, children: [_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("strong", { children: "GA Gate" }), _jsx(StatusPill, { status: snapshot.gaGate.overall })] }), _jsxs("p", { style: { margin: '8px 0', color: '#475569' }, children: ["Last run: ", new Date(snapshot.gaGate.lastRun).toLocaleString()] }), _jsx("ul", { style: { paddingLeft: 16, margin: 0, color: '#334155' }, children: snapshot.gaGate.details.slice(0, 4).map((detail) => (_jsxs("li", { children: [_jsx(StatusPill, { status: detail.status }), " ", detail.component, ": ", detail.message] }, `${detail.component}-${detail.message}`))) })] }), _jsx(SummaryTable, { rows: [
                                { label: 'CI (main)', value: snapshot.ci.commit, status: snapshot.ci.status },
                                { label: 'Updated', value: new Date(snapshot.ci.updatedAt).toLocaleString() },
                                { label: 'Branch', value: snapshot.ci.branch },
                            ] }), _jsx(SummaryTable, { rows: [
                                { label: 'SLO Compliance', value: `${(snapshot.slo.compliance * 100).toFixed(2)}%` },
                                { label: 'Error Budget', value: `${(snapshot.slo.errorBudgetRemaining * 100).toFixed(1)}%` },
                                { label: 'Burn Rate', value: snapshot.slo.burnRate.toFixed(2) },
                            ] }), _jsx(SummaryTable, { rows: [
                                { label: 'LLM Tokens (agg)', value: snapshot.llm.aggregate.tokens.toLocaleString() },
                                { label: 'LLM Cost (agg)', value: `$${snapshot.llm.aggregate.cost.toFixed(2)}` },
                                { label: 'Dependency Risk', value: snapshot.dependencyRisk.topRisks[0] ?? 'None', status: snapshot.dependencyRisk.level },
                            ] })] }) }), _jsx(Section, { title: "Tenant & Blast Radius", children: _jsx("div", { style: cardStyle, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsx("tr", { children: ['Tenant', 'Rate limit', 'Ingestion cap', 'Kill switch', 'Active'].map((header) => (_jsx("th", { style: { textAlign: 'left', paddingBottom: 8 }, children: header }, header))) }) }), _jsx("tbody", { children: snapshot.tenants.map((tenant) => (_jsxs("tr", { children: [_jsx("td", { style: { padding: '8px 0' }, children: tenant.tenantId }), _jsx("td", { children: tenant.rateLimit }), _jsx("td", { children: tenant.ingestionCap }), _jsx("td", { children: tenant.killSwitch ? 'Armed' : 'Normal' }), _jsx("td", { children: tenant.active ? 'Active' : 'Suspended' })] }, tenant.tenantId))) })] }) }) }), _jsx(Section, { title: "Incident Signals", children: _jsxs("div", { style: { ...cardStyle, display: 'flex', gap: 24, flexWrap: 'wrap' }, children: [_jsxs("div", { children: [_jsx("strong", { children: "GA Gate Failures" }), _jsxs("p", { style: { margin: '4px 0', color: '#475569' }, children: [snapshot.incidents.gaGateFailures.length, " recent"] })] }), _jsxs("div", { children: [_jsx("strong", { children: "Policy Denials" }), _jsxs("p", { style: { margin: '4px 0', color: '#475569' }, children: [snapshot.incidents.policyDenials.length, " in window"] })] }), _jsxs("div", { children: [_jsx("strong", { children: "Kill Switches" }), _jsxs("p", { style: { margin: '4px 0', color: '#475569' }, children: [snapshot.incidents.killSwitchActivations.length, " triggered"] })] }), _jsxs("div", { children: [_jsx("strong", { children: "Open Signals" }), _jsx("p", { style: { margin: '4px 0', color: '#475569' }, children: incidentCount })] })] }) }), _jsx(Section, { title: "Evidence & Governance", children: _jsxs("div", { style: gridStyle, children: [_jsx(SummaryTable, { rows: [
                                { label: 'Evidence bundle', value: snapshot.evidence.latestBundle, status: snapshot.evidence.status },
                                { label: 'Artifacts', value: snapshot.evidence.artifacts },
                                { label: 'Generated', value: new Date(snapshot.evidence.lastGeneratedAt).toLocaleString() },
                            ] }), _jsxs("div", { style: cardStyle, children: [_jsx("strong", { children: "LLM Usage (per tenant)" }), _jsx("ul", { style: { paddingLeft: 16, margin: '8px 0' }, children: snapshot.llm.tenants.map((tenant) => (_jsxs("li", { style: { marginBottom: 4 }, children: [_jsx(StatusPill, { status: tenant.rateLimitStatus }), " ", tenant.tenantId, ":", ' ', tenant.tokens.toLocaleString(), " tokens ($", tenant.cost.toFixed(2), ")"] }, tenant.tenantId))) })] })] }) }), _jsxs("footer", { style: { marginTop: 24, color: '#64748b' }, children: ["Generated ", new Date(snapshot.generatedAt).toLocaleString(), " \u2022 Internal visibility only"] })] }));
}
