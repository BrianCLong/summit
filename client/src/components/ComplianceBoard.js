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
exports.default = ComplianceBoard;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function ComplianceBoard() {
    const [rows, setRows] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/api/compliance/controls')
            .then((r) => r.json())
            .then(setRows)
            .catch(() => setRows([]));
    }, []);
    (0, react_1.useEffect)(() => {
        const handler = function () {
            const v = this.value?.toString().toLowerCase() || '';
            (0, jquery_1.default)(this).each(function () {
                const $row = (0, jquery_1.default)(this);
                $row.toggle($row.text().toLowerCase().indexOf(v) >= 0);
            });
        };
        (0, jquery_1.default)('#ctrlFilter').on('input', handler);
        return () => {
            (0, jquery_1.default)('#ctrlFilter').off('input', handler);
        };
    }, [rows.length]);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Compliance Controls</h3>
        <input id="ctrlFilter" className="border rounded px-2 py-1" placeholder="filter…"/>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Control</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (<tr key={c.id} className="ctrl-row border-b">
              <td>{c.id}</td>
              <td>{c.status}</td>
              <td>
                <a className="underline" href={c.evidenceUri}>
                  evidence
                </a>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
