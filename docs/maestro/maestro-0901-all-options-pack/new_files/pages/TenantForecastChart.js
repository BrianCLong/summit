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
exports.default = TenantForecastChart;
const react_1 = __importStar(require("react"));
const LineTimeseries_1 = __importDefault(require("../components/charts/LineTimeseries"));
const api_1 = require("../api");
function TenantForecastChart() {
    const [series, setSeries] = (0, react_1.useState)([]);
    const [anom, setAnom] = (0, react_1.useState)([]);
    const [err, setErr] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        Promise.all([(0, api_1.getTenantCostForecast)?.(), (0, api_1.getTenantCostAnomalies)?.()])
            .then(([f, a]) => {
            const s = (f?.points || []).map((p) => ({
                x: new Date(p.ts).toLocaleTimeString(),
                y: p.value,
            }));
            setSeries(s);
            setAnom(a || []);
        })
            .catch((e) => setErr(String(e)));
    }, []);
    return (<div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Tenant Costs</h1>
      <LineTimeseries_1.default title="Forecast (EMA)" data={series} ariaLabel="Tenant cost forecast EMA"/>
      <section className="border rounded p-3">
        <h3 className="font-medium">Anomalies</h3>
        <ul className="text-sm mt-2">
          {anom.map((row, i) => (<li key={i}>
              {row.reason || 'anomaly'} — z={row.z?.toFixed?.(2) ?? row.z}
            </li>))}
        </ul>
      </section>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>);
}
