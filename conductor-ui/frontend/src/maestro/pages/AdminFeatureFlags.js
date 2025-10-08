import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useFocusTrap } from '../utils/useFocusTrap';
export default function AdminFeatureFlags() {
    const [flags, setFlags] = useState([]);
    const [auditLog, setAuditLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const [reason, setReason] = useState('');
    const [showAuditLog, setShowAuditLog] = useState(false);
    const { getFeatureFlags, updateFeatureFlag, getAuditLog } = api();
    const confirmDialogRef = useRef(null);
    useFocusTrap(confirmDialogRef, showConfirmDialog, () => setShowConfirmDialog(false));
    useEffect(() => {
        loadFlags();
        loadAuditLog();
    }, []);
    const loadFlags = async () => {
        try {
            const flagsData = await getFeatureFlags();
            setFlags(flagsData);
        }
        catch (error) {
            console.error('Failed to load feature flags:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const loadAuditLog = async () => {
        try {
            const auditData = await getAuditLog('feature_flags', { limit: 50 });
            setAuditLog(auditData);
        }
        catch (error) {
            console.error('Failed to load audit log:', error);
        }
    };
    const handleToggleFlag = (flag, newValue) => {
        setPendingUpdate({ flag, newValue });
        setShowConfirmDialog(true);
    };
    const confirmToggle = async () => {
        if (!pendingUpdate || !reason.trim())
            return;
        try {
            const updatedFlag = await updateFeatureFlag(pendingUpdate.flag.id, {
                enabled: pendingUpdate.newValue,
                reason: reason.trim(),
            });
            // Update local state optimistically
            setFlags(prev => prev.map(f => f.id === updatedFlag.id ? updatedFlag : f));
            // Emit audit event
            const auditEvent = {
                id: `audit-${Date.now()}`,
                flagId: pendingUpdate.flag.id,
                action: pendingUpdate.newValue ? 'enabled' : 'disabled',
                previousValue: pendingUpdate.flag.enabled,
                newValue: pendingUpdate.newValue,
                reason: reason.trim(),
                performedBy: 'current-user', // In real app, get from auth context
                timestamp: new Date().toISOString(),
            };
            setAuditLog(prev => [auditEvent, ...prev]);
        }
        catch (error) {
            console.error('Failed to update feature flag:', error);
            // In a real app, show error notification
            // Rollback optimistic update on failure
            setFlags(prev => prev.map(f => f.id === pendingUpdate.flag.id ? pendingUpdate.flag : f));
        }
        finally {
            setShowConfirmDialog(false);
            setPendingUpdate(null);
            setReason('');
        }
    };
    const filteredFlags = flags.filter(flag => flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const getFlagsByCategory = () => {
        const categories = {};
        filteredFlags.forEach(flag => {
            const category = flag.metadata?.category || 'General';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(flag);
        });
        return categories;
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("div", { className: "animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" }) }));
    }
    const flagsByCategory = getFlagsByCategory();
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Feature Flags Administration" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Manage feature flags and rollout controls. All changes are audited and logged." })] }), _jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("input", { type: "text", placeholder: "Search flags...", className: "w-80 px-3 py-2 border border-gray-300 rounded-lg", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) }), _jsxs("div", { className: "text-sm text-gray-500", children: [filteredFlags.length, " of ", flags.length, " flags"] })] }), _jsxs("button", { onClick: () => setShowAuditLog(!showAuditLog), className: "px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg", children: [showAuditLog ? 'Hide' : 'Show', " Audit Log"] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: `${showAuditLog ? 'lg:col-span-2' : 'lg:col-span-3'}`, children: Object.keys(flagsByCategory).map(category => (_jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: category }), _jsx("div", { className: "space-y-4", children: flagsByCategory[category].map(flag => (_jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: flag.name }), _jsx("code", { className: "px-2 py-1 bg-gray-100 text-sm rounded", children: flag.key }), _jsx("span", { className: `px-2 py-1 text-xs font-medium rounded-full ${flag.enabled
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-gray-100 text-gray-800'}`, children: flag.enabled ? 'Enabled' : 'Disabled' }), flag.rolloutPercentage !== undefined && (_jsxs("span", { className: "px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full", children: [flag.rolloutPercentage, "% rollout"] }))] }), _jsx("p", { className: "text-gray-600 mb-3", children: flag.description }), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-500", children: [_jsxs("span", { children: ["Modified: ", new Date(flag.updatedAt).toLocaleString()] }), _jsxs("span", { children: ["by ", flag.lastModifiedBy] })] }), flag.conditions && flag.conditions.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Conditions:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: flag.conditions.map((condition, index) => (_jsx("span", { className: "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded", children: condition }, index))) })] }))] }), _jsx("div", { className: "ml-4", children: _jsx("button", { onClick: () => handleToggleFlag(flag, !flag.enabled), className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${flag.enabled ? 'bg-blue-600' : 'bg-gray-200'}`, children: _jsx("span", { className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${flag.enabled ? 'translate-x-5' : 'translate-x-0'}` }) }) })] }) }, flag.id))) })] }, category))) }), showAuditLog && (_jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow", children: [_jsx("div", { className: "px-6 py-4 border-b", children: _jsx("h3", { className: "text-lg font-semibold", children: "Recent Changes" }) }), _jsx("div", { className: "p-4 max-h-96 overflow-y-auto", children: auditLog.length === 0 ? (_jsx("div", { className: "text-center text-gray-500 py-8", children: "No recent changes" })) : (_jsx("div", { className: "space-y-4", children: auditLog.map(event => (_jsxs("div", { className: "border-l-4 border-blue-500 pl-4 py-2", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: `px-2 py-1 text-xs font-medium rounded ${event.action === 'enabled' ? 'bg-green-100 text-green-800' :
                                                            event.action === 'disabled' ? 'bg-red-100 text-red-800' :
                                                                'bg-blue-100 text-blue-800'}`, children: event.action.toUpperCase() }) }), _jsxs("div", { className: "text-sm text-gray-900 mb-1", children: ["Flag: ", flags.find(f => f.id === event.flagId)?.name || 'Unknown'] }), _jsxs("div", { className: "text-xs text-gray-600 mb-2", children: ["Reason: ", event.reason] }), _jsxs("div", { className: "text-xs text-gray-500", children: [event.performedBy, " \u2022 ", new Date(event.timestamp).toLocaleString()] })] }, event.id))) })) })] }) }))] }), showConfirmDialog && pendingUpdate && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", children: _jsxs("div", { ref: confirmDialogRef, className: "w-full max-w-md rounded-lg bg-white p-6", onClick: (e) => e.stopPropagation(), children: [_jsxs("h2", { className: "text-lg font-semibold mb-4", children: [pendingUpdate.newValue ? 'Enable' : 'Disable', " Feature Flag"] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "text-sm text-gray-700 mb-2", children: [_jsx("strong", { children: pendingUpdate.flag.name }), " (", pendingUpdate.flag.key, ")"] }), _jsx("div", { className: "text-sm text-gray-600 mb-4", children: pendingUpdate.flag.description }), _jsxs("div", { className: `p-3 rounded ${pendingUpdate.newValue
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-red-50 border border-red-200'}`, children: [_jsx("div", { className: "text-sm font-medium", children: pendingUpdate.newValue
                                                ? '✅ This flag will be ENABLED'
                                                : '❌ This flag will be DISABLED' }), pendingUpdate.flag.rolloutPercentage !== undefined && (_jsxs("div", { className: "text-sm text-gray-600 mt-1", children: ["Rollout percentage: ", pendingUpdate.flag.rolloutPercentage, "%"] }))] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Reason for change (required)" }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg resize-none", rows: 3, placeholder: "Explain why this change is being made...", autoFocus: true })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: confirmToggle, disabled: !reason.trim(), className: "flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: "Confirm Change" }), _jsx("button", { onClick: () => {
                                        setShowConfirmDialog(false);
                                        setPendingUpdate(null);
                                        setReason('');
                                    }, className: "flex-1 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50", children: "Cancel" })] })] }) }))] }));
}
