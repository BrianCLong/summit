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
exports.default = TgoDashboard;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function TgoDashboard() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const handlerBoundRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        fetch('/api/tgo/metrics', { signal: controller.signal })
            .then((r) => r.json())
            .then(setRows)
            .catch((err) => {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
        });
        if (!handlerBoundRef.current) {
            handlerBoundRef.current = true;
            (0, jquery_1.default)('#tgo-q').on('input', function () {
                const v = (0, jquery_1.default)(this).val()?.toString().toLowerCase() || '';
                (0, jquery_1.default)('.tgo-row').each(function () {
                    (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().includes(v));
                });
            });
        }
        return () => {
            controller.abort();
            if (handlerBoundRef.current) {
                (0, jquery_1.default)('#tgo-q').off('input');
                handlerBoundRef.current = false;
            }
        };
    }, []);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="font-semibold">Hyper-Parallel Orchestrator</h3>
        <input id="tgo-q" className="border rounded px-2 py-1" placeholder="filter…"/>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Task</th>
            <th>Pool</th>
            <th>Est(s)</th>
            <th>Dur(s)</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x, i) => (<tr key={i} className="tgo-row border-b">
              <td>{x.id}</td>
              <td>{x.pool}</td>
              <td>{x.est}</td>
              <td>{x.dur}</td>
              <td>{x.state}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
