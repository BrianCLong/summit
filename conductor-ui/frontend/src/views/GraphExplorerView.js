import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/GraphExplorerView.tsx
// Appending Server-Saved Views functionality
import { useState, useEffect, useCallback } from 'react';
import { SloHintBadge } from '../components/graph/SloHintBadge';
const fetchGraphNeighbors = async (nodeId) => {
    console.log(`Fetching neighbors for ${nodeId}...`);
    await new Promise(res => setTimeout(res, 350));
    return {
        nodes: [{ id: `neighbor-${Math.random()}`, label: 'Neighbor', type: 'IP' }],
        edges: [{ id: `edge-${Math.random()}`, source: nodeId, target: `neighbor-${Math.random()}` }],
        latencyMs: 350,
    };
};
const fetchSavedViews = async () => {
    return [{ id: 'view-1', name: 'My Saved Investigation', nodes: [], edges: [] }];
};
export const GraphExplorerView = () => {
    const [query, setQuery] = useState('');
    const [nodes, setNodes] = useState([{ id: 'start-node', label: 'Start Node', type: 'Domain' }]);
    const [edges, setEdges] = useState([]);
    const [latency, setLatency] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [savedViews, setSavedViews] = useState([]);
    useEffect(() => {
        fetchSavedViews().then(setSavedViews);
    }, []);
    const handleExpandNode = useCallback(async (nodeId) => {
        setIsLoading(true);
        const result = await fetchGraphNeighbors(nodeId);
        setNodes(prev => [...prev, ...result.nodes]);
        setEdges(prev => [...prev, ...result.edges]);
        setLatency(result.latencyMs);
        setIsLoading(false);
    }, []);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Graph Explorer" }), _jsxs("div", { children: [_jsx("h3", { children: "Saved Views" }), _jsx("ul", { children: savedViews.map(v => _jsx("li", { children: v.name }, v.id)) }), _jsx("button", { children: "Save Current View" })] }), _jsx("hr", {}), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search for an entity..." }), _jsx("button", { onClick: () => handleExpandNode(query), children: "Search & Expand" })] }), isLoading && _jsx("p", { children: "Loading..." }), latency !== null && _jsx(SloHintBadge, { latencyMs: latency, sloMs: 300 }), _jsxs("div", { style: { border: '1px solid grey', height: '500px', position: 'relative' }, children: [_jsx("p", { style: { padding: '1rem' }, children: "Graph visualization area." }), _jsx("ul", { children: nodes.map(n => _jsxs("li", { children: [n.label, " (", n.type, ")"] }, n.id)) })] })] }));
};
