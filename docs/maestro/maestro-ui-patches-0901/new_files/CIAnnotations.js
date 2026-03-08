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
exports.default = CIAnnotationsPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
async function fetchAnnotations(since) {
    const base = window.__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
    const qs = new URLSearchParams();
    if (since)
        qs.set('since', since);
    const res = await fetch(`${base}/ci/annotations?${qs.toString()}`, {
        credentials: 'omit',
    });
    if (!res.ok)
        throw new Error('Failed to load annotations');
    return res.json();
}
function CIAnnotationsPage() {
    const [since, setSince] = (0, react_1.useState)(''); // ISO string or blank
    const [data, setData] = (0, react_1.useState)(null);
    const [err, setErr] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const grouped = (0, react_1.useMemo)(() => {
        if (!data)
            return {};
        return data.reduce((acc, a) => {
            (acc[a.level] ||= []).push(a);
            return acc;
        }, {});
    }, [data]);
    (0, react_1.useEffect)(() => {
        setLoading(true);
        setErr(null);
        fetchAnnotations(since || undefined)
            .then(setData)
            .catch((e) => setErr(String(e)))
            .finally(() => setLoading(false));
    }, [since]);
    return (<div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CI Annotations</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Since</label>
          <input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} className="border rounded px-2 py-1" aria-label="Filter since timestamp"/>
        </div>
      </header>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {data && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['failure', 'warning', 'notice'].map((level) => (<section key={level} className="border rounded-xl p-4 shadow-sm">
              <h2 className="text-lg font-medium capitalize">
                {level}{' '}
                <span className="text-sm text-gray-500">
                  ({grouped[level]?.length ?? 0})
                </span>
              </h2>
              <ul className="mt-2 space-y-2 max-h-[60vh] overflow-auto pr-2">
                {(grouped[level] ?? []).map((a, idx) => (<li key={idx} className="border rounded p-2">
                    <div className="text-sm text-gray-600">
                      Run{' '}
                      <react_router_dom_1.Link className="underline" to={`/maestro/runs/${a.runId}`}>
                        #{a.runId}
                      </react_router_dom_1.Link>
                    </div>
                    <div className="font-mono text-sm">
                      {a.file}:{a.line}
                    </div>
                    <div className="text-sm">{a.message}</div>
                    <div>
                      <a className="text-blue-600 underline" href={a.url} target="_blank" rel="noreferrer">
                        Open in GitHub
                      </a>
                    </div>
                  </li>))}
              </ul>
            </section>))}
        </div>)}
    </div>);
}
