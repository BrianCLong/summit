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
exports.default = DLQRootCauses;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
function DLQRootCauses() {
    const { getDLQRootCauses } = (0, api_1.api)();
    const [groups, setGroups] = (0, react_1.useState)([]);
    const [since, setSince] = (0, react_1.useState)(7 * 24 * 3600 * 1000);
    (0, react_1.useEffect)(() => {
        getDLQRootCauses({ sinceMs: since }).then((r) => setGroups(r.groups || []));
    }, [since]);
    return (<section className="space-y-3 p-4" aria-label="DLQ Root Causes">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Root Causes</h1>
        <select className="rounded border px-2 py-1" value={since} onChange={(e) => setSince(Number(e.target.value))} aria-label="Since">
          <option value={24 * 3600 * 1000}>Last 24h</option>
          <option value={3 * 24 * 3600 * 1000}>Last 3d</option>
          <option value={7 * 24 * 3600 * 1000}>Last 7d</option>
        </select>
      </div>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Count</th>
            <th>Step</th>
            <th>Kind</th>
            <th>Provider</th>
            <th>Last seen</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (<tr key={`${g.stepId}|${g.kind}|${g.provider}`}>
              <td>{g.count}</td>
              <td>{g.stepId}</td>
              <td>{g.kind}</td>
              <td>{g.provider}</td>
              <td>{new Date(g.lastTs).toLocaleString()}</td>
              <td title={g.sampleError} className="max-w-[560px] truncate">
                {g.signature}
              </td>
            </tr>))}
          {!groups.length && (<tr>
              <td colSpan={6} className="p-3 text-center text-gray-500">
                No groups
              </td>
            </tr>)}
        </tbody>
      </table>
    </section>);
}
