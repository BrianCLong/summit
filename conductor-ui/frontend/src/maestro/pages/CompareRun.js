"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CompareRun;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const api_1 = require("../api");
const DAG_1 = __importDefault(require("../components/DAG"));
function CompareRun() {
    const { id = '' } = (0, react_router_dom_1.useParams)();
    const { getRunGraphCompare } = (0, api_1.api)();
    const [mode, setMode] = react_1.default.useState('side');
    const [data, setData] = react_1.default.useState(null);
    const [err, setErr] = react_1.default.useState(null);
    react_1.default.useEffect(() => {
        (async () => {
            try {
                const r = await getRunGraphCompare(id);
                setData(r);
            }
            catch (e) {
                setErr(e?.message || 'Failed');
            }
        })();
    }, [id]);
    return (<div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compare Run: {id}</h2>
        <div className="flex gap-2">
          <button className={`rounded border px-2 py-1 text-sm ${mode === 'overlay' ? 'bg-indigo-600 text-white' : ''}`} onClick={() => setMode('overlay')}>
            Overlay
          </button>
          <button className={`rounded border px-2 py-1 text-sm ${mode === 'side' ? 'bg-indigo-600 text-white' : ''}`} onClick={() => setMode('side')}>
            Side-by-side
          </button>
        </div>
      </div>
      <div className="text-sm">
        <react_router_dom_1.Link className="text-indigo-700 hover:underline" to={`/maestro/runs/${id}`}>
          Back to run
        </react_router_dom_1.Link>
      </div>
      {err && <div className="text-sm text-red-700">{err}</div>}
      {data && (<div className="space-y-3">
          {mode === 'side' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <section className="rounded border bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Baseline {data.baselineRunId ? `(${data.baselineRunId})` : ''}
                </div>
                <DAG_1.default nodes={(data.baseline?.nodes || []).map((n) => ({
                    id: n.id,
                    label: n.label || n.id,
                    state: 'succeeded',
                }))} edges={(data.baseline?.edges || []).map((e) => ({
                    from: e.source || e.from,
                    to: e.target || e.to,
                }))}/>
              </section>
              <section className="rounded border bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Current
                </div>
                <DAG_1.default nodes={(data.current?.nodes || []).map((n) => ({
                    id: n.id,
                    label: n.label || n.id,
                    state: n.status === 'failed'
                        ? 'failed'
                        : n.status === 'running'
                            ? 'running'
                            : 'succeeded',
                }))} edges={(data.current?.edges || []).map((e) => ({
                    from: e.source || e.from,
                    to: e.target || e.to,
                }))}/>
              </section>
            </div>)}
          {mode === 'overlay' && (<section className="rounded border bg-white p-3">
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Overlay
              </div>
              <DAG_1.default nodes={(data.current?.nodes || []).map((n) => ({
                    id: n.id,
                    label: n.label || n.id,
                    state: n.status === 'failed'
                        ? 'failed'
                        : n.status === 'running'
                            ? 'running'
                            : 'succeeded',
                }))} edges={(data.current?.edges || []).map((e) => ({
                    from: e.source || e.from,
                    to: e.target || e.to,
                }))}/>
            </section>)}
        </div>)}
    </div>);
}
