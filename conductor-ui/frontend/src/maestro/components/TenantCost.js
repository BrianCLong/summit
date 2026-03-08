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
exports.default = TenantCost;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
const recharts_1 = require("recharts");
function TenantCost({ tenant }) {
    const { getTenantCostSummary, getTenantCostSeries } = (0, api_1.api)();
    const [sum, setSum] = (0, react_1.useState)(null);
    const [series, setSeries] = (0, react_1.useState)([]);
    const [windowMs, setWindowMs] = (0, react_1.useState)(24 * 3600 * 1000);
    (0, react_1.useEffect)(() => {
        getTenantCostSummary(tenant, windowMs)
            .then(setSum)
            .catch(() => setSum(null));
    }, [tenant, windowMs]);
    (0, react_1.useEffect)(() => {
        getTenantCostSeries(tenant, windowMs)
            .then((r) => setSeries(r.points || []))
            .catch(() => setSeries([]));
    }, [tenant, windowMs]);
    return (<section className="space-y-3" aria-label={`Cost for tenant ${tenant}`}>
      <div className="flex items-center gap-2">
        <label htmlFor="win" className="text-sm">
          Window
        </label>
        <select id="win" className="rounded border px-2 py-1" value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))}>
          <option value={3600000}>Last 1h</option>
          <option value={6 * 3600000}>Last 6h</option>
          <option value={24 * 3600000}>Last 24h</option>
          <option value={7 * 24 * 3600000}>Last 7d</option>
        </select>
      </div>

      <div className="flex items-center justify-between rounded-2xl border p-4">
        <div>
          <div className="text-sm text-gray-500">Total spend</div>
          <div className="text-3xl font-semibold">
            ${sum?.totalUsd?.toFixed?.(2) ?? '—'}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Tenant: <span className="font-medium">{tenant}</span>
        </div>
      </div>

      <div className="rounded-2xl border p-3">
        <div className="mb-2 text-sm text-gray-600">Spend over time</div>
        <div style={{ height: 220 }}>
          <recharts_1.ResponsiveContainer>
            <recharts_1.AreaChart data={series.map((p) => ({
            time: new Date(p.ts).toLocaleTimeString(),
            usd: Number(p.usd),
        }))}>
              <recharts_1.XAxis dataKey="time" hide/>
              <recharts_1.YAxis />
              <recharts_1.Tooltip />
              <recharts_1.Area type="monotone" dataKey="usd"/>
            </recharts_1.AreaChart>
          </recharts_1.ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm text-gray-600">By pipeline</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>USD</th>
              </tr>
            </thead>
            <tbody>
              {(sum?.byPipeline || []).map((r) => (<tr key={r.pipeline}>
                  <td>{r.pipeline}</td>
                  <td>${r.usd.toFixed(2)}</td>
                </tr>))}
              {!(sum?.byPipeline || []).length && (<tr>
                  <td colSpan={2} className="p-2 text-center text-gray-500">
                    No data
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm text-gray-600">By model/provider</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>USD</th>
              </tr>
            </thead>
            <tbody>
              {(sum?.byModelProvider || []).map((r, i) => (<tr key={i}>
                  <td>{r.provider}</td>
                  <td>{r.model}</td>
                  <td>${r.usd.toFixed(2)}</td>
                </tr>))}
              {!(sum?.byModelProvider || []).length && (<tr>
                  <td colSpan={3} className="p-2 text-center text-gray-500">
                    No data
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Run</th>
              <th>Pipeline</th>
              <th>Start</th>
              <th>Duration</th>
              <th>Tokens</th>
              <th>USD</th>
            </tr>
          </thead>
          <tbody>
            {(sum?.recentRuns || []).map((r) => (<tr key={r.runId}>
                <td>
                  <a href={`#/maestro/runs/${r.runId}`} className="text-blue-600 underline">
                    {r.runId.slice(0, 8)}
                  </a>
                </td>
                <td>{r.pipeline}</td>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td>{Math.round(r.durationMs / 1000)}s</td>
                <td>{r.tokens}</td>
                <td>${r.usd.toFixed(2)}</td>
              </tr>))}
            {!(sum?.recentRuns || []).length && (<tr>
                <td colSpan={6} className="p-3 text-center text-gray-500">
                  No recent runs
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>);
}
