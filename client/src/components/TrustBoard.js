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
exports.default = TrustBoard;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function TrustBoard() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const [dlp, setDlp] = (0, react_1.useState)([]);
    const [dp, setDp] = (0, react_1.useState)([]);
    const eventSourceRef = (0, react_1.useRef)(null);
    const handlerBoundRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        const s = new EventSource('/api/trust/stream');
        eventSourceRef.current = s;
        s.onmessage = (e) => {
            const j = JSON.parse(e.data);
            setRows(j.nodes);
            setDlp(j.dlp);
            setDp(j.dp);
        };
        return () => {
            s.close();
            eventSourceRef.current = null;
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!handlerBoundRef.current) {
            handlerBoundRef.current = true;
            (0, jquery_1.default)('#q').on('input', function () {
                const v = (0, jquery_1.default)(this).val()?.toString().toLowerCase() || '';
                (0, jquery_1.default)('.row').each(function () {
                    (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().indexOf(v) >= 0);
                });
            });
        }
        return () => {
            if (handlerBoundRef.current) {
                (0, jquery_1.default)('#q').off('input');
                handlerBoundRef.current = false;
            }
        };
    }, [rows.length]);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Trust Board</h3>
        <input id="q" className="border rounded px-2 py-1" placeholder="filter…"/>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Node</th>
            <th>Provider</th>
            <th>Measurement</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (<tr key={n.node_id} className="row border-b">
              <td>{n.node_id}</td>
              <td>{n.provider}</td>
              <td className="truncate">{n.measurement.slice(0, 16)}…</td>
              <td>✅</td>
            </tr>))}
        </tbody>
      </table>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl shadow p-3">
          <h4 className="font-semibold mb-2">DLP Incidents</h4>
          <ul className="text-sm">
            {dlp.map((d, i) => (<li key={i} className="border-b py-1">
                {d.kind} • {d.severity} • {d.stepId}
              </li>))}
          </ul>
        </div>
        <div className="rounded-2xl shadow p-3">
          <h4 className="font-semibold mb-2">DP Budgets</h4>
          <ul className="text-sm">
            {dp.map((b, i) => (<li key={i} className="border-b py-1">
                {b.tenant}/{b.dataset} • ε left {b.remaining.toFixed(2)}
              </li>))}
          </ul>
        </div>
      </div>
    </div>);
}
