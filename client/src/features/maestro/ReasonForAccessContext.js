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
exports.useReasonForAccess = useReasonForAccess;
exports.ReasonForAccessProvider = ReasonForAccessProvider;
const react_1 = __importStar(require("react"));
const ReasonContext = (0, react_1.createContext)(null);
function useReasonForAccess() {
    const ctx = (0, react_1.useContext)(ReasonContext);
    if (!ctx)
        throw new Error('ReasonForAccessProvider missing');
    return ctx;
}
function ReasonForAccessProvider({ children, }) {
    const [auditLog, setAuditLog] = (0, react_1.useState)([]);
    const [prompt, setPrompt] = (0, react_1.useState)(null);
    const [isOpen, setOpen] = (0, react_1.useState)(false);
    const closePrompt = (0, react_1.useCallback)(() => setOpen(false), []);
    const fulfillPrompt = (0, react_1.useCallback)((resource) => new Promise((resolve) => {
        setPrompt({ resource, resolve });
        setOpen(true);
    }), []);
    const submitReason = (0, react_1.useCallback)((reason) => {
        if (!prompt)
            return;
        const entry = {
            id: `${prompt.resource}-${Date.now()}`,
            resource: prompt.resource,
            reason,
            timestamp: new Date().toISOString(),
        };
        setAuditLog((prev) => [entry, ...prev].slice(0, 50));
        prompt.resolve(reason);
        setPrompt(null);
        setOpen(false);
    }, [prompt]);
    const value = (0, react_1.useMemo)(() => ({
        auditLog,
        requestReason: fulfillPrompt,
    }), [auditLog, fulfillPrompt]);
    return (<ReasonContext.Provider value={value}>
      {children}
      <ReasonForAccessModal open={isOpen} resource={prompt?.resource} onCancel={closePrompt} onSubmit={submitReason}/>
    </ReasonContext.Provider>);
}
function ReasonForAccessModal({ open, resource, onCancel, onSubmit, }) {
    const [reason, setReason] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    react_1.default.useEffect(() => {
        if (open) {
            setReason('');
            setError('');
        }
    }, [open]);
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-50">
          Reason for access required
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Provide a justification to open{' '}
          <span className="font-medium text-white">{resource}</span>. This
          reason is recorded in the tenant-local audit log.
        </p>
        <label htmlFor="reason" className="mt-4 block text-sm font-medium text-slate-200">
          Reason
        </label>
        <textarea id="reason" className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 p-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} value={reason} onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim().length > 0)
                setError('');
        }}/>
        {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={() => {
            setReason('');
            setError('');
            onCancel();
        }} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition focus-visible:outline focus-visible:outline-emerald-500 focus-visible:outline-offset-2 hover:border-slate-400">
            Cancel
          </button>
          <button type="button" onClick={() => {
            if (!reason.trim()) {
                setError('Please provide a reason to proceed.');
                return;
            }
            onSubmit(reason.trim());
        }} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-emerald-300 focus-visible:outline-offset-2">
            Continue
          </button>
        </div>
      </div>
    </div>);
}
