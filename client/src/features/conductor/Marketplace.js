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
exports.default = Marketplace;
const react_1 = __importStar(require("react"));
function Marketplace() {
    const [items, setItems] = (0, react_1.useState)([]);
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [msg, setMsg] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        fetch('/plugins/registry.json', { signal: controller.signal })
            .then((r) => r.json())
            .then((j) => setItems(j.steps || []))
            .catch((err) => {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
                setItems([]);
            }
        });
        return () => controller.abort();
    }, []);
    async function install(n, v) {
        setBusy(true);
        setMsg('');
        try {
            await fetch(`/api/plugins/install?name=${encodeURIComponent(n)}&version=${encodeURIComponent(v)}`, { method: 'POST' });
            setMsg(`Installed ${n}@${v}`);
        }
        catch (e) {
            setMsg(`Failed: ${e?.message || e}`);
        }
        finally {
            setBusy(false);
        }
    }
    return (<div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Step Marketplace</h3>
      <div className="text-xs text-gray-600 mb-2">{msg}</div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Version</th>
            <th>Residency</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (<tr key={s.name + s.version} className="border-b">
              <td className="font-mono">{s.name}</td>
              <td>{s.type}</td>
              <td>{s.version}</td>
              <td>{(s.residency || []).join(',')}</td>
              <td>
                <button disabled={busy} onClick={() => install(s.name, s.version)} className="px-2 py-1 rounded-2xl shadow">
                  Install
                </button>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
