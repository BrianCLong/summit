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
exports.default = InsightStudio;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function InsightStudio({ runId }) {
    const [cands, setCands] = (0, react_1.useState)([]);
    const [sel, setSel] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetch(`/api/runs/${runId}/candidates`)
            .then((r) => r.json())
            .then(setCands);
    }, [runId]);
    (0, react_1.useEffect)(() => {
        const h = function () {
            const v = this.value?.toString().toLowerCase() || '';
            (0, jquery_1.default)('.row').each(function () {
                (0, jquery_1.default)(this).toggle((0, jquery_1.default)(this).text().toLowerCase().indexOf(v) >= 0);
            });
        };
        (0, jquery_1.default)('#q').on('input', h);
        return () => (0, jquery_1.default)('#q').off('input', h);
    }, [cands.length]);
    return (<div className="grid grid-cols-2 gap-4 p-4">
      <div className="col-span-1 rounded-2xl shadow p-3">
        <div className="flex gap-2 mb-2">
          <h3 className="text-lg font-semibold">AI Suggestions</h3>
          <input id="q" className="border rounded px-2 py-1" placeholder="filter…"/>
        </div>
        <ul className="text-sm">
          {cands.map((c) => (<li key={c.id} className="row py-1 border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSel(c)}>
              {c.type} • {c.subjectA} ⇄ {c.subjectB} • score{' '}
              {Number(c.score || 0).toFixed(2)}
            </li>))}
        </ul>
      </div>
      <div className="col-span-1 rounded-2xl shadow p-3">
        {sel ? (<div>
            <h3 className="text-lg font-semibold">Explain</h3>
            <pre className="text-xs bg-gray-50 p-2 rounded">
              {JSON.stringify(sel.explain, null, 2)}
            </pre>
            <div className="mt-2 flex gap-2">
              <button onClick={() => act(true)} className="px-3 py-1 rounded-2xl shadow">
                Approve
              </button>
              <button onClick={() => act(false)} className="px-3 py-1 rounded-2xl shadow">
                Decline
              </button>
            </div>
          </div>) : (<div className="text-sm text-gray-500">
            Select a suggestion to review…
          </div>)}
      </div>
    </div>);
    async function act(ok) {
        const reason = prompt('Reason?') || '';
        await fetch('/graphql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: `mutation { aiFeedback(runId:"${runId}", stepId:"infer_candidates", subjectId:"${sel?.id}", decision:"${ok ? 'approve' : 'decline'}", reason:${JSON.stringify(reason)} ) }`,
            }),
        });
        (0, jquery_1.default)('#q').val('');
    }
}
