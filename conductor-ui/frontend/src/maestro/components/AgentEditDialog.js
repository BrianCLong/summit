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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentEditDialog;
const react_1 = __importStar(require("react"));
const DiffView_1 = __importDefault(require("./DiffView"));
const useFocusTrap_1 = require("../utils/useFocusTrap");
function AgentEditDialog({ open, onClose, original, onApprove, }) {
    const [draft, setDraft] = (0, react_1.useState)(original);
    const [busy, setBusy] = (0, react_1.useState)(false);
    const root = (0, react_1.useRef)(null);
    (0, useFocusTrap_1.useFocusTrap)(root, open);
    (0, react_1.useEffect)(() => {
        if (open)
            setDraft(original);
    }, [open, original]);
    if (!open)
        return null;
    return (<div role="dialog" aria-modal="true" aria-labelledby="agent-edit-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div ref={root} className="w-[min(720px,95vw)] rounded-2xl bg-white p-4 shadow-xl">
        <h2 id="agent-edit-title" className="text-lg font-semibold">
          Edit & approve step
        </h2>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-sm text-gray-600">Draft</div>
            <textarea aria-label="Draft text" className="h-48 w-full rounded border p-2" value={draft} onChange={(e) => setDraft(e.target.value)}/>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-600">
              Diff (before → after)
            </div>
            <DiffView_1.default before={original} after={draft}/>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border px-3 py-2" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy} className="rounded bg-emerald-600 px-3 py-2 text-white" onClick={async () => {
            setBusy(true);
            try {
                await onApprove(draft);
                onClose();
            }
            finally {
                setBusy(false);
            }
        }}>
            Approve & apply
          </button>
        </div>
      </div>
    </div>);
}
