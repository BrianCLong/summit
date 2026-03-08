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
exports.default = ContractsPanel;
const react_1 = __importStar(require("react"));
function ContractsPanel() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [c, setC] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        fetch('/api/contracts/current', { signal: controller.signal })
            .then((r) => r.json())
            .then(setC)
            .catch((err) => {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
        });
        return () => controller.abort();
    }, []);
    return (<div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-2">Change Contract</h3>
      {!c ? (<div>loading…</div>) : (<ul className="text-sm">
          <li>Area: {c.area}</li>
          <li>Intent: {c.intent}</li>
          <li>Budget p95: {c.budgets.p95_ms}ms</li>
          <li>Error: {c.budgets.err_rate_pct}%</li>
        </ul>)}
    </div>);
}
