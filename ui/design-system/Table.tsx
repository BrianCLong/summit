import React from 'react';

export interface Column<T> {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  compact?: boolean;
  striped?: boolean;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  compact = false,
  striped = false,
  className = '',
}: TableProps<T>) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const alignClass = (align?: string) => (align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left');

  return (
    <div className={`overflow-x-auto rounded-lg border border-border-default ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-secondary border-b border-border-default">
            {columns.map((col) => (
              <th key={col.id} className={`${cellPadding} ${alignClass(col.align)} text-xs font-semibold text-fg-secondary uppercase tracking-wider`} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-muted">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-fg-tertiary">{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-bg-surfaceHover' : '',
                  striped && i % 2 === 1 ? 'bg-bg-secondary/50' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td key={col.id} className={`${cellPadding} ${alignClass(col.align)} text-fg-primary`}>
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
