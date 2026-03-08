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
exports.default = CopilotPanel;
const react_1 = __importStar(require("react"));
const costEstimator_1 = require("./utils/costEstimator");
const url = import.meta.env?.VITE_COPILOT_URL ||
    'http://localhost:4100/copilot/query';
function CopilotPanel() {
    const [prompt, setPrompt] = (0, react_1.useState)('shortest path from person P1 to H1');
    const [mode, setMode] = (0, react_1.useState)('auto');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [resp, setResp] = (0, react_1.useState)(null);
    const inputRef = (0, react_1.useRef)(null);
    const localCost = (0, react_1.useMemo)(() => (0, costEstimator_1.estimatePromptCost)(prompt), [prompt]);
    (0, react_1.useEffect)(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        const openHandler = () => {
            inputRef.current?.focus();
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        const runHandler = (ev) => {
            const detail = ev.detail || {};
            if (detail.mode)
                setMode(detail.mode);
            setTimeout(run, 0);
        };
        window.addEventListener('open-copilot', openHandler);
        window.addEventListener('copilot:run', runHandler);
        return () => {
            window.removeEventListener('keydown', handler);
            window.removeEventListener('open-copilot', openHandler);
            window.removeEventListener('copilot:run', runHandler);
        };
    }, []);
    async function run() {
        setLoading(true);
        setResp(null);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ prompt, mode }),
            });
            const data = await res.json();
            setResp(data);
        }
        catch (e) {
            setResp({ ok: false, answer: String(e) });
        }
        finally {
            setLoading(false);
        }
    }
    async function checkSafety() {
        try {
            const api = import.meta.env?.VITE_API_URL || 'http://localhost:4000';
            const res = await fetch(api + '/copilot/classify', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const data = await res.json();
            setResp({
                ...(resp || {}),
                type: 'safety',
                answer: `Classification: ${data.classification} (${(data.reasons || []).join(',')})`,
            });
        }
        catch (e) {
            /* noop */
        }
    }
    async function loadCookbook() {
        try {
            const api = import.meta.env?.VITE_API_URL || 'http://localhost:4000';
            const res = await fetch(api + '/copilot/cookbook', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ topic: 'analytics' }),
            });
            const data = await res.json();
            setResp({
                ...(resp || {}),
                type: 'cookbook',
                citations: (data.items || []).map((x) => ({
                    source: x.id,
                    title: x.title,
                    score: 1,
                })),
            });
        }
        catch (e) {
            /* noop */
        }
    }
    return (<div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
      <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
        }}>
        <strong>Copilot</strong>
        <small>Ctrl/Cmd+K • Palette: Ctrl/Cmd+Shift+P</small>
      </div>
      <textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} style={{ width: '100%', fontFamily: 'monospace', marginBottom: 8 }}/>
      <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 8,
        }}>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="auto">auto</option>
          <option value="nl2cypher">nl2cypher</option>
          <option value="ask">ask</option>
        </select>
        <button onClick={run} disabled={loading}>
          {loading ? 'Running…' : 'Run'}
        </button>
        <button onClick={checkSafety} disabled={loading}>
          Check Safety
        </button>
        <button onClick={loadCookbook} disabled={loading}>
          Cookbook
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
          Est. Cost: {localCost.score}
        </div>
      </div>
      {resp?.guardrail?.deny && (<div style={{ color: '#a00', marginBottom: 8 }}>
          Blocked: {resp.guardrail.reason}
        </div>)}
      {resp?.type === 'nl2cypher' && (<div>
          <div style={{ fontSize: 12, color: '#666' }}>Preview</div>
          <pre style={{
                background: '#f8f8f8',
                padding: 8,
                borderRadius: 4,
                overflowX: 'auto',
            }}>
            {resp.preview}
          </pre>
          {resp.costEstimate && (<div style={{ fontSize: 12, color: '#666' }}>
              Cost: {JSON.stringify(resp.costEstimate)}
            </div>)}
        </div>)}
      {resp?.type === 'rag' && (<div>
          <div style={{ fontSize: 12, color: '#666' }}>Answer</div>
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
            {resp.answer}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>Citations</div>
          <ul>
            {(resp.citations || []).map((c, i) => (<li key={i}>
                {c.title} <small>({c.score})</small> – <code>{c.source}</code>
              </li>))}
          </ul>
        </div>)}
    </div>);
}
