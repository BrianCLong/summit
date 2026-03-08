"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Explain;
// apps/web/src/components/Explain.tsx
const react_1 = __importDefault(require("react"));
function Explain({ facts }) {
    return <div role="dialog" aria-label="Explain this view" className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-lg border border-gray-200 z-50">
    <h3 className="font-bold mb-2">Explain this view</h3>
    <ul className="list-disc pl-5">
      {facts.map((f, i) => <li key={i}>{f}</li>)}
    </ul>
  </div>;
}
