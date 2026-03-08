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
exports.default = RetractionQueue;
const react_1 = __importStar(require("react"));
function RetractionQueue() {
    const [items, setItems] = (0, react_1.useState)([]);
    async function load(controller) {
        try {
            const r = await fetch('/graphql', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    query: `{ retractions { id subject status reason createdAt } }`,
                }),
                signal: controller?.signal,
            });
            const j = await r.json();
            setItems(j.data?.retractions || []);
        }
        catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
            }
        }
    }
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        load(controller);
        const t = setInterval(() => {
            if (!controller.signal.aborted) {
                load(controller);
            }
        }, 5000);
        return () => {
            controller.abort();
            clearInterval(t);
        };
    }, []);
    return (<div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Retractions</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (<tr key={i.id} className="border-b">
              <td className="font-mono">{String(i.id).slice(0, 6)}</td>
              <td>{i.subject}</td>
              <td>{i.status}</td>
              <td>{i.createdAt}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
