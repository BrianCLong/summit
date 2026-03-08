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
exports.default = SitesDashboard;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function SitesDashboard() {
    const [sites, setSites] = (0, react_1.useState)([]);
    const eventSourceRef = (0, react_1.useRef)(null);
    const handlerBoundRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        const s = new EventSource('/api/sites/stream');
        eventSourceRef.current = s;
        s.onmessage = (e) => setSites(JSON.parse(e.data));
        return () => {
            s.close();
            eventSourceRef.current = null;
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!handlerBoundRef.current) {
            handlerBoundRef.current = true;
            const h = function () {
                const v = this.value?.toString().toLowerCase() || '';
                (0, jquery_1.default)('.site-row').each(function () {
                    (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().indexOf(v) >= 0);
                });
            };
            (0, jquery_1.default)('#q').on('input', h);
        }
        return () => {
            if (handlerBoundRef.current) {
                (0, jquery_1.default)('#q').off('input');
                handlerBoundRef.current = false;
            }
        };
    }, [sites.length]);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Sites</h3>
        <input id="q" className="border rounded px-2 py-1" placeholder="filter…"/>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Site</th>
            <th>Region</th>
            <th>Residency</th>
            <th>Bandwidth</th>
            <th>Backlog</th>
            <th>Last Sync</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (<tr key={s.id} className="site-row border-b">
              <td>{s.name}</td>
              <td>{s.region}</td>
              <td>{s.residency}</td>
              <td>{s.bandwidth || s.bandwidth_class}</td>
              <td>{s.backlog}</td>
              <td>{s.lastSync || s.last_seen}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
