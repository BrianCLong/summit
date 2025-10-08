import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
export default function IncidentDetail() {
    const { incidentId } = useParams();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPhase, setSelectedPhase] = useState('all');
    const { getIncident } = api();
    useEffect(() => {
        if (incidentId) {
            loadIncidentDetails();
        }
    }, [incidentId]);
    const loadIncidentDetails = async () => {
        if (!incidentId)
            return;
        setLoading(true);
        try {
            const data = await getIncident(incidentId);
            setIncident(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load incident');
        }
        finally {
            setLoading(false);
        }
    };
    const groupedEvents = useMemo(() => {
        if (!incident?.events)
            return [];
        const phases = [
            { id: 'detection', label: 'Detection & Alert', types: ['alert'] },
            { id: 'investigation', label: 'Investigation', types: ['run', 'user_action'] },
            { id: 'response', label: 'Response & Changes', types: ['system_change', 'escalation'] },
        ];
        return phases.map(phase => ({
            ...phase,
            events: incident.events
                .filter(event => phase.types.includes(event.type))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        }));
    }, [incident?.events]);
    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-red-100 text-red-800';
            case 'investigating': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };
    const getEventIcon = (type) => {
        switch (type) {
            case 'alert': return '🚨';
            case 'run': return '⚙️';
            case 'user_action': return '👤';
            case 'system_change': return '🔧';
            case 'escalation': return '📈';
            default: return '📝';
        }
    };
    const formatDuration = (startTime, endTime) => {
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date();
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60)
            return `${diffMins}m`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("div", { className: "animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" }) }));
    }
    if (error || !incident) {
        return (_jsx("div", { className: "p-6", children: _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [_jsx("h2", { className: "text-lg font-semibold text-red-800", children: "Error Loading Incident" }), _jsx("p", { className: "text-red-600", children: error || 'Incident not found' })] }) }));
    }
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: incident.title }), _jsx("span", { className: `px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(incident.status)}`, children: incident.status.toUpperCase() }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}` }), _jsx("span", { className: "text-sm font-medium", children: incident.severity.toUpperCase() })] })] }), _jsx("p", { className: "text-gray-600 max-w-3xl", children: incident.description }), _jsxs("div", { className: "flex items-center gap-4 mt-3 text-sm text-gray-500", children: [_jsxs("span", { children: ["Started: ", new Date(incident.startedAt).toLocaleString()] }), incident.resolvedAt && (_jsxs("span", { children: ["Resolved: ", new Date(incident.resolvedAt).toLocaleString()] })), _jsxs("span", { children: ["Duration: ", formatDuration(incident.startedAt, incident.resolvedAt)] }), incident.assignedTo && _jsxs("span", { children: ["Assigned to: ", incident.assignedTo] })] })] }) }), incident.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-3", children: incident.tags.map((tag) => (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md", children: tag }, tag))) }))] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-6 py-4 border-b", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Incident Timeline" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setSelectedPhase('all'), className: `px-3 py-1 text-sm rounded ${selectedPhase === 'all'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'text-gray-600 hover:bg-gray-100'}`, children: "All Events" }), groupedEvents.map((phase) => (_jsxs("button", { onClick: () => setSelectedPhase(phase.id), className: `px-3 py-1 text-sm rounded ${selectedPhase === phase.id
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'text-gray-600 hover:bg-gray-100'}`, children: [phase.label, " (", phase.events.length, ")"] }, phase.id)))] })] }) }), _jsx("div", { className: "p-6", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300" }), (selectedPhase === 'all' ? incident.events :
                                                groupedEvents.find(p => p.id === selectedPhase)?.events || []).map((event, index) => (_jsxs("div", { className: "relative flex items-start gap-4 pb-8", children: [_jsx("div", { className: "flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-lg z-10", children: getEventIcon(event.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-900", children: event.title }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: event.description }), _jsxs("div", { className: "flex items-center gap-3 mt-2 text-xs text-gray-500", children: [_jsx("span", { children: new Date(event.timestamp).toLocaleString() }), _jsxs("span", { children: ["by ", event.actor] }), _jsx("span", { className: `px-2 py-1 rounded ${getSeverityColor(event.severity)} text-white`, children: event.severity })] })] }) }), Object.keys(event.metadata).length > 0 && (_jsxs("details", { className: "mt-3", children: [_jsx("summary", { className: "text-xs text-blue-600 cursor-pointer hover:text-blue-800", children: "View details" }), _jsx("div", { className: "mt-2 p-3 bg-gray-50 rounded text-xs", children: _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(event.metadata, null, 2) }) })] }))] })] }, event.id))), incident.events.length === 0 && (_jsx("div", { className: "text-center py-12 text-gray-500", children: "No timeline events available" }))] }) })] }) }), _jsxs("div", { className: "space-y-6", children: [incident.relatedRuns.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-4 py-3 border-b", children: _jsx("h3", { className: "font-semibold", children: "Related Runs" }) }), _jsx("div", { className: "p-4 space-y-3", children: incident.relatedRuns.map((run) => (_jsxs("div", { className: "border rounded p-3", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx(Link, { to: `/maestro/runs/${run.id}`, className: "text-sm font-medium text-blue-600 hover:text-blue-800", children: run.name }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${run.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                run.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                                    run.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-800'}`, children: run.status })] }), _jsxs("div", { className: "text-xs text-gray-500 space-y-1", children: [_jsxs("div", { children: ["Started: ", new Date(run.startedAt).toLocaleString()] }), run.completedAt && (_jsxs("div", { children: ["Completed: ", new Date(run.completedAt).toLocaleString()] })), run.duration && (_jsxs("div", { children: ["Duration: ", Math.floor(run.duration / 1000), "s"] })), _jsxs("div", { children: ["Triggered by: ", run.triggeredBy] })] })] }, run.id))) })] })), incident.impactedSLOs.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-4 py-3 border-b", children: _jsx("h3", { className: "font-semibold", children: "Impacted SLOs" }) }), _jsx("div", { className: "p-4 space-y-3", children: incident.impactedSLOs.map((slo) => (_jsxs("div", { className: "border rounded p-3", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx(Link, { to: `/maestro/slo/${slo.id}`, className: "text-sm font-medium text-blue-600 hover:text-blue-800", children: slo.name }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${slo.impact === 'critical' ? 'bg-red-100 text-red-800' :
                                                                slo.impact === 'major' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-yellow-100 text-yellow-800'}`, children: slo.impact })] }), _jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [_jsxs("div", { children: ["Service: ", slo.service] }), _jsxs("div", { children: ["Current SLI: ", (slo.currentSLI * 100).toFixed(2), "%"] }), _jsxs("div", { children: ["Objective: ", (slo.objective * 100).toFixed(2), "%"] }), _jsxs("div", { children: ["Error Budget: ", slo.errorBudgetRemaining.toFixed(1), "%"] })] })] }, slo.id))) })] })), incident.evidenceLinks.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-4 py-3 border-b", children: _jsx("h3", { className: "font-semibold", children: "Evidence & Artifacts" }) }), _jsx("div", { className: "p-4 space-y-2", children: incident.evidenceLinks.map((evidence) => (_jsxs("div", { className: "flex items-center gap-3 p-2 hover:bg-gray-50 rounded", children: [_jsxs("div", { className: "text-lg", children: [evidence.type === 'log' && '📋', evidence.type === 'screenshot' && '📸', evidence.type === 'report' && '📊', evidence.type === 'artifact' && '📁'] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("a", { href: evidence.url, target: "_blank", rel: "noopener noreferrer", className: "text-sm font-medium text-blue-600 hover:text-blue-800 truncate block", children: evidence.title }), _jsx("div", { className: "text-xs text-gray-500", children: new Date(evidence.timestamp).toLocaleString() })] })] }, evidence.id))) })] }))] })] })] }));
}
