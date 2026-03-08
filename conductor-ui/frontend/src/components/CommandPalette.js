"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPalette = void 0;
// conductor-ui/frontend/src/components/CommandPalette.tsx
const react_1 = __importDefault(require("react"));
const CommandPalette = () => {
    // Placeholder for the command palette (Ctrl/Cmd+K).
    // Will include typeahead search for runs, incidents, etc.
    return (<div style={{ display: 'none' }}>
      <h2>Command Palette</h2>
      <input type="text" placeholder="Search for runs, incidents, tenants..."/>
    </div>);
};
exports.CommandPalette = CommandPalette;
