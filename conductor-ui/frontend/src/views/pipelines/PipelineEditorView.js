import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/pipelines/PipelineEditorView.tsx
import { useState, useEffect } from 'react';
// Mock API functions
const fetchTemplates = async () => {
    await new Promise(res => setTimeout(res, 150));
    return [{ id: 'template-1', name: 'Standard Ingest & Process' }];
};
const fetchPlan = async (draft) => {
    console.log('Fetching plan for draft:', draft);
    await new Promise(res => setTimeout(res, 500));
    return { estDuration: '15m', estCost: '\$2.50', sloFit: 'green' };
};
export const PipelineEditorView = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [draft, setDraft] = useState(null);
    const [plan, setPlan] = useState(null);
    useEffect(() => {
        fetchTemplates().then(setTemplates);
    }, []);
    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setDraft({ templateId: template.id, steps: {} }); // Initialize draft
        setPlan(null);
    };
    const handleGetPlan = async () => {
        if (draft) {
            const result = await fetchPlan(draft);
            setPlan(result);
        }
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Pipeline Editor v0" }), !selectedTemplate ? (_jsxs("div", { children: [_jsx("h2", { children: "Select a Template" }), _jsx("ul", { children: templates.map(t => _jsx("li", { onClick: () => handleSelectTemplate(t), children: t.name }, t.id)) })] })) : (_jsxs("div", { children: [_jsxs("h2", { children: ["Editing: ", selectedTemplate.name] }), _jsx("div", { style: { border: '1px dashed grey', padding: '1rem', margin: '1rem 0' }, children: _jsx("p", { children: "Step configuration form will be here." }) }), _jsx("button", { onClick: handleGetPlan, children: "Preview Plan" }), plan && (_jsxs("div", { style: { marginTop: '1rem' }, children: [_jsx("h3", { children: "Plan Preview" }), _jsxs("p", { children: ["Est. Duration: ", plan.estDuration] }), _jsxs("p", { children: ["Est. Cost: ", plan.estCost] }), _jsxs("p", { children: ["SLO Fit: ", _jsx("span", { style: { color: plan.sloFit }, children: "\u25CF" })] })] }))] }))] }));
};
