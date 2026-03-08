"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsPanel = MetricsPanel;
const react_1 = __importDefault(require("react"));
function MetricsPanel(props) {
    return (<div className="grid gap-3">
      <section className="rounded-xl border border-sand/20 p-4">
        <h3 className="text-sm font-semibold">Top narratives</h3>
        <div className="mt-3 grid gap-2">
          {props.narratives.map((narrative) => (<div key={narrative.id} className="rounded-lg border border-sand/20 p-3">
              <div className="flex items-center justify-between">
                <strong>{narrative.label}</strong>
                <span className="text-xs opacity-70">v={narrative.metrics.velocity.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-sm text-sand/80">{narrative.summary}</p>
              <button className="mt-2 rounded-full border px-3 py-1 text-xs" onClick={() => props.onExplain(narrative.id)}>
                Explain
              </button>
            </div>))}
        </div>
      </section>

      <section className="rounded-xl border border-sand/20 p-4">
        <h3 className="text-sm font-semibold">Divergence signals</h3>
        <div className="mt-3 grid gap-2">
          {props.divergence.map((row) => (<div key={`${row.narrativeId}-${row.claimId}`} className="rounded-lg border border-sand/20 p-3 text-xs">
              narrative={row.narrativeId} → claim={row.claimId} · score={row.divergenceScore.toFixed(2)}
            </div>))}
        </div>
      </section>
    </div>);
}
