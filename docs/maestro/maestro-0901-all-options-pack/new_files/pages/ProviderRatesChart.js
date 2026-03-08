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
exports.default = ProviderRatesChart;
const react_1 = __importStar(require("react"));
const LineTimeseries_1 = __importDefault(require("../components/charts/LineTimeseries"));
const api_1 = require("../api");
function ProviderRatesChart() {
    const [series, setSeries] = (0, react_1.useState)([]);
    const [limit, setLimit] = (0, react_1.useState)(null);
    const [err, setErr] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const load = () => ((0, api_1.getProviderUsage)?.({ windowMs: 60_000 }))
            .then((r) => {
            const points = (r?.series || []).map((p) => ({
                x: new Date(p.ts).toLocaleTimeString(),
                y: p.rpm,
            }));
            setSeries(points);
            setLimit(r?.limit ?? null);
        })
            .catch((e) => setErr(String(e)));
        load();
        const h = setInterval(load, 5000);
        return () => clearInterval(h);
    }, []);
    return (<div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Provider Rates</h1>
      <LineTimeseries_1.default title="Requests per minute" data={series} ariaLabel="Provider RPM over time"/>
      {limit != null && (<div className="text-sm text-gray-600">Current limit: {limit} rpm</div>)}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>);
}
