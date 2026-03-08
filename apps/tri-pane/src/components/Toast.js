"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toast = Toast;
const react_1 = __importDefault(require("react"));
const EventBus_1 = require("./EventBus");
function Toast() {
    const { state, dispatch } = (0, EventBus_1.useTriPane)();
    if (!state.toast)
        return null;
    const toneStyles = state.toast.tone === 'warning'
        ? 'border-amber-400 bg-amber-950/70 text-amber-100'
        : 'border-accent bg-accent/15 text-sand';
    return (<div role="status" aria-live="polite" className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg ${toneStyles}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{state.toast.message}</p>
        <button type="button" className="rounded-full border border-sand/20 px-2 py-1 text-xs text-sand/70" onClick={() => dispatch({ type: 'dismissToast' })} aria-label="Dismiss notification">
          Close
        </button>
      </div>
    </div>);
}
