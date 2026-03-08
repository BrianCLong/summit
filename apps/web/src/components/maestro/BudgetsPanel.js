"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BudgetsPanel;
// =============================================
// File: apps/web/src/components/maestro/BudgetsPanel.tsx
// =============================================
const react_1 = __importDefault(require("react"));
const useMaestroBudgets_1 = require("../../hooks/useMaestroBudgets");
function BudgetsPanel() {
    const { data, isLoading } = (0, useMaestroBudgets_1.useBudgets)();
    if (isLoading) {
        return <div className="skeleton h-24 w-full"/>;
    }
    if (!data) {
        return <div className="alert alert-error">Failed to load budgets</div>;
    }
    return (<div className="rounded-2xl border p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm">Tier</span>
        <span className="badge badge-primary badge-lg capitalize">
          {data.tier}
        </span>
        <div className="ml-auto text-sm opacity-80">
          Remaining: ${data.remaining.usd.toFixed(2)} · {data.remaining.tokens}{' '}
          tokens
        </div>
      </div>
      <div>
        <h4 className="font-semibold">Burndown</h4>
        <div className="mt-2 grid grid-cols-10 gap-1 items-end h-24">
          {data.burndown.map((p, i) => (<div key={i} className="bg-primary/40" style={{ height: Math.min(100, Math.round(p.usd * 10)) }} title={`${new Date(p.t).toLocaleTimeString()} — $${p.usd.toFixed(2)}`}/>))}
        </div>
      </div>
    </div>);
}
