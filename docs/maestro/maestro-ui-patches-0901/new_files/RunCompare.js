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
exports.default = RunComparePage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
async function fetchCompare(runId) {
    const base = window.__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
    const res = await fetch(`${base}/runs/${runId}/compare/previous`);
    if (!res.ok)
        throw new Error('Failed to compare');
    return res.json();
}
function RunComparePage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const [data, setData] = (0, react_1.useState)(null);
    const [err, setErr] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!id)
            return;
        fetchCompare(id)
            .then(setData)
            .catch((e) => setErr(String(e)));
    }, [id]);
    if (err)
        return <div className="p-6 text-red-600">Error: {err}</div>;
    if (!data)
        return <div className="p-6">Loading…</div>;
    return (<div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Run {data.currentRunId} vs {data.previousRunId}
        </h1>
        <react_router_dom_1.Link to={`/maestro/runs/${data.currentRunId}`} className="underline">
          Back to run
        </react_router_dom_1.Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <h2 className="font-medium">Totals</h2>
          <ul className="text-sm mt-2">
            <li>Duration Δ: {Math.round(data.durationDeltaMs)} ms</li>
            <li>Cost Δ: ${data.costDelta.toFixed(4)}</li>
          </ul>
        </div>
        <div className="border rounded-xl p-4">
          <h2 className="font-medium">Changed Nodes</h2>
          <ul className="text-sm mt-2 max-h-[40vh] overflow-auto pr-2">
            {data.nodes
            .filter((n) => n.changed)
            .map((n) => (<li key={n.id} className="border rounded p-2 mb-2">
                  <div className="font-mono">{n.id}</div>
                  <div>{n.reason || 'Changed'}</div>
                  <div>
                    Duration Δ: {n.durationDeltaMs ?? 0} ms · Cost Δ:{' '}
                    {n.costDelta ?? 0}
                  </div>
                </li>))}
          </ul>
        </div>
      </section>
    </div>);
}
