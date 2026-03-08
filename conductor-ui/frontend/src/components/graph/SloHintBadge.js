"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SloHintBadge = void 0;
// conductor-ui/frontend/src/components/graph/SloHintBadge.tsx
const react_1 = __importDefault(require("react"));
const SloHintBadge = ({ latencyMs, sloMs }) => {
    const isSlow = latencyMs > sloMs;
    const color = isSlow ? 'red' : 'green';
    return (<span style={{ color }}>
      {latencyMs}ms (SLO: {sloMs}ms)
    </span>);
};
exports.SloHintBadge = SloHintBadge;
