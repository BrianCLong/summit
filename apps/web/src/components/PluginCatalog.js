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
exports.default = PluginCatalog;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function PluginCatalog() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const [sel, setSel] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetch('/graphql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: `{ plugins { id name version digest approved risk capabilities } }`,
            }),
        })
            .then(r => r.json())
            .then(j => setRows(j.data.plugins));
    }, []);
    (0, react_1.useEffect)(() => {
        (0, jquery_1.default)('#q').on('input', function () {
            const v = (0, jquery_1.default)(this).val()?.toString().toLowerCase() || '';
            (0, jquery_1.default)('.p-row').each(function () {
                (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().indexOf(v) >= 0);
            });
        });
    }, [rows.length]);
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Plugin Catalog</h3>
        <input id="q" className="border rounded px-2 py-1" placeholder="filter…" aria-label="Filter plugins"/>
      </div>
      <table className="w-full text-sm" aria-label="Plugin Catalog">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Version</th>
            <th scope="col">Digest</th>
            <th scope="col">Approved</th>
            <th scope="col">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (<tr key={p.id} className="p-row border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSel(p)} onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                    setSel(p);
            }} tabIndex={0} role="button" aria-label={`Select plugin ${p.name}`}>
              <td>{p.name}</td>
              <td>{p.version}</td>
              <td className="truncate">{p.digest}</td>
              <td>{p.approved ? '✅' : '❌'}</td>
              <td>{p.risk}</td>
            </tr>))}
        </tbody>
      </table>
      {sel && (<div className="mt-4 p-3 rounded-2xl shadow" role="region" aria-label="Plugin Details">
          <div className="text-sm">
            Capabilities: <code>{JSON.stringify(sel.capabilities)}</code>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => approve(sel.id)} className="px-3 py-1 rounded-2xl shadow" aria-label={`Approve plugin ${sel.name}`}>
              Approve
            </button>
          </div>
        </div>)}
    </div>);
    async function approve(id) {
        const reason = prompt('Reason?');
        await fetch('/graphql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: `mutation { approvePlugin(id:"${id}", risk:"reviewed", reason:${JSON.stringify(reason || '')} ) }`,
            }),
        });
        (0, jquery_1.default)('#q').val(''); // jQuery flourish
    }
}
