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
exports.default = SchedulerBoard;
const react_1 = __importStar(require("react"));
function SchedulerBoard() {
    const [q, setQ] = (0, react_1.useState)([]);
    const [hints, setHints] = (0, react_1.useState)({});
    const [filter, setFilter] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        const s = new EventSource('/api/queue/stream');
        s.onmessage = e => setQ(JSON.parse(e.data));
        return () => s.close();
    }, []);
    // Optimization: Replaced jQuery DOM manipulation with React state and memoization
    // This avoids expensive DOM traversals on every input change and O(N) DOM updates
    const filteredQ = (0, react_1.useMemo)(() => {
        if (!filter)
            return q;
        const v = filter.toLowerCase();
        return q.filter(r => {
            // Reconstruct the text content to match previous behavior (search across all columns)
            const text = `${r.id}${r.tenant}${r.eta}${r.pool}$${r.cost.toFixed(2)}${r.preemptSuggestion ? '✅' : '—'}`.toLowerCase();
            return text.includes(v);
        });
    }, [q, filter]);
    (0, react_1.useEffect)(() => {
        fetch('/api/autoscale/hints')
            .then(r => r.json())
            .then(setHints);
    }, []);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Scheduler Board</h3>
        <input id="tenantFilter" className="border rounded px-2 py-1" placeholder="filter tenant…" value={filter} onChange={e => setFilter(e.target.value)}/>
        <div className="ml-auto text-sm">
          Predicted queue next min: <b>{hints.minuteAhead ?? '-'}</b>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Run</th>
            <th>Tenant</th>
            <th>ETA</th>
            <th>Pool</th>
            <th>Cost est.</th>
            <th>Preempt?</th>
          </tr>
        </thead>
        <tbody>
          {filteredQ.map((r) => (<tr key={r.id} className="row border-b">
              <td>{r.id}</td>
              <td>{r.tenant}</td>
              <td>{r.eta}</td>
              <td>{r.pool}</td>
              <td>${r.cost.toFixed(2)}</td>
              <td>{r.preemptSuggestion ? '✅' : '—'}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
