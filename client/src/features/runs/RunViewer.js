"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RunViewer;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
function RunViewer() {
    const { id = '' } = (0, react_router_dom_1.useParams)();
    const [data, setData] = react_1.default.useState(null);
    const [err, setErr] = react_1.default.useState('');
    react_1.default.useEffect(() => {
        let alive = true;
        const tick = async () => {
            try {
                const r = await fetch(`/api/maestro/v1/runs/${encodeURIComponent(id)}`);
                if (!r.ok)
                    throw new Error(String(r.status));
                const j = await r.json();
                if (alive)
                    setData(j);
            }
            catch (e) {
                if (alive)
                    setErr(String(e));
            }
        };
        tick();
        const t = setInterval(tick, 2000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, [id]);
    const traceId = data?.traceId || data?.otelTraceId;
    const tempo = import.meta.env.VITE_OBS_TEMPO_URL || '';
    const tracesLink = traceId && tempo
        ? `${tempo}/search?traceID=${encodeURIComponent(traceId)}`
        : undefined;
    return (<div style={{ padding: 24 }}>
      <h2>Run Viewer — {id}</h2>
      {err && <p style={{ color: 'crimson' }}>Error: {err}</p>}
      {!data && !err && <p>Loading…</p>}
      {data && (<>
          <pre aria-label="run-json" style={{
                background: '#111',
                color: '#ccc',
                padding: 12,
                overflow: 'auto',
                maxHeight: 300,
            }}>
            {JSON.stringify(data, null, 2)}
          </pre>
          <div style={{ marginBottom: 8 }}>
            <strong>Trace ID:</strong> {traceId || '—'}
          </div>
          {tracesLink && (<a href={tracesLink} target="_blank" rel="noreferrer">
              Open in Traces
            </a>)}
        </>)}
    </div>);
}
