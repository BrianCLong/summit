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
exports.default = TimeTravelDiff;
const react_1 = __importStar(require("react"));
function TimeTravelDiff() {
    const [a, setA] = (0, react_1.useState)('');
    const [b, setB] = (0, react_1.useState)('');
    const [rows, setRows] = (0, react_1.useState)([]);
    async function run() {
        const r = await fetch(`/api/replay/diff?a=${a}&b=${b}`);
        setRows(await r.json());
    }
    return (<div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <input className="border rounded px-2 py-1" placeholder="run A id" onChange={(e) => setA(e.target.value)}/>
        <input className="border rounded px-2 py-1" placeholder="run B id" onChange={(e) => setB(e.target.value)}/>
        <button onClick={run} className="px-3 py-1 rounded-2xl shadow">
          Diff
        </button>
        <input id="f" className="border rounded px-2 py-1 ml-auto" placeholder="filter…"/>
      </div>
      <ul className="text-sm">
        {rows.map((d, i) => (<li key={i} className={`border-b py-1 ${d.severity != 'info' ? 'bg-yellow-50' : ''}`}>
            {d.stepId} • {d.type} • {d.severity}
          </li>))}
      </ul>
    </div>);
}
