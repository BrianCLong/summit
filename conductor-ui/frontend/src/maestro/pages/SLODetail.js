import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useFocusTrap } from '../utils/useFocusTrap';
export default function SLODetail() {
    const { sloId } = useParams();
    const [slo, setSLO] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingAlert, setEditingAlert] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');
    const [hasEditPermission, setHasEditPermission] = useState(false);
    const { getSLO, getSLOHistory, updateAlertRule, checkPermission } = api();
    const dialogRef = React.useRef(null);
    useFocusTrap(dialogRef, !!editingAlert, () => setEditingAlert(null));
    useEffect(() => {
        if (sloId) {
            loadSLODetails();
            checkEditPermission();
        }
    }, [sloId, timeRange]);
    const loadSLODetails = async () => {
        if (!sloId)
            return;
        setLoading(true);
        try {
            const [sloData, historyData] = await Promise.all([
                getSLO(sloId),
                getSLOHistory(sloId, timeRange),
            ]);
            setSLO({
                ...sloData,
                history: historyData,
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load SLO details');
        }
        finally {
            setLoading(false);
        }
    };
    const checkEditPermission = async () => {
        try {
            const allowed = await checkPermission('update_slo_alerts');
            setHasEditPermission(allowed);
        }
        catch {
            setHasEditPermission(false);
        }
    };
    const handleSaveAlert = async (alertRule) => {
        if (!hasEditPermission || !sloId)
            return;
        try {
            await updateAlertRule(sloId, alertRule.id, alertRule);
            await loadSLODetails(); // Refresh data
            setEditingAlert(null);
        }
        catch (err) {
            console.error('Failed to update alert rule:', err);
        }
    };
    const formatPercentage = (value) => `${(value * 100).toFixed(2)}%`;
    const getBurnRateColor = (burnRate) => {
        if (burnRate > 10)
            return 'text-red-600';
        if (burnRate > 5)
            return 'text-orange-600';
        if (burnRate > 2)
            return 'text-yellow-600';
        return 'text-green-600';
    };
    const getErrorBudgetColor = (consumedPercentage) => {
        if (consumedPercentage > 90)
            return 'bg-red-500';
        if (consumedPercentage > 70)
            return 'bg-orange-500';
        if (consumedPercentage > 50)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("div", { className: "animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" }) }));
    }
    if (error || !slo) {
        return (_jsx("div", { className: "p-6", children: _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("h2", { className: "text-lg font-semibold text-red-800", children: "Error Loading SLO" }), _jsx("p", { className: "text-red-600", children: error || 'SLO not found' })] }) }));
    }
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: slo.name }), _jsx("p", { className: "text-gray-600 mt-1", children: slo.description }), _jsxs("div", { className: "flex items-center gap-4 mt-2 text-sm text-gray-500", children: [_jsxs("span", { children: ["Service: ", slo.service] }), _jsxs("span", { children: ["Window: ", slo.window] }), _jsxs("span", { children: ["Type: ", slo.sli.type.replace('_', ' ').toUpperCase()] })] })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsxs("select", { value: timeRange, onChange: (e) => setTimeRange(e.target.value), className: "border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "1h", children: "Last Hour" }), _jsx("option", { value: "6h", children: "Last 6 Hours" }), _jsx("option", { value: "24h", children: "Last 24 Hours" }), _jsx("option", { value: "7d", children: "Last 7 Days" }), _jsx("option", { value: "30d", children: "Last 30 Days" })] }) })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Current SLI" }), _jsx("div", { className: "text-3xl font-bold text-gray-900 mt-2", children: formatPercentage(slo.status.currentSLI) }), _jsxs("div", { className: "text-sm text-gray-600 mt-1", children: ["Target: ", formatPercentage(slo.objective)] }), _jsx("div", { className: `text-sm mt-1 ${slo.status.currentSLI >= slo.objective ? 'text-green-600' : 'text-red-600'}`, children: slo.status.currentSLI >= slo.objective ? 'Meeting SLO' : 'Below Target' })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Error Budget" }), _jsx("div", { className: "text-3xl font-bold text-gray-900 mt-2", children: formatPercentage(slo.status.errorBudget.remaining / slo.status.errorBudget.total) }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2 mt-3", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getErrorBudgetColor(slo.status.errorBudget.consumedPercentage)}`, style: { width: `${slo.status.errorBudget.consumedPercentage}%` } }) }), _jsxs("div", { className: "text-sm text-gray-600 mt-1", children: [formatPercentage(slo.status.errorBudget.consumedPercentage), " consumed"] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Burn Rate" }), _jsxs("div", { className: `text-3xl font-bold mt-2 ${getBurnRateColor(slo.status.errorBudget.burnRate)}`, children: [slo.status.errorBudget.burnRate.toFixed(1), "x"] }), slo.status.errorBudget.exhaustionDate && (_jsxs("div", { className: "text-sm text-red-600 mt-1", children: ["Exhaustion: ", new Date(slo.status.errorBudget.exhaustionDate).toLocaleDateString()] }))] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-6 py-4 border-b", children: _jsx("h2", { className: "text-lg font-semibold", children: "SLI & Error Budget History" }) }), _jsx("div", { className: "p-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 border-b pb-2", children: [_jsx("div", { children: "Time" }), _jsx("div", { children: "SLI" }), _jsx("div", { children: "Error Budget" }), _jsx("div", { children: "Burn Rate" })] }), slo.history.slice(-10).map((point, index) => (_jsxs("div", { className: "grid grid-cols-4 gap-4 text-sm", children: [_jsx("div", { className: "text-gray-600", children: new Date(point.timestamp).toLocaleTimeString() }), _jsx("div", { className: point.sli >= slo.objective ? 'text-green-600' : 'text-red-600', children: formatPercentage(point.sli) }), _jsx("div", { children: formatPercentage(point.errorBudgetConsumed) }), _jsxs("div", { className: getBurnRateColor(point.burnRate), children: [point.burnRate.toFixed(1), "x"] })] }, index)))] }) })] }), slo.incidents.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-6 py-4 border-b", children: _jsx("h2", { className: "text-lg font-semibold", children: "Related Incidents" }) }), _jsx("div", { className: "p-6", children: _jsx("div", { className: "space-y-4", children: slo.incidents.map((incident) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900", children: incident.title }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Started: ", new Date(incident.startedAt).toLocaleString()] })] }), _jsx("div", { className: "text-right", children: _jsxs("div", { className: "text-sm font-medium text-red-600", children: ["-", formatPercentage(incident.impact), " SLI Impact"] }) })] }, incident.id))) }) })] }))] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsxs("div", { className: "px-4 py-3 border-b flex items-center justify-between", children: [_jsx("h3", { className: "font-semibold", children: "Alert Rules" }), hasEditPermission && (_jsx("button", { className: "text-sm text-blue-600 hover:text-blue-800", children: "+ Add Rule" }))] }), _jsx("div", { className: "p-4 space-y-3", children: slo.alertRules.map((rule) => (_jsx("div", { className: "border rounded p-3", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h4", { className: "text-sm font-medium", children: rule.name }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`, children: rule.enabled ? 'Active' : 'Disabled' }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                                            rule.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                                                rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                                    'bg-blue-100 text-blue-800'}`, children: rule.severity })] }), _jsxs("div", { className: "text-xs text-gray-600 mt-1", children: [rule.condition, " ", rule.threshold] }), rule.channels.length > 0 && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["Channels: ", rule.channels.join(', ')] }))] }), hasEditPermission && (_jsx("button", { onClick: () => setEditingAlert(rule), className: "text-sm text-blue-600 hover:text-blue-800", children: "Edit" }))] }) }, rule.id))) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-4 py-3 border-b", children: _jsx("h3", { className: "font-semibold", children: "Configuration" }) }), _jsxs("div", { className: "p-4 space-y-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "SLI Query" }), _jsx("div", { className: "mt-1 p-2 bg-gray-50 rounded text-xs font-mono", children: slo.sli.query })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Objective" }), _jsx("div", { className: "text-sm text-gray-600", children: formatPercentage(slo.objective) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Time Window" }), _jsx("div", { className: "text-sm text-gray-600", children: slo.window })] })] })] })] })] }), editingAlert && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", children: _jsxs("div", { ref: dialogRef, className: "w-full max-w-md rounded-lg bg-white p-6", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: "Edit Alert Rule" }), _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                handleSaveAlert(editingAlert);
                            }, children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Name" }), _jsx("input", { type: "text", className: "mt-1 block w-full rounded border border-gray-300 px-3 py-2", value: editingAlert.name, onChange: (e) => setEditingAlert({ ...editingAlert, name: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Condition" }), _jsxs("select", { className: "mt-1 block w-full rounded border border-gray-300 px-3 py-2", value: editingAlert.condition, onChange: (e) => setEditingAlert({ ...editingAlert, condition: e.target.value }), children: [_jsx("option", { value: "burn_rate_gt", children: "Burn rate greater than" }), _jsx("option", { value: "error_budget_lt", children: "Error budget less than" }), _jsx("option", { value: "sli_lt", children: "SLI less than" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Threshold" }), _jsx("input", { type: "number", step: "0.01", className: "mt-1 block w-full rounded border border-gray-300 px-3 py-2", value: editingAlert.threshold, onChange: (e) => setEditingAlert({ ...editingAlert, threshold: parseFloat(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Severity" }), _jsxs("select", { className: "mt-1 block w-full rounded border border-gray-300 px-3 py-2", value: editingAlert.severity, onChange: (e) => setEditingAlert({ ...editingAlert, severity: e.target.value }), children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" }), _jsx("option", { value: "critical", children: "Critical" })] })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "enabled", className: "rounded border-gray-300", checked: editingAlert.enabled, onChange: (e) => setEditingAlert({ ...editingAlert, enabled: e.target.checked }) }), _jsx("label", { htmlFor: "enabled", className: "ml-2 text-sm text-gray-700", children: "Enable this alert rule" })] })] }), _jsxs("div", { className: "mt-6 flex gap-3", children: [_jsx("button", { type: "submit", className: "flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700", children: "Save Changes" }), _jsx("button", { type: "button", onClick: () => setEditingAlert(null), className: "flex-1 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50", children: "Cancel" })] })] })] }) }))] }));
}
