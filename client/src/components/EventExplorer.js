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
exports.default = EventExplorer;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function EventExplorer({ sourceId }) {
    const [stats, setStats] = (0, react_1.useState)({ lag: 0, partitions: [] });
    (0, react_1.useEffect)(() => {
        const s = new EventSource(`/api/events/${sourceId}/stats`);
        s.onmessage = (e) => setStats(JSON.parse(e.data));
        return () => s.close();
    }, [sourceId]);
    (0, react_1.useEffect)(() => {
        const h = function () {
            const v = Number(this.value || 0);
            (0, jquery_1.default)('.p-row').each(function () {
                const lag = Number((0, jquery_1.default)(this).data('lag') || 0);
                (0, jquery_1.default)(this).toggle(lag >= v);
            });
        };
        (0, jquery_1.default)('#lagFilter').on('input', h);
        return () => (0, jquery_1.default)('#lagFilter').off('input', h);
    }, [stats.partitions.length]);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Event Explorer</h3>
        <input id="lagFilter" type="number" className="border rounded px-2 py-1" placeholder="min lag…"/>
        <button onClick={() => fetch(`/api/events/${sourceId}/pause`, { method: 'POST' })} className="px-2 py-1 rounded-2xl shadow">
          Pause
        </button>
        <button onClick={() => fetch(`/api/events/${sourceId}/resume`, { method: 'POST' })} className="px-2 py-1 rounded-2xl shadow">
          Resume
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Partition</th>
            <th>Offset</th>
            <th>Lag</th>
          </tr>
        </thead>
        <tbody>
          {stats.partitions.map((p) => (<tr key={p.id} className="p-row border-b" data-lag={p.lag}>
              <td>{p.id}</td>
              <td>{p.offset}</td>
              <td>{p.lag}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
