import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/components/knowledge/ExpertFinder.tsx
import { useState } from 'react';
const findExpert = async (filePath) => {
    const res = await fetch('/api/knowledge/query/structural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structural_query: { type: 'find_owner', path: filePath } }),
    });
    return res.json();
};
export const ExpertFinder = () => {
    const [filePath, setFilePath] = useState('services/lsc-service/src/index.ts');
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const handleFind = async () => {
        setIsLoading(true);
        const res = await findExpert(filePath);
        setResult(res);
        setIsLoading(false);
    };
    return (_jsxs("div", { children: [_jsx("h4", { children: "Expert Finder" }), _jsx("input", { type: "text", value: filePath, onChange: e => setFilePath(e.target.value), style: { width: '300px' } }), _jsx("button", { onClick: handleFind, disabled: isLoading, children: isLoading ? 'Finding...' : 'Find Expert' }), result && (_jsxs("div", { children: [_jsxs("p", { children: [_jsx("strong", { children: "Suggested Owner:" }), " ", result.results[0].owner] }), _jsxs("p", { children: [_jsx("strong", { children: "Reasoning:" }), " ", result.results[0].reasoning] })] }))] }));
};
