import type { ReactNode } from "react";

export function Table({ columns, rows }: { columns: string[]; rows: (string | number | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className="border-b border-[var(--border)] px-3 py-2 text-left text-[var(--muted2)]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-[var(--border)] last:border-0">
              {row.map((cell, cidx) => (
                <td key={cidx} className="px-3 py-2 text-[var(--muted)]">
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
