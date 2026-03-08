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
exports.default = MaestroAnswerPanel;
const react_1 = __importStar(require("react"));
const jquery_1 = __importDefault(require("jquery"));
function MaestroAnswerPanel() {
    const [data, setData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // demo query
        const q = `mutation{ orchestratedAnswer(question:"What changed in latest release?", contextId:"ctx1"){answer, citations{url}, consensusScore, conflicts} }`;
        jquery_1.default.ajax({
            url: '/graphql',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ query: q }),
        }).done((r) => setData(r.data.orchestratedAnswer));
    }, []);
    if (!data)
        return <div className="p-6">Loading…</div>;
    return (<div className="p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-semibold">Synthesized Answer</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{data.answer}</pre>
        <div className="mt-2 text-xs text-gray-600">
          Consensus: {(data.consensusScore * 100).toFixed(1)}%
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold">Citations</h3>
        <ul className="list-disc ml-5">
          {data.citations.map((c, i) => (<li key={i}>
              <a className="text-blue-600 underline" href={c.url} target="_blank" rel="noreferrer">
                {c.url}
              </a>
            </li>))}
        </ul>
      </div>
      {data.conflicts?.length > 0 && (<div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-3">
          <b>Conflicts detected:</b> {data.conflicts.length}. See Maestro Panel
          → Conflicts.
        </div>)}
    </div>);
}
