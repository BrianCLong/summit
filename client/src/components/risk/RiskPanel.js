"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RiskPanel;
const react_1 = __importDefault(require("react"));
function RiskPanel({ result }) {
    return (<div>
      <h3>Risk {result.band}</h3>
      <ul>
        {result.contributions.map((c) => (<li key={c.feature}>
            {c.feature}: {c.delta.toFixed(2)}
          </li>))}
      </ul>
    </div>);
}
