"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HypothesisWorkbench = HypothesisWorkbench;
const react_1 = __importDefault(require("react"));
const store_1 = require("../store");
const store = (0, store_1.createHypothesisStore)();
function HypothesisWorkbench() {
    return (<div>
      <h2>Hypotheses</h2>
      <ul>
        {store.hypotheses.map((h) => (<li key={h.id}>
            {h.text} – {Math.round(h.posterior * 100)}%
          </li>))}
      </ul>
    </div>);
}
exports.default = HypothesisWorkbench;
