"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsPanel = MetricsPanel;
const react_1 = __importDefault(require("react"));
function MetricsPanel(props) {
    return (<div className="grid gap-4">
      <div className="rounded-2xl border p-4">
        <h3 className="text-sm font-semibold">Top narratives (velocity)</h3>
        <div className="mt-3 grid gap-2">
          {props.narratives.map((n) => (<div key={n.id} className="p-3 rounded-xl border">
              <div className="flex items-center justify-between">
                <div className="font-medium">{n.label}</div>
                <div className="text-xs opacity-70">v={n.metrics.velocity.toFixed(2)}</div>
              </div>
              <div className="text-sm opacity-80 mt-1">{n.summary}</div>
              <button className="mt-2 px-3 py-1 rounded-2xl border text-sm" onClick={() => props.onExplain(n.id)}>
                Explain
              </button>
            </div>))}
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <h3 className="text-sm font-semibold">Divergence signals</h3>
        <div className="mt-3 grid gap-2">
          {props.divergence.map((d, idx) => (<div key={`${d.narrativeId}-${idx}`} className="p-3 rounded-xl border">
              <div className="text-sm">
                narrative={d.narrativeId} → claim={d.claimId}
              </div>
              <div className="text-xs opacity-70">score={d.divergenceScore.toFixed(2)}</div>
            </div>))}
        </div>
      </div>
    </div>);
}
