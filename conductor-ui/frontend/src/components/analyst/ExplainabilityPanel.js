import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
export const ExplainabilityPanel = ({ policyOutcome, queryContext }) => {
    const [expanded, setExpanded] = useState(false);
    const [explanation, setExplanation] = useState(null);
    useEffect(() => {
        if (policyOutcome && policyOutcome.decision === 'deny') {
            generateExplanation(policyOutcome);
        }
    }, [policyOutcome]);
    const generateExplanation = async (outcome) => {
        // Call explainability endpoint
        try {
            const response = await fetch('/api/policy/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outcome,
                    context: queryContext
                })
            });
            const result = await response.json();
            setExplanation(result.explanation);
        }
        catch (error) {
            setExplanation('Unable to generate explanation');
        }
    };
    if (!policyOutcome) {
        return null;
    }
    const isBlocked = policyOutcome.decision === 'deny';
    return (_jsxs("div", { className: "explainability-panel mt-4 p-4 border rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-lg font-semibold", children: isBlocked ? '🚫 Why was this blocked?' : '✅ Policy Check Passed' }), _jsx("button", { onClick: () => setExpanded(!expanded), className: "text-sm text-blue-600 hover:text-blue-800", children: expanded ? 'Hide Details' : 'Show Details' })] }), _jsx(Alert, { className: isBlocked ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50', children: _jsx(AlertDescription, { children: _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "font-medium", children: policyOutcome.reason }), isBlocked && policyOutcome.remediation && (_jsxs("div", { className: "mt-2 p-2 bg-amber-50 border border-amber-200 rounded", children: [_jsx("div", { className: "font-semibold text-amber-800", children: "How to proceed:" }), _jsx("div", { className: "text-sm text-amber-700", children: policyOutcome.remediation })] }))] }) }) }), expanded && (_jsxs("div", { className: "mt-4 space-y-3", children: [_jsxs("div", { className: "bg-gray-50 p-3 rounded", children: [_jsx("h4", { className: "font-semibold text-sm text-gray-700 mb-2", children: "Rule Details" }), _jsxs("div", { className: "text-sm", children: [_jsxs("div", { children: [_jsx("strong", { children: "Rule ID:" }), " ", policyOutcome.rule_id] }), _jsxs("div", { children: [_jsx("strong", { children: "Decision:" }), " ", policyOutcome.decision.toUpperCase()] })] })] }), policyOutcome.evidence && policyOutcome.evidence.length > 0 && (_jsxs("div", { className: "bg-gray-50 p-3 rounded", children: [_jsx("h4", { className: "font-semibold text-sm text-gray-700 mb-2", children: "Evidence" }), _jsx("ul", { className: "text-sm list-disc list-inside space-y-1", children: policyOutcome.evidence.map((item, index) => (_jsx("li", { children: item }, index))) })] })), explanation && (_jsxs("div", { className: "bg-blue-50 p-3 rounded border border-blue-200", children: [_jsx("h4", { className: "font-semibold text-sm text-blue-800 mb-2", children: "AI Explanation" }), _jsx("div", { className: "text-sm text-blue-700", children: explanation })] })), queryContext && (_jsxs("details", { className: "bg-gray-50 p-3 rounded", children: [_jsx("summary", { className: "font-semibold text-sm text-gray-700 cursor-pointer", children: "Query Context" }), _jsx("pre", { className: "mt-2 text-xs bg-white p-2 rounded overflow-x-auto", children: JSON.stringify(queryContext, null, 2) })] }))] }))] }));
};
