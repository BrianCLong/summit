import { cn } from '@/lib/utils';

interface TableProps {
  columns: string[];
  rows: string[][];
  className?: string;
}

export function Table({ columns, rows, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col, i) => (
              <th
                key={i}
                className="pb-3 pr-4 text-left font-medium text-[var(--muted)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)]">
              {row.map((cell, j) => (
                <td key={j} className="py-3 pr-4 text-[var(--muted)]">
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
