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
exports.default = TenantBudgetForecast;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
function TenantBudgetForecast({ tenant }) {
    const { getTenantBudget, putTenantBudget, getTenantCostForecast } = (0, api_1.api)();
    const [budget, setBudget] = (0, react_1.useState)(100);
    const [alpha, setAlpha] = (0, react_1.useState)(0.5);
    const [hours, setHours] = (0, react_1.useState)(48);
    const [f, setF] = (0, react_1.useState)(null);
    async function refresh(useBudget) {
        const b = useBudget ?? (await getTenantBudget(tenant)).monthlyUsd;
        setBudget(b);
        const res = await getTenantCostForecast(tenant, hours, alpha, b);
        setF(res);
    }
    (0, react_1.useEffect)(() => {
        refresh().catch(() => { });
    }, [tenant, alpha, hours]);
    const statusCls = f?.risk === 'BREACH'
        ? 'bg-red-600'
        : f?.risk === 'WARN'
            ? 'bg-amber-500'
            : 'bg-emerald-600';
    return (<section className="space-y-3 rounded-2xl border p-4" aria-label="Budget forecast">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className={`rounded px-2 py-1 text-white ${statusCls}`}>
          {f?.risk || '—'}
        </div>
        <div>
          Projected month:{' '}
          <span className="font-semibold">
            ${f?.projectedMonthUsd?.toFixed?.(2) ?? '—'}
          </span>{' '}
          vs budget{' '}
          <span className="font-semibold">
            ${f?.budgetUsd?.toFixed?.(2) ?? '—'}
          </span>
        </div>
        <label className="flex items-center gap-2">
          Alpha
          <input type="number" step="0.1" min={0.1} max={0.9} className="w-20 rounded border px-2 py-1" value={alpha} onChange={(e) => setAlpha(Math.min(0.9, Math.max(0.1, Number(e.target.value))))}/>
        </label>
        <label className="flex items-center gap-2">
          Hours
          <select className="rounded border px-2 py-1" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={72}>72</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Budget ($)
          <input type="number" className="w-28 rounded border px-2 py-1" value={budget} onChange={(e) => setBudget(Number(e.target.value))}/>
        </label>
        <button className="rounded border px-3 py-2" onClick={() => refresh(budget)}>
          Recalculate
        </button>
        <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={async () => {
            await putTenantBudget(tenant, budget);
            await refresh(budget);
        }}>
          Save budget
        </button>
      </div>
      <div className="text-xs text-slate-600">
        Hourly average (rough): {f?.hourlyAvg ?? '—'}
      </div>
    </section>);
}
