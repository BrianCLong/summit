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
exports.default = ErrorBudgetBurn;
const react_1 = __importStar(require("react"));
function ErrorBudgetBurn({ pipeline }) {
    const [burn, setBurn] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fast = Math.max(0.5, Math.random() * 1.6);
        const slow = Math.max(0.3, Math.random() * 1.2);
        setBurn({ fast, slow });
    }, [pipeline]);
    const badge = (x) => x >= 2 ? 'bg-red-600' : x >= 1 ? 'bg-amber-500' : 'bg-emerald-600';
    return (<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card title="Fast burn (1h)" value={`${burn?.fast?.toFixed(2) ?? '—'}x`} cls={badge(burn?.fast || 0)}/>
      <Card title="Slow burn (6h)" value={`${burn?.slow?.toFixed(2) ?? '—'}x`} cls={badge(burn?.slow || 0)}/>
    </div>);
}
function Card({ title, value, cls, }) {
    return (<div className="rounded-2xl border p-4">
      <div className="mb-1 text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs text-white ${cls}`} aria-live="polite">
        {cls.includes('emerald')
            ? 'HEALTHY'
            : cls.includes('amber')
                ? 'ALERT'
                : 'PAGE'}
      </span>
    </div>);
}
