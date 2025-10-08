import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
export const QueryBuilder = () => {
    const [conditions, setConditions] = useState([
        { field: '', operator: '', value: '' }
    ]);
    const [policyPreview, setPolicyPreview] = useState(null);
    const [isPreviewingExport, setIsPreviewingExport] = useState(false);
    const fieldOptions = [
        { value: 'entity.type', label: 'Entity Type' },
        { value: 'entity.classification', label: 'Classification' },
        { value: 'relationship.type', label: 'Relationship Type' },
        { value: 'timestamp', label: 'Timestamp' },
        { value: 'confidence', label: 'Confidence Score' },
    ];
    const operatorOptions = [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
    ];
    const addCondition = () => {
        setConditions([...conditions, { field: '', operator: '', value: '' }]);
    };
    const removeCondition = (index) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };
    const updateCondition = (index, field, value) => {
        const newConditions = [...conditions];
        newConditions[index][field] = value;
        setConditions(newConditions);
    };
    const previewExportPolicy = async () => {
        setIsPreviewingExport(true);
        // Call OPA policy endpoint to preview export
        try {
            const response = await fetch('/api/policy/preview-export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: conditions,
                    action: 'export',
                    stepUpToken: localStorage.getItem('stepUpToken')
                })
            });
            const result = await response.json();
            setPolicyPreview(result);
        }
        catch (error) {
            setPolicyPreview({
                allowed: false,
                reason: 'Error checking policy: ' + error,
                requiredStepUp: false
            });
        }
        finally {
            setIsPreviewingExport(false);
        }
    };
    const executeQuery = async () => {
        // Execute the actual query
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditions })
        });
        const results = await response.json();
        console.log('Query results:', results);
    };
    return (_jsxs("div", { className: "query-builder p-4 space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold", children: "Analyst Query Builder" }), _jsx("div", { className: "conditions-container space-y-3", children: conditions.map((condition, index) => (_jsxs("div", { className: "condition-row flex gap-2 items-center", children: [_jsxs("select", { value: condition.field, onChange: (e) => updateCondition(index, 'field', e.target.value), className: "flex-1 p-2 border rounded", children: [_jsx("option", { value: "", children: "Select field..." }), fieldOptions.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] }), _jsxs("select", { value: condition.operator, onChange: (e) => updateCondition(index, 'operator', e.target.value), className: "flex-1 p-2 border rounded", children: [_jsx("option", { value: "", children: "Select operator..." }), operatorOptions.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] }), _jsx("input", { type: "text", value: condition.value, onChange: (e) => updateCondition(index, 'value', e.target.value), placeholder: "Value...", className: "flex-1 p-2 border rounded" }), conditions.length > 1 && (_jsx("button", { onClick: () => removeCondition(index), className: "px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600", children: "Remove" }))] }, index))) }), _jsxs("div", { className: "actions flex gap-2", children: [_jsx("button", { onClick: addCondition, className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", children: "Add Condition" }), _jsx("button", { onClick: executeQuery, className: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600", children: "Execute Query" }), _jsx("button", { onClick: previewExportPolicy, disabled: isPreviewingExport, className: "px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50", children: isPreviewingExport ? 'Checking Policy...' : 'Preview Export Policy' })] }), policyPreview && (_jsx(Alert, { className: policyPreview.allowed ? 'border-green-500' : 'border-red-500', children: _jsx(AlertDescription, { children: _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "font-bold", children: policyPreview.allowed ? '✅ Export Allowed' : '🚫 Export Blocked' }), _jsxs("div", { className: "text-sm", children: [_jsx("strong", { children: "Reason:" }), " ", policyPreview.reason] }), policyPreview.requiredStepUp && (_jsx("div", { className: "text-sm text-amber-600", children: "\u26A0\uFE0F Step-up authentication required for this export" })), policyPreview.dlpViolations && policyPreview.dlpViolations.length > 0 && (_jsxs("div", { className: "text-sm", children: [_jsx("strong", { children: "DLP Violations:" }), _jsx("ul", { className: "list-disc list-inside", children: policyPreview.dlpViolations.map((v, i) => (_jsx("li", { children: v }, i))) })] }))] }) }) }))] }));
};
