import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/runs/RunGraphView.tsx
import { useEffect, useRef } from 'react';
// Mocking cytoscape, in a real app you would install this dependency.
const cytoscape = (options) => ({ destroy: () => { } });
const mockGraphData = {
    nodes: [{ data: { id: 'n1', name: 'Start' } }, { data: { id: 'n2', name: 'Build' } }],
    edges: [{ data: { id: 'e1', source: 'n1', target: 'n2' } }],
};
export const RunGraphView = ({ runId }) => {
    const cyRef = useRef(null);
    useEffect(() => {
        // In a real app, fetch data from `/api/maestro/v1/runs/${runId}/graph`
        const cy = cytoscape({
            container: cyRef.current,
            elements: mockGraphData,
            style: [{ selector: 'node', style: { label: 'data(name)' } }],
            layout: { name: 'cose' },
        });
        return () => cy.destroy();
    }, [runId]);
    return (_jsxs("div", { children: [_jsx("h3", { children: "Run Graph" }), _jsx("div", { ref: cyRef, style: { height: '400px', border: '1px solid #ccc' } })] }));
};
