"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpOverlay = void 0;
// conductor-ui/frontend/src/components/HelpOverlay.tsx
const react_1 = __importDefault(require("react"));
const HelpOverlay = () => {
    // Placeholder for the Help/Docs overlay (Ctrl/Cmd+/).
    return (<div style={{ display: 'none' }}>
      <h2>Help & Documentation</h2>
      <ul>
        <li>
          <b>Ctrl/Cmd+K</b>: Open Command Palette
        </li>
        <li>
          <b>Ctrl/Cmd+/</b>: Open Help
        </li>
      </ul>
    </div>);
};
exports.HelpOverlay = HelpOverlay;
