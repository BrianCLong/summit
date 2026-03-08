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
exports.default = TenantCostAnomalies;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
function TenantCostAnomalies({ tenant }) {
    const { getTenantCostAnomalies } = (0, api_1.api)();
    const [z, setZ] = (0, react_1.useState)(3.0);
    const [data, setData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        getTenantCostAnomalies(tenant, 24 * 3600 * 1000, 60 * 60 * 1000, z).then(setData);
    }, [tenant, z]);
    const anomalies = data?.anomalies || [];
    return (<section className="space-y-3 rounded-2xl border p-4" aria-label="Cost anomalies">
      <div className="flex items-center gap-3">
        <h2 className="font-medium">Anomalies</h2>
        <label className="flex items-center gap-2 text-sm">
          Z-threshold
          <input type="number" step="0.1" className="w-24 rounded border px-2 py-1" value={z} onChange={(e) => setZ(Number(e.target.value))}/>
        </label>
        <div className="text-sm text-gray-600">
          μ={data?.mean} σ={data?.std} (z≥{data?.threshold})
        </div>
      </div>
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>USD</th>
              <th>z</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (<tr key={a.ts}>
                <td>{new Date(a.ts).toLocaleTimeString()}</td>
                <td>${(+a.usd).toFixed(3)}</td>
                <td>{a.z}</td>
              </tr>))}
            {!anomalies.length && (<tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  No anomalies
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>);
}
