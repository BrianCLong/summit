"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LogsPanel;
// =============================================
// File: apps/web/src/components/maestro/LogsPanel.tsx
// =============================================
const react_1 = __importDefault(require("react"));
const useMaestroLogs_1 = require("../../hooks/useMaestroLogs");
function LogsPanel() {
    const { events, stats } = (0, useMaestroLogs_1.useLogs)();
    return (<div className="rounded-2xl border p-3 space-y-3 h-[420px] flex flex-col">
      <div className="flex items-center gap-3 text-sm">
        <span className="badge">info {stats.info}</span>
        <span className="badge badge-warning">warn {stats.warn}</span>
        <span className="badge badge-error">error {stats.error}</span>
      </div>
      <div className="flex-1 overflow-auto text-sm">
        <ul className="space-y-1">
          {events.map((e, i) => (<li key={i} className="flex items-start gap-2">
              <span className={`badge ${e.level === 'error' ? 'badge-error' : e.level === 'warn' ? 'badge-warning' : ''}`}>
                {e.level}
              </span>
              <code className="opacity-70">
                {new Date(e.ts).toLocaleTimeString()}
              </code>
              <span className="font-mono">[{e.source}]</span>
              <span>{e.message}</span>
            </li>))}
        </ul>
      </div>
    </div>);
}
