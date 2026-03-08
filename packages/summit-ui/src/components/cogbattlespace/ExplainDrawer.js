"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainDrawer = ExplainDrawer;
const react_1 = __importDefault(require("react"));
function ExplainDrawer(props) {
    if (!props.open)
        return null;
    return (<div className="fixed inset-0 bg-black/40 flex justify-end">
      <div className="w-full max-w-xl h-full bg-white p-6 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{props.title}</h2>
          <button className="px-3 py-1 rounded-2xl border" onClick={props.onClose}>
            Close
          </button>
        </div>

        <pre className="mt-4 whitespace-pre-wrap text-sm">{props.body}</pre>

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Defensive disclaimers</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {props.disclaimers.map((d, i) => (<li key={i}>{d}</li>))}
          </ul>
        </div>
      </div>
    </div>);
}
