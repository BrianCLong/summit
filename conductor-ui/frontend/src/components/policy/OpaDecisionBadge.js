"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpaDecisionBadge = void 0;
// conductor-ui/frontend/src/components/policy/OpaDecisionBadge.tsx
const react_1 = __importDefault(require("react"));
const OpaDecisionBadge = ({ decision }) => {
    const style = {
        padding: '4px 8px',
        borderRadius: '12px',
        color: 'white',
        backgroundColor: decision.allow ? 'green' : 'red',
    };
    return (<span style={style} title={decision.reason || (decision.allow ? 'Allowed' : 'Denied')}>
      {decision.allow ? 'Allowed' : 'Denied'}
    </span>);
};
exports.OpaDecisionBadge = OpaDecisionBadge;
