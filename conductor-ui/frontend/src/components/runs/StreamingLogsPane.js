import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/components/runs/StreamingLogsPane.tsx
import { useState, useEffect } from 'react';
export const StreamingLogsPane = ({ runId }) => {
    const [logs, setLogs] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    useEffect(() => {
        // In a real app, connect to a WebSocket/SSE endpoint at `/runs/${runId}/logs`
        const mockLogStream = setInterval(() => {
            if (!isPaused) {
                setLogs(prev => [...prev, `${new Date().toISOString()}: Log entry #${prev.length + 1}`]);
            }
        }, 2000);
        return () => clearInterval(mockLogStream);
    }, [runId, isPaused]);
    return (_jsxs("div", { children: [_jsx("h3", { children: "Streaming Logs" }), _jsx("button", { onClick: () => setIsPaused(!isPaused), children: isPaused ? 'Resume' : 'Pause' }), _jsx("pre", { style: { height: '300px', overflowY: 'scroll', border: '1px solid #ccc', background: '#f5f5f5' }, children: logs.join('\n') })] }));
};
