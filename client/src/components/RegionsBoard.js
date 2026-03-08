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
exports.default = RegionsBoard;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function RegionsBoard() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const eventSourceRef = (0, react_1.useRef)(null);
    const handlerBoundRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        const s = new EventSource('/api/regions/stream');
        eventSourceRef.current = s;
        s.onmessage = (e) => setRows(JSON.parse(e.data));
        return () => {
            s.close();
            eventSourceRef.current = null;
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!handlerBoundRef.current) {
            handlerBoundRef.current = true;
            const h = function () {
                const v = Number(this.value) || 0;
                (0, jquery_1.default)('.row').each(function () {
                    const lag = Number((0, jquery_1.default)(this).data('lag') || 0);
                    (0, jquery_1.default)(this).toggle(lag >= v);
                });
            };
            (0, jquery_1.default)('#filter').on('input', h);
        }
        return () => {
            if (handlerBoundRef.current) {
                (0, jquery_1.default)('#filter').off('input');
                handlerBoundRef.current = false;
            }
        };
    }, [rows.length]);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Regions & Replication</h3>
        <input id="filter" className="border rounded px-2 py-1" placeholder="filter…"/>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Region</th>
            <th>Peer</th>
            <th>Lag</th>
            <th>LastSeq</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (<tr key={r.peer} className="row border-b">
              <td>{r.region}</td>
              <td>{r.peer}</td>
              <td>{r.lag}s</td>
              <td>{r.seq}</td>
              <td>{r.status}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
