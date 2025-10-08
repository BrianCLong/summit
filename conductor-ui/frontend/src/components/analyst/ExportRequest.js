import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ExplainabilityPanel } from './ExplainabilityPanel';
export const ExportRequest = () => {
    const [exportFormat, setExportFormat] = useState({
        format: 'json',
        includeProvenance: true,
        includeMetadata: true
    });
    const [policyCheck, setPolicyCheck] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [stepUpRequired, setStepUpRequired] = useState(false);
    const checkExportPolicy = async () => {
        setIsChecking(true);
        try {
            const response = await fetch('/api/export/policy-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    format: exportFormat.format,
                    includeProvenance: exportFormat.includeProvenance,
                    stepUpToken: localStorage.getItem('stepUpToken')
                })
            });
            const result = await response.json();
            setPolicyCheck(result.outcome);
            setStepUpRequired(result.requiresStepUp || false);
        }
        catch (error) {
            setPolicyCheck({
                decision: 'deny',
                reason: 'Error checking export policy: ' + error,
                rule_id: 'error'
            });
        }
        finally {
            setIsChecking(false);
        }
    };
    const requestStepUp = async () => {
        // Trigger step-up authentication
        window.dispatchEvent(new CustomEvent('request-stepup', {
            detail: { reason: 'Export requires additional authentication' }
        }));
    };
    const executeExport = async () => {
        if (policyCheck?.decision !== 'allow') {
            alert('Export is not allowed by policy. Please check the policy outcome.');
            return;
        }
        setIsExporting(true);
        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Step-Up-Token': localStorage.getItem('stepUpToken') || ''
                },
                body: JSON.stringify(exportFormat)
            });
            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export.${exportFormat.format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            alert('Export completed successfully!');
        }
        catch (error) {
            alert('Export failed: ' + error);
        }
        finally {
            setIsExporting(false);
        }
    };
    return (_jsxs("div", { className: "export-request p-4 space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold", children: "Export Data" }), _jsxs("div", { className: "format-options space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Export Format" }), _jsxs("select", { value: exportFormat.format, onChange: (e) => setExportFormat({ ...exportFormat, format: e.target.value }), className: "w-full p-2 border rounded", children: [_jsx("option", { value: "json", children: "JSON" }), _jsx("option", { value: "csv", children: "CSV" }), _jsx("option", { value: "graphml", children: "GraphML" }), _jsx("option", { value: "pdf", children: "PDF Report" })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: exportFormat.includeProvenance, onChange: (e) => setExportFormat({ ...exportFormat, includeProvenance: e.target.checked }) }), _jsx("span", { className: "text-sm", children: "Include Provenance" })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: exportFormat.includeMetadata, onChange: (e) => setExportFormat({ ...exportFormat, includeMetadata: e.target.checked }) }), _jsx("span", { className: "text-sm", children: "Include Metadata" })] })] })] }), _jsxs("div", { className: "actions flex gap-2", children: [_jsx("button", { onClick: checkExportPolicy, disabled: isChecking, className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50", children: isChecking ? 'Checking Policy...' : 'Check Export Policy' }), policyCheck?.decision === 'allow' && (_jsx("button", { onClick: executeExport, disabled: isExporting, className: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50", children: isExporting ? 'Exporting...' : 'Execute Export' })), stepUpRequired && policyCheck?.decision === 'deny' && (_jsx("button", { onClick: requestStepUp, className: "px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600", children: "\uD83D\uDD10 Authenticate to Export" }))] }), policyCheck && (_jsx(ExplainabilityPanel, { policyOutcome: policyCheck, queryContext: { exportFormat } })), _jsxs("div", { className: "info-box mt-4 p-3 bg-blue-50 border border-blue-200 rounded", children: [_jsx("h4", { className: "font-semibold text-sm text-blue-800 mb-2", children: "Export Policy Preview" }), _jsxs("div", { className: "text-sm text-blue-700 space-y-1", children: [_jsx("p", { children: "\u2022 Exports are subject to OPA policy evaluation" }), _jsx("p", { children: "\u2022 High-classification data may require step-up authentication" }), _jsx("p", { children: "\u2022 DLP policies will scan for sensitive data patterns" }), _jsx("p", { children: "\u2022 All exports are logged with provenance tracking" })] })] })] }));
};
