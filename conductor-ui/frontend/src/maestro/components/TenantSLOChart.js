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
exports.default = TenantSLOChart;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
const recharts_1 = require("recharts");
function TenantSLOChart({ tenant }) {
    const { getSLOTimeSeriesByTenant } = (0, api_1.api)();
    const [data, setData] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        getSLOTimeSeriesByTenant(tenant).then((r) => {
            setData(r.points.map((p) => ({
                time: new Date(p.ts).toLocaleTimeString(),
                ...p,
            })));
        });
    }, [tenant]);
    return (<div className="rounded-2xl border p-3">
      <div className="mb-2 text-sm text-gray-600">
        Tenant “{tenant}” — burn over time
      </div>
      <div style={{ height: 260 }}>
        <recharts_1.ResponsiveContainer>
          <recharts_1.LineChart data={data}>
            <recharts_1.XAxis dataKey="time" hide/>
            <recharts_1.YAxis domain={[0, 'dataMax+0.5']}/>
            <recharts_1.Tooltip />
            <recharts_1.Legend />
            <recharts_1.ReferenceLine y={1} strokeDasharray="3 3"/>
            <recharts_1.ReferenceLine y={2} strokeDasharray="3 3"/>
            <recharts_1.Line type="monotone" dot={false} dataKey="fastBurn" name="Fast burn (1h)"/>
            <recharts_1.Line type="monotone" dot={false} dataKey="slowBurn" name="Slow burn (6h)"/>
          </recharts_1.LineChart>
        </recharts_1.ResponsiveContainer>
      </div>
    </div>);
}
