"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = Tooltip;
const react_1 = __importDefault(require("react"));
function Tooltip({ visible, x, y, content, offset = { x: 10, y: 10 }, style = {}, }) {
    if (!visible) {
        return null;
    }
    return (<div className="visualization-tooltip" style={{
            position: 'fixed',
            left: x + offset.x,
            top: y + offset.y,
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 10000,
            fontSize: '12px',
            maxWidth: '300px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            ...style,
        }}>
      {content}
    </div>);
}
