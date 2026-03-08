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
exports.default = ClaimsViewer;
const react_1 = __importStar(require("react"));
function ClaimsViewer({ runId }) {
    const [sets, setSets] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/graphql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: `{ claims(runId:"${runId}"){ id merkleRoot claims{type subject} } }`,
            }),
        })
            .then((r) => r.json())
            .then((j) => setSets(j.data?.claims || []));
    }, [runId]);
    return (<div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">ClaimSets</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Merkle Root</th>
          </tr>
        </thead>
        <tbody>
          {sets.map((s) => (<tr key={s.id} className="border-b">
              <td className="font-mono">{String(s.id).slice(0, 8)}…</td>
              <td className="font-mono">
                {String(s.merkleRoot || '').slice(0, 12)}…
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
