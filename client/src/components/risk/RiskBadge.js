"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RiskBadge;
const react_1 = __importDefault(require("react"));
function RiskBadge({ score, band }) {
    return (<span title={`Risk: ${band} (${score.toFixed(2)})`} style={{ padding: '2px 6px', borderRadius: '4px', background: '#eee' }}>
      {band}
    </span>);
}
