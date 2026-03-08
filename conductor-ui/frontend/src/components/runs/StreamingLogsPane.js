"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingLogsPane = void 0;
// conductor-ui/frontend/src/components/runs/StreamingLogsPane.tsx
const react_1 = __importStar(require("react"));
const StreamingLogsPane = ({ runId }) => {
    const [logs, setLogs] = (0, react_1.useState)([]);
    const [isPaused, setIsPaused] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // In a real app, connect to a WebSocket/SSE endpoint at `/runs/${runId}/logs`
        const mockLogStream = setInterval(() => {
            if (!isPaused) {
                setLogs((prev) => [
                    ...prev,
                    `${new Date().toISOString()}: Log entry #${prev.length + 1}`,
                ]);
            }
        }, 2000);
        return () => clearInterval(mockLogStream);
    }, [runId, isPaused]);
    return (<div>
      <h3>Streaming Logs</h3>
      <button onClick={() => setIsPaused(!isPaused)}>
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      <pre style={{
            height: '300px',
            overflowY: 'scroll',
            border: '1px solid #ccc',
            background: '#f5f5f5',
        }}>
        {logs.join('\n')}
      </pre>
    </div>);
};
exports.StreamingLogsPane = StreamingLogsPane;
