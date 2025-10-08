import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/components/onboarding/OnboardingChecklist.tsx
import { useState } from 'react';
const checklistItems = [
    { id: 'connect-source', text: 'Connect your first data source' },
    { id: 'run-pipeline', text: 'Run a pipeline' },
    { id: 'view-slos', text: 'View SLO dashboard' },
    { id: 'export-evidence', text: 'Export an evidence bundle' },
];
export const OnboardingChecklist = () => {
    const [completed, setCompleted] = useState([]);
    const handleToggle = (id) => {
        setCompleted(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    return (_jsxs("div", { children: [_jsx("h2", { children: "Getting Started" }), _jsx("ul", { children: checklistItems.map(item => (_jsx("li", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: completed.includes(item.id), onChange: () => handleToggle(item.id) }), item.text] }) }, item.id))) })] }));
};
