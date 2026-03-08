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
exports.default = PlaybookDialog;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
const useFocusTrap_1 = require("../utils/useFocusTrap");
function PlaybookDialog({ open, onClose, sig, providerGuess, }) {
    const { getDLQPolicy, putDLQPolicy } = (0, api_1.api)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [msg, setMsg] = (0, react_1.useState)(undefined);
    const ref = (0, react_1.useRef)(null);
    (0, useFocusTrap_1.useFocusTrap)(ref, open, onClose);
    if (!open)
        return null;
    return (<div role="dialog" aria-modal="true" aria-labelledby="pb-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div ref={ref} className="w-[min(560px,95vw)] rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <h2 id="pb-title" className="text-lg font-semibold">
          Playbook
        </h2>
        <div className="mt-2 text-sm text-gray-700">
          <div className="mb-1">Signature</div>
          <code className="break-all text-xs">{sig}</code>
          {providerGuess && (<div className="mt-2 text-xs text-gray-500">
              Provider: {providerGuess}
            </div>)}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-blue-600 px-3 py-2 text-white disabled:bg-gray-300" disabled={busy} onClick={async () => {
            setBusy(true);
            setMsg(undefined);
            try {
                const pol = await getDLQPolicy();
                const set = new Set(pol.allowSignatures || []);
                set.add(sig);
                await putDLQPolicy({ allowSignatures: Array.from(set) });
                setMsg('Added to auto-replay allowlist');
            }
            catch (e) {
                setMsg(e?.message || 'Failed');
            }
            finally {
                setBusy(false);
            }
        }}>
            Allow auto-replay
          </button>
          <button className="rounded border px-3 py-2" onClick={onClose}>
            Close
          </button>
        </div>
        {msg && <div className="mt-2 text-xs text-gray-600">{msg}</div>}
      </div>
    </div>);
}
