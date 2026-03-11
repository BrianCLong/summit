import type { ReactNode } from "react";

export function Table({ columns, rows }: { columns: string[]; rows: (string | number | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full border-collapse text-[11px] font-medium tracking-tight">
        <thead>
          <tr className="bg-[var(--bg)] border-b border-[var(--border)]">
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted2)]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-[var(--bg)] transition-colors">
              {row.map((cell, cidx) => (
                <td key={cidx} className="px-4 py-3 text-[var(--muted)] mono-data">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
