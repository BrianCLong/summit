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
exports.default = ServingLaneTrends;
const react_1 = __importStar(require("react"));
const LineTimeseries_1 = __importDefault(require("../components/charts/LineTimeseries"));
const api_1 = require("../api");
function ServingLaneTrends() {
    const [seriesQ, setSeriesQ] = (0, react_1.useState)([]);
    const [seriesB, setSeriesB] = (0, react_1.useState)([]);
    const [seriesK, setSeriesK] = (0, react_1.useState)([]);
    const [err, setErr] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const load = () => ((0, api_1.getServingMetrics)?.())
            .then((r) => {
            const toPts = (arr) => (arr || []).map((p) => ({
                x: new Date(p.ts).toLocaleTimeString(),
                y: p.value,
            }));
            setSeriesQ(toPts(r?.series?.qDepth || r?.seriesQ || []));
            setSeriesB(toPts(r?.series?.batch || r?.seriesBatch || []));
            setSeriesK(toPts(r?.series?.kvHit || r?.seriesKv || []));
        })
            .catch((e) => setErr(String(e)));
        load();
        const h = setInterval(load, 5000);
        return () => clearInterval(h);
    }, []);
    return (<section className="space-y-3">
      <LineTimeseries_1.default title="Queue Depth" data={seriesQ} ariaLabel="Serving lane queue depth over time"/>
      <LineTimeseries_1.default title="Batch Size" data={seriesB} ariaLabel="Serving lane batch size over time"/>
      <LineTimeseries_1.default title="KV Hit Ratio" data={seriesK} ariaLabel="Serving lane KV hit ratio over time"/>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </section>);
}
