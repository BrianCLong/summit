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
exports.default = DLQPolicy;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
function DLQPolicy() {
    const { getDLQPolicy, putDLQPolicy, getDLQAudit } = (0, api_1.api)();
    const [p, setP] = (0, react_1.useState)(null);
    const [audit, setAudit] = (0, react_1.useState)([]);
    const [allowKinds, setAllowKinds] = (0, react_1.useState)('');
    const [allowSigs, setAllowSigs] = (0, react_1.useState)('');
    const refresh = () => {
        getDLQPolicy().then((policy) => {
            setP(policy);
            setAllowKinds(policy.allowKinds?.join(',') || '');
            setAllowSigs(policy.allowSignatures?.join(',') || '');
        });
        getDLQAudit().then((a) => setAudit(a.items || []));
    };
    (0, react_1.useEffect)(() => {
        refresh();
    }, []);
    if (!p)
        return <div className="p-4">Loading…</div>;
    return (<section className="space-y-3" aria-label="DLQ policy">
      <div className="space-y-3 rounded-2xl border p-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })}/>{' '}
            <span>Enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={p.dryRun} onChange={(e) => setP({ ...p, dryRun: e.target.checked })}/>{' '}
            <span>Dry-run</span>
          </label>
          <label className="flex items-center gap-2">
            Max replays/min
            <input type="number" className="w-24 rounded border px-2 py-1" value={p.maxReplaysPerMinute} onChange={(e) => setP({ ...p, maxReplaysPerMinute: Number(e.target.value) })}/>
          </label>
        </div>
        <label className="block text-sm">Allow kinds (CSV)</label>
        <input className="w-full rounded border px-2 py-1" value={allowKinds} onChange={(e) => setAllowKinds(e.target.value)}/>
        <label className="block text-sm">
          Allow signatures (CSV; substring match on normalized signature)
        </label>
        <input className="w-full rounded border px-2 py-1" value={allowSigs} onChange={(e) => setAllowSigs(e.target.value)}/>
        <div className="flex gap-2">
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={async () => {
            const body = {
                ...p,
                allowKinds: allowKinds
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                allowSignatures: allowSigs
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
            };
            await putDLQPolicy(body);
            refresh();
        }}>
            Save
          </button>
          <button className="rounded border px-3 py-2" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <h2 className="mb-2 font-medium">Recent policy actions</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a, i) => (<tr key={i}>
                <td>{new Date(a.ts).toLocaleString()}</td>
                <td>{a.action}</td>
                <td>
                  <pre className="max-w-[720px] whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(a.details, null, 2)}
                  </pre>
                </td>
              </tr>))}
            {!audit.length && (<tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  No audit entries
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>);
}
