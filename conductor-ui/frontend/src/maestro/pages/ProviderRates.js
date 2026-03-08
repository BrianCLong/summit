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
exports.default = ProviderRates;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
function ProviderRates() {
    const { getProviderUsage, setProviderLimit } = (0, api_1.api)();
    const [items, setItems] = (0, react_1.useState)([]);
    const [win, setWin] = (0, react_1.useState)(3600 * 1000);
    const refresh = () => getProviderUsage(win).then((r) => setItems(r.items || []));
    (0, react_1.useEffect)(() => {
        refresh();
        const t = setInterval(refresh, 5000);
        return () => clearInterval(t);
    }, [win]);
    return (<section className="space-y-3 p-4" aria-label="Provider rate limits">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Provider Rates</h1>
        <select className="rounded border px-2 py-1" value={win} onChange={(e) => setWin(Number(e.target.value))} aria-label="Window">
          <option value={3600000}>1h</option>
          <option value={6 * 3600000}>6h</option>
          <option value={24 * 3600000}>24h</option>
        </select>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Provider</th>
            <th>RPM</th>
            <th>Limit</th>
            <th>Drop</th>
            <th>p95 (ms)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (<tr key={it.provider}>
              <td>{it.provider}</td>
              <td>{it.rpm}</td>
              <td>{it.limit}</td>
              <td>{(it.dropRate * 100).toFixed(0)}%</td>
              <td>{it.p95ms}</td>
              <td>
                <button className="mr-2 text-blue-600 underline" onClick={async () => {
                const rpm = Number(prompt(`Set RPM limit for ${it.provider}`, String(it.limit)) || it.limit);
                if (!Number.isFinite(rpm) || rpm <= 0)
                    return;
                await setProviderLimit(it.provider, rpm);
                refresh();
            }}>
                  Set limit
                </button>
                {it.rpm > it.limit && (<span className="text-xs text-red-600">THROTTLING</span>)}
              </td>
            </tr>))}
          {!items.length && (<tr>
              <td colSpan={6} className="p-3 text-center text-gray-500">
                No providers
              </td>
            </tr>)}
        </tbody>
      </table>
    </section>);
}
