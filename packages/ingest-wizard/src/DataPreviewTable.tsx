import React from 'react';

export type DataPreviewScalar = string | number | boolean | null | undefined;

export interface DataPreviewRow {
  [key: string]: DataPreviewScalar;
}

export type RawPreviewRow = Record<string, unknown> | Array<unknown>;

export interface DataPreviewTableProps {
  columns: string[];
  rows: DataPreviewRow[];
  totalRows?: number;
  isTruncated?: boolean;
  emptyMessage?: string;
}

export const formatPreviewValue = (value: DataPreviewScalar): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
};

export const normalizePreviewRows = (
  rows: RawPreviewRow[],
  columns: string[] = []
): DataPreviewRow[] => {
  return rows.map((row) => {
    if (Array.isArray(row)) {
      return columns.reduce<DataPreviewRow>((acc, column, index) => {
        acc[column] = row[index] as DataPreviewScalar;
        return acc;
      }, {});
    }

    return Object.entries(row).reduce<DataPreviewRow>((acc, [key, value]) => {
      if (value === null || value === undefined) {
        acc[key] = value as DataPreviewScalar;
        return acc;
      }

      if (typeof value === 'object') {
        try {
          acc[key] = JSON.stringify(value);
        } catch (error) {
          acc[key] = String(value);
        }
        return acc;
      }

      acc[key] = value as DataPreviewScalar;
      return acc;
    }, {});
  });
};

export const inferPreviewColumns = (
  rows: DataPreviewRow[],
  explicitColumns?: string[]
): string[] => {
  if (explicitColumns && explicitColumns.length > 0) {
    return explicitColumns;
  }

  const columnSet = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => columnSet.add(key));
  });

  return Array.from(columnSet);
};

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  columns,
  rows,
  totalRows,
  isTruncated,
  emptyMessage = 'No sample data available.'
}) => {
  const hasData = columns.length > 0 && rows.length > 0;

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white">
      <div className="overflow-auto max-h-96">
        {hasData ? (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wide text-xs"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {formatPreviewValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-gray-500 text-sm">{emptyMessage}</div>
        )}
      </div>
      {typeof totalRows === 'number' && (
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
          Showing {rows.length} of {totalRows} rows
          {isTruncated ? ' (truncated)' : ''}
        </div>
      )}
    </div>
  );
};

export default DataPreviewTable;
