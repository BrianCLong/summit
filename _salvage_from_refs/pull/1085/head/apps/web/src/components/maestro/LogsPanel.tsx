// =============================================
// File: apps/web/src/components/maestro/LogsPanel.tsx
// =============================================
import React from 'react';
import { useLogs } from '../../hooks/useMaestroLogs';

export default function LogsPanel() {
  const { events, stats } = useLogs();
  return (
    <div className="rounded-2xl border p-3 space-y-3 h-[420px] flex flex-col">
      <div className="flex items-center gap-3 text-sm">
        <span className="badge">info {stats.info}</span>
        <span className="badge badge-warning">warn {stats.warn}</span>
        <span className="badge badge-error">error {stats.error}</span>
      </div>
      <div className="flex-1 overflow-auto text-sm">
        <ul className="space-y-1">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`badge ${e.level === 'error' ? 'badge-error' : e.level === 'warn' ? 'badge-warning' : ''}`}>{e.level}</span>
              <code className="opacity-70">{new Date(e.ts).toLocaleTimeString()}</code>
              <span className="font-mono">[{e.source}]</span>
              <span>{e.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
