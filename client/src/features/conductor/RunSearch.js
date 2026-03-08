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
exports.default = RunSearch;
const react_1 = __importStar(require("react"));
function RunSearch() {
    const [hits, setHits] = (0, react_1.useState)([]);
    const [q, setQ] = (0, react_1.useState)({
        tenant: '',
        status: '',
        stepType: '',
        since: '',
        until: '',
    });
    async function search() {
        const r = await fetch('/graphql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: `{ searchRuns(q:${JSON.stringify(q)}){ runId status startedAt tenant summary } }`,
            }),
        });
        const j = await r.json();
        setHits(j.data?.searchRuns || []);
    }
    return (<div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Run Search</h3>
      <div className="grid grid-cols-5 gap-2 mb-2">
        <input placeholder="tenant" className="border rounded px-2 py-1" onChange={(e) => setQ({ ...q, tenant: e.target.value })}/>
        <input placeholder="status" className="border rounded px-2 py-1" onChange={(e) => setQ({ ...q, status: e.target.value })}/>
        <input placeholder="stepType" className="border rounded px-2 py-1" onChange={(e) => setQ({ ...q, stepType: e.target.value })}/>
        <input placeholder="since ISO" className="border rounded px-2 py-1" onChange={(e) => setQ({ ...q, since: e.target.value })}/>
        <input placeholder="until ISO" className="border rounded px-2 py-1" onChange={(e) => setQ({ ...q, until: e.target.value })}/>
      </div>
      <button onClick={search} className="px-3 py-1 rounded-2xl shadow">
        Search
      </button>
      <table className="w-full text-sm mt-3">
        <thead>
          <tr>
            <th>Run</th>
            <th>Status</th>
            <th>Tenant</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {hits.map((h) => (<tr key={h.runId} className="border-b">
              <td className="font-mono">{String(h.runId).slice(0, 8)}</td>
              <td>{h.status}</td>
              <td>{h.tenant}</td>
              <td>{h.startedAt}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
