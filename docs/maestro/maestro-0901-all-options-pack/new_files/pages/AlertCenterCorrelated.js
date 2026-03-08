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
exports.default = AlertCenterCorrelated;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
const react_router_dom_1 = require("react-router-dom");
function AlertCenterCorrelated() {
    const [filters, setFilters] = (0, react_1.useState)({});
    const [events, setEvents] = (0, react_1.useState)([]);
    const [err, setErr] = (0, react_1.useState)(null);
    const load = () => (0, api_1.getAlertCenterEvents)(filters)
        .then(setEvents)
        .catch((e) => setErr(String(e)));
    (0, react_1.useEffect)(() => {
        load();
    }, [filters]);
    return (<div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">AlertCenter</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="type" value={filters.type || ''} onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}/>
        <input className="border rounded px-2 py-1" placeholder="severity" value={filters.severity || ''} onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}/>
        <input className="border rounded px-2 py-1" placeholder="tenant" value={filters.tenant || ''} onChange={(e) => setFilters({ ...filters, tenant: e.target.value || undefined })}/>
        <input className="border rounded px-2 py-1" placeholder="provider" value={filters.provider || ''} onChange={(e) => setFilters({ ...filters, provider: e.target.value || undefined })}/>
        <button className="border rounded px-3 py-1" onClick={load}>
          Refresh
        </button>
      </div>

      <table className="w-full text-sm border rounded">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-2 py-1">Time</th>
            <th className="text-left px-2 py-1">Type</th>
            <th className="text-left px-2 py-1">Severity</th>
            <th className="text-left px-2 py-1">Source</th>
            <th className="text-left px-2 py-1">Run</th>
            <th className="text-left px-2 py-1">Provider</th>
            <th className="text-left px-2 py-1">Tenant</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (<tr key={i} className="border-t">
              <td className="px-2 py-1">{new Date(e.at).toLocaleString()}</td>
              <td className="px-2 py-1">{e.type}</td>
              <td className="px-2 py-1">{e.severity}</td>
              <td className="px-2 py-1">{e.source || '-'}</td>
              <td className="px-2 py-1">
                {e.runId ? (<react_router_dom_1.Link className="underline" to={`/maestro/runs/${e.runId}`}>
                    #{e.runId}
                  </react_router_dom_1.Link>) : ('-')}
              </td>
              <td className="px-2 py-1">{e.provider || '-'}</td>
              <td className="px-2 py-1">{e.tenant || '-'}</td>
            </tr>))}
        </tbody>
      </table>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>);
}
