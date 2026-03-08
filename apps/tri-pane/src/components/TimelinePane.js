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
exports.TimelinePane = TimelinePane;
const react_1 = __importStar(require("react"));
const data_1 = require("../data");
const EventBus_1 = require("./EventBus");
const MIN = 0;
const MAX = 24;
function TimelinePane() {
    const { state, dispatch } = (0, EventBus_1.useTriPane)();
    const [localRange, setLocalRange] = (0, react_1.useState)(state.timeRange);
    const rafRef = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        setLocalRange(state.timeRange);
    }, [state.timeRange]);
    (0, react_1.useEffect)(() => {
        if (rafRef.current)
            cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            dispatch({ type: 'setTimeRange', payload: localRange });
        });
        return () => {
            if (rafRef.current)
                cancelAnimationFrame(rafRef.current);
        };
    }, [localRange, dispatch]);
    const sortedEvents = (0, react_1.useMemo)(() => [...data_1.timeline].sort((a, b) => a.timestamp - b.timestamp), []);
    return (<section aria-labelledby="timeline-heading" className="flex flex-col gap-3 rounded-2xl border border-sand/20 bg-horizon/40 p-4 shadow-inner">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-sand/80">Timeline</p>
          <h2 id="timeline-heading" className="text-lg font-semibold">
            Brushing window
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className="rounded-md bg-ink px-2 py-1">
            Start {localRange.start.toFixed(1)}h
          </span>
          <span aria-hidden>→</span>
          <span className="rounded-md bg-ink px-2 py-1">End {localRange.end.toFixed(1)}h</span>
        </div>
      </div>
      <p className="text-xs text-sand/70">
        Drag the handles or use arrow keys to set the investigative window. Updates broadcast across panes under 100ms.
      </p>
      <div className="rounded-xl border border-sand/20 bg-ink/60 p-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <label className="text-sm" htmlFor="range-start">
            Start
          </label>
          <input id="range-start" type="range" min={MIN} max={MAX} step={0.5} value={localRange.start} onChange={(e) => setLocalRange((prev) => ({ ...prev, start: Math.min(Number(e.target.value), prev.end - 0.5) }))} aria-valuemin={MIN} aria-valuemax={localRange.end - 0.5} aria-valuenow={localRange.start} className="w-full accent-accent"/>
          <label className="text-sm" htmlFor="range-end">
            End
          </label>
          <input id="range-end" type="range" min={MIN} max={MAX} step={0.5} value={localRange.end} onChange={(e) => setLocalRange((prev) => ({ ...prev, end: Math.max(Number(e.target.value), prev.start + 0.5) }))} aria-valuemin={localRange.start + 0.5} aria-valuemax={MAX} aria-valuenow={localRange.end} className="w-full accent-accent"/>
        </div>
        <div className="mt-4 h-24 rounded-lg border border-dashed border-sand/30 bg-horizon/60 p-3" role="list">
          {sortedEvents.map((event) => {
            const active = event.timestamp >= state.timeRange.start && event.timestamp <= state.timeRange.end;
            const leftPercent = (event.timestamp / MAX) * 100;
            return (<div key={event.id} role="listitem" className={`relative mb-2 flex items-center gap-2 text-sm last:mb-0 ${active ? 'text-sand' : 'text-sand/60'}`}>
                <span className={`inline-flex h-3 w-3 rounded-full ${active ? 'bg-accent' : 'bg-sand/50'}`} aria-hidden style={{ left: `${leftPercent}%` }}/>
                <div className="flex-1">
                  <p className="font-semibold">
                    {event.label}
                    <span className="ml-2 text-xs text-sand/60">{event.timestamp}h</span>
                  </p>
                  <p className="text-xs text-sand/70">{event.annotation}</p>
                </div>
                <span className="rounded bg-ink px-2 py-1 text-xs" aria-label={`Weight ${event.weight}`}>
                  {event.weight}
                </span>
              </div>);
        })}
        </div>
      </div>
    </section>);
}
