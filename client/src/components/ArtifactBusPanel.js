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
exports.default = ArtifactBusPanel;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function ArtifactBusPanel() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows, setRows] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/api/oci/metrics')
            .then((r) => r.json())
            .then(setRows);
        (0, jquery_1.default)('#ab-q').on('input', function () {
            const v = ((0, jquery_1.default)(this).val() || '').toString().toLowerCase();
            (0, jquery_1.default)('.ab-row').each(function () {
                (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().includes(v));
            });
        });
    }, []);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="font-semibold">OCI Artifact Bus</h3>
        <input id="ab-q" className="border rounded px-2 py-1" placeholder="filter…"/>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Kind</th>
            <th>Bytes</th>
            <th>Hits</th>
          </tr>
        </thead>
        <tbody>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {rows.map((x, i) => (<tr key={i} className="ab-row border-b">
              <td>{x.tag.slice(0, 16)}…</td>
              <td>{x.kind}</td>
              <td>{x.size}</td>
              <td>{x.hits}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
