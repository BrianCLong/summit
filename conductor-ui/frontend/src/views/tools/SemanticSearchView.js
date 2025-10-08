import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/tools/SemanticSearchView.tsx
import { useState } from 'react';
const semanticSearch = async (query) => {
    const res = await fetch('/api/knowledge/query/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natural_language_query: query }),
    });
    return res.json();
};
export const SemanticSearchView = () => {
    const [query, setQuery] = useState('What is our strategy for PII?');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const handleSearch = async () => {
        setIsLoading(true);
        const res = await semanticSearch(query);
        setResults(res.results || []);
        setIsLoading(false);
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Semantic Search" }), _jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), style: { width: '400px' } }), _jsx("button", { onClick: handleSearch, disabled: isLoading, children: isLoading ? 'Searching...' : 'Ask' }), _jsx("div", { children: results.map((r, i) => (_jsxs("div", { style: { border: '1px solid #eee', padding: '8px', margin: '8px 0' }, children: [_jsxs("strong", { children: [r.path, " (Score: ", r.score.toFixed(2), ")"] }), _jsx("p", { children: r.summary })] }, i))) })] }));
};
