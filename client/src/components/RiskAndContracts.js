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
exports.default = RiskAndContracts;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function RiskAndContracts() {
    const [h, setH] = (0, react_1.useState)('');
    const [c, setC] = (0, react_1.useState)(null);
    const handlerBoundRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        Promise.all([
            fetch('/api/pm/heatmap', { signal: controller.signal }).then((r) => r.text()),
            fetch('/api/contracts/current', { signal: controller.signal }).then((r) => r.json()),
        ])
            .then(([heatmapData, contractData]) => {
            setH(heatmapData);
            setC(contractData);
        })
            .catch((err) => {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
        });
        return () => controller.abort();
    }, []);
    (0, react_1.useEffect)(() => {
        if (!handlerBoundRef.current && h) {
            handlerBoundRef.current = true;
            (0, jquery_1.default)('#risk-q').on('input', function () {
                const v = ((0, jquery_1.default)(this).val() || '').toString().toLowerCase();
                (0, jquery_1.default)('.risk-row').each(function () {
                    (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().includes(v));
                });
            });
        }
        return () => {
            if (handlerBoundRef.current) {
                (0, jquery_1.default)('#risk-q').off('input');
                handlerBoundRef.current = false;
            }
        };
    }, [h]);
    return (<div className="grid gap-4 md:grid-cols-2">
      <div className="p-4 rounded-2xl shadow">
        <div className="flex gap-2 mb-2">
          <h3 className="font-semibold">Risk Heatmap</h3>
          <input id="risk-q" className="border rounded px-2 py-1" placeholder="filter…"/>
        </div>
        <pre className="text-xs whitespace-pre-wrap">{h}</pre>
      </div>
      <div className="p-4 rounded-2xl shadow">
        <h3 className="font-semibold mb-2">Change Contract</h3>
        {!c ? (<div>loading…</div>) : (<ul className="text-sm">
            <li>Area: {c.area}</li>
            <li>Intent: {c.intent}</li>
            <li>p95 ≤ {c.budgets.p95_ms}ms</li>
            <li>Error ≤ {c.budgets.err_rate_pct}%</li>
          </ul>)}
      </div>
    </div>);
}
