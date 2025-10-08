import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Policy Editor - RBAC Phase 3
// Policy editor with preview, diff, and rollback capabilities
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
export const PolicyEditor = () => {
    const [policyId, setPolicyId] = useState('');
    const [policyContent, setPolicyContent] = useState('');
    const [policyVersions, setPolicyVersions] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [preview, setPreview] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    // Load policy versions on mount
    useEffect(() => {
        if (policyId) {
            fetchPolicyVersions();
        }
    }, [policyId]);
    const fetchPolicyVersions = async () => {
        try {
            const response = await fetch(`/api/policies/${policyId}/versions`);
            if (!response.ok)
                throw new Error('Failed to fetch policy versions');
            const versions = await response.json();
            setPolicyVersions(versions);
            if (versions.length > 0) {
                setPolicyContent(versions[0].content);
                setSelectedVersion(versions[0]);
            }
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handlePreview = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/policies/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policy_id: policyId,
                    proposed_content: policyContent,
                }),
            });
            if (!response.ok)
                throw new Error('Failed to generate preview');
            const previewData = await response.json();
            setPreview(previewData);
            setShowPreview(true);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDiff = () => {
        if (selectedVersion) {
            setShowDiff(true);
        }
    };
    const handleApply = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch('/api/policies/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policy_id: policyId,
                    content: policyContent,
                    changes_summary: preview?.diff || {},
                }),
            });
            if (!response.ok)
                throw new Error('Failed to apply policy');
            const result = await response.json();
            setSuccessMessage(`Policy applied successfully. New version: ${result.version}`);
            fetchPolicyVersions(); // Refresh versions
            setShowPreview(false);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRollback = async (versionId) => {
        if (!confirm('Are you sure you want to rollback to this version?')) {
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const response = await fetch('/api/policies/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policy_id: policyId,
                    version_id: versionId,
                }),
            });
            if (!response.ok)
                throw new Error('Failed to rollback policy');
            const result = await response.json();
            setSuccessMessage(`Policy rolled back to version ${result.version}`);
            fetchPolicyVersions();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const getRiskColor = (riskScore) => {
        if (riskScore >= 80)
            return 'bg-red-100 text-red-800';
        if (riskScore >= 60)
            return 'bg-orange-100 text-orange-800';
        if (riskScore >= 40)
            return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };
    const getBlastRadiusColor = (radius) => {
        const colors = {
            critical: 'text-red-600',
            high: 'text-orange-600',
            medium: 'text-yellow-600',
            low: 'text-green-600',
        };
        return colors[radius] || 'text-gray-600';
    };
    return (_jsxs("div", { className: "policy-editor p-6 max-w-7xl mx-auto", children: [_jsx("h1", { className: "text-3xl font-bold mb-6", children: "Policy Editor - RBAC Phase 3" }), error && (_jsx(Alert, { className: "mb-4 border-red-500 bg-red-50", children: _jsx(AlertDescription, { className: "text-red-800", children: error }) })), successMessage && (_jsx(Alert, { className: "mb-4 border-green-500 bg-green-50", children: _jsx(AlertDescription, { className: "text-green-800", children: successMessage }) })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Policy ID" }), _jsx("input", { type: "text", value: policyId, onChange: (e) => setPolicyId(e.target.value), placeholder: "Enter policy ID (e.g., abac.enhanced)", className: "w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Policy Content (Rego)" }), _jsx("textarea", { value: policyContent, onChange: (e) => setPolicyContent(e.target.value), rows: 20, className: "w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500", placeholder: "Enter policy content in Rego format..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Version History" }), _jsx("div", { className: "border border-gray-300 rounded-md p-4 h-[500px] overflow-y-auto", children: policyVersions.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "No versions available" })) : (policyVersions.map((version) => (_jsxs("div", { className: "mb-4 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50", onClick: () => {
                                        setSelectedVersion(version);
                                        setPolicyContent(version.content);
                                    }, children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsxs("span", { className: "font-semibold", children: ["Version ", version.version] }), version.approved && (_jsx("span", { className: "px-2 py-1 bg-green-100 text-green-800 text-xs rounded", children: "Approved" }))] }), _jsx("p", { className: "text-sm text-gray-600 mb-2", children: version.changes_summary }), _jsxs("div", { className: "text-xs text-gray-500", children: [_jsxs("p", { children: ["By: ", version.author] }), _jsxs("p", { children: ["At: ", new Date(version.timestamp).toLocaleString()] })] }), _jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                handleRollback(version.id);
                                            }, className: "mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600", children: "Rollback to this version" })] }, version.id)))) })] })] }), _jsxs("div", { className: "flex gap-4 mb-6", children: [_jsx("button", { onClick: handlePreview, disabled: loading || !policyContent, className: "px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed", children: loading ? 'Loading...' : 'Preview Changes' }), _jsx("button", { onClick: handleDiff, disabled: !selectedVersion || !policyContent, className: "px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed", children: "Show Diff" }), _jsx("button", { onClick: handleApply, disabled: loading || !preview, className: "px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed", children: "Apply Policy" })] }), showPreview && preview && (_jsxs("div", { className: "border border-blue-300 rounded-lg p-6 bg-blue-50 mb-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Policy Change Preview" }), _jsx("div", { className: "mb-4", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "text-sm font-medium", children: "Risk Score:" }), _jsxs("span", { className: `px-4 py-2 rounded-md font-bold ${getRiskColor(preview.risk_score)}`, children: [preview.risk_score, "/100"] })] }) }), _jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "font-semibold mb-2", children: "Impact Analysis" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsxs("p", { children: ["Affected Users: ", _jsx("strong", { children: preview.impact_analysis.affected_users })] }), _jsxs("p", { children: ["Affected Resources: ", _jsx("strong", { children: preview.impact_analysis.affected_resources })] })] }), _jsxs("div", { children: [_jsxs("p", { children: ["Permissions Granted: ", _jsxs("strong", { className: "text-green-600", children: ["+", preview.impact_analysis.permission_changes.granted] })] }), _jsxs("p", { children: ["Permissions Revoked: ", _jsxs("strong", { className: "text-red-600", children: ["-", preview.impact_analysis.permission_changes.revoked] })] })] })] }), _jsxs("p", { className: "mt-2", children: ["Blast Radius: ", _jsx("strong", { className: getBlastRadiusColor(preview.impact_analysis.blast_radius), children: preview.impact_analysis.blast_radius.toUpperCase() })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold mb-2", children: "Changes" }), preview.diff.added_rules.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "text-sm font-medium text-green-600", children: "Added Rules:" }), _jsx("ul", { className: "list-disc list-inside text-sm", children: preview.diff.added_rules.map((rule, idx) => (_jsx("li", { className: "text-green-700", children: rule }, idx))) })] })), preview.diff.removed_rules.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "text-sm font-medium text-red-600", children: "Removed Rules:" }), _jsx("ul", { className: "list-disc list-inside text-sm", children: preview.diff.removed_rules.map((rule, idx) => (_jsx("li", { className: "text-red-700", children: rule }, idx))) })] })), preview.diff.modified_rules.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "text-sm font-medium text-orange-600", children: "Modified Rules:" }), _jsx("ul", { className: "list-disc list-inside text-sm", children: preview.diff.modified_rules.map((rule, idx) => (_jsx("li", { className: "text-orange-700", children: rule }, idx))) })] }))] }), preview.risk_score >= 80 && (_jsx(Alert, { className: "mt-4 border-red-500 bg-red-50", children: _jsxs(AlertDescription, { className: "text-red-800", children: [_jsx("strong", { children: "\u26A0\uFE0F HIGH RISK CHANGE" }), " - This policy change has a critical blast radius. Consider staging the change or requiring additional approvals."] }) }))] })), showDiff && selectedVersion && (_jsxs("div", { className: "border border-gray-300 rounded-lg p-6 bg-gray-50 mb-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Policy Diff" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("h3", { className: "font-semibold mb-2", children: ["Current (Version ", selectedVersion.version, ")"] }), _jsx("pre", { className: "bg-white p-4 rounded border border-gray-200 text-xs overflow-x-auto", children: selectedVersion.content })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold mb-2", children: "Proposed" }), _jsx("pre", { className: "bg-white p-4 rounded border border-gray-200 text-xs overflow-x-auto", children: policyContent })] })] })] })), _jsxs("div", { className: "border border-gray-300 rounded-lg p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Change Log" }), _jsx("p", { className: "text-sm text-gray-600", children: "All policy changes are tracked with approval status, author, and timestamp. Rollback capability allows reverting to any previous version with full audit trail." })] })] }));
};
export default PolicyEditor;
