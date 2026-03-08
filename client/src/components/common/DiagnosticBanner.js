"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiagnosticBanner;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function DiagnosticBanner() {
    const apiUrl = import.meta.env?.VITE_API_URL;
    const wsUrl = import.meta.env?.VITE_WS_URL;
    const issues = [];
    if (!apiUrl)
        issues.push('VITE_API_URL is not set');
    if (!wsUrl)
        issues.push('VITE_WS_URL is not set');
    if (issues.length === 0)
        return null;
    return (<material_1.Alert severity="warning" sx={{ mb: 2 }} role="status" aria-live="polite">
      <material_1.AlertTitle>Configuration Required</material_1.AlertTitle>
      <material_1.Stack spacing={0.5}>
        {issues.map((m) => (<span key={m}>• {m}</span>))}
        <span>
          See{' '}
          <material_1.Link href="/README#environment" underline="hover">
            Environment setup
          </material_1.Link>{' '}
          or set values in your <code>.env</code>.
        </span>
      </material_1.Stack>
    </material_1.Alert>);
}
