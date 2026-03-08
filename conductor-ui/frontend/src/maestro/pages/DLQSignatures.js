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
exports.default = DLQSignatures;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
const recharts_1 = require("recharts");
function DLQSignatures() {
    const { getDLQSignatures, getDLQSignatureTimeSeries, getDLQPolicy, putDLQPolicy, } = (0, api_1.api)();
    const [rows, setRows] = (0, react_1.useState)([]);
    const [sel, setSel] = (0, react_1.useState)(null);
    const [series, setSeries] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        getDLQSignatures().then((r) => setRows(r.signatures || []));
    }, []);
    (0, react_1.useEffect)(() => {
        if (sel)
            getDLQSignatureTimeSeries(sel).then((r) => setSeries(r.points || []));
    }, [sel]);
    async function allowSignature(sig) {
        const pol = await getDLQPolicy();
        const list = new Set(pol.allowSignatures || []);
        if (list.has(sig))
            return alert('Already allowed');
        list.add(sig);
        await putDLQPolicy({ allowSignatures: Array.from(list) });
        alert('Signature added to allowlist');
    }
    async function removeSignature(sig) {
        const pol = await getDLQPolicy();
        const list = new Set(pol.allowSignatures || []);
        if (!list.has(sig))
            return alert('Not in allowlist');
        list.delete(sig);
        await putDLQPolicy({ allowSignatures: Array.from(list) });
        alert('Signature removed from allowlist');
    }
    return (<section className="space-y-3 p-4" aria-label="DLQ signatures">
      <h1 className="text-xl font-semibold">DLQ Signatures</h1>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Count</th>
            <th>Trend</th>
            <th>Last seen</th>
            <th>Signature</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (<tr key={r.sig}>
              <td>{r.count}</td>
              <td>{r.trend === 1 ? '↑' : r.trend === -1 ? '↓' : '→'}</td>
              <td>{new Date(r.lastTs).toLocaleString()}</td>
              <td className="max-w-[560px] truncate" title={r.sig}>
                {r.sig}
              </td>
              <td>
                <button className="mr-2 text-blue-600 underline" onClick={() => setSel(r.sig)}>
                  Trend
                </button>
                <button className="mr-2 text-blue-600 underline" onClick={() => allowSignature(r.sig)}>
                  Allow auto-replay
                </button>
                <button className="text-red-600 underline" onClick={() => removeSignature(r.sig)}>
                  Remove
                </button>
              </td>
            </tr>))}
          {!rows.length && (<tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No signatures yet
              </td>
            </tr>)}
        </tbody>
      </table>

      {sel && (<div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm text-gray-600">
            Signature trend: <code>{sel}</code>
          </div>
          <div style={{ height: 240 }}>
            <recharts_1.ResponsiveContainer>
              <recharts_1.AreaChart data={series.map((p) => ({
                time: new Date(p.ts).toLocaleTimeString(),
                count: p.count,
            }))}>
                <recharts_1.XAxis dataKey="time" hide/>
                <recharts_1.YAxis allowDecimals={false}/>
                <recharts_1.Tooltip />
                <recharts_1.Area dataKey="count" type="monotone"/>
              </recharts_1.AreaChart>
            </recharts_1.ResponsiveContainer>
          </div>
        </div>)}
    </section>);
}
