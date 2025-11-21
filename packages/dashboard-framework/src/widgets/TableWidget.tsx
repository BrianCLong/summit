import React, { useState, useMemo } from 'react';
import { TableWidgetConfig, TableColumn } from '../types';

export interface TableWidgetProps {
  config: TableWidgetConfig;
  data?: any[];
  onRowClick?: (row: any) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
}

export function TableWidget({
  config,
  data = [],
  onRowClick,
  onSelectionChange,
}: TableWidgetProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const { columns = [], sortable, filterable, paginated, pageSize = 10, selectable } = config;

  const filteredData = useMemo(() => {
    if (!filterable || !filterText) return data;
    return data.filter(row =>
      columns.some(col =>
        String(row[col.field] ?? '').toLowerCase().includes(filterText.toLowerCase())
      )
    );
  }, [data, filterText, filterable, columns]);

  const sortedData = useMemo(() => {
    if (!sortable || !sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortColumn, sortDirection, sortable]);

  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (columnId: string) => {
    if (!sortable) return;
    if (sortColumn === columnId) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const handleSelectRow = (index: number) => {
    if (!selectable) return;
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection).map(i => sortedData[i]));
  };

  return (
    <div className="table-widget" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {filterable && (
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <input
            type="text"
            placeholder="Search..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            style={filterInputStyle}
          />
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {selectable && <th style={thStyle}></th>}
              {columns.map(col => (
                <th
                  key={col.id}
                  style={{ ...thStyle, cursor: sortable && col.sortable !== false ? 'pointer' : 'default' }}
                  onClick={() => col.sortable !== false && handleSort(col.field)}
                >
                  {col.label}
                  {sortColumn === col.field && (
                    <span style={{ marginLeft: '4px' }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr
                key={i}
                style={{ ...trStyle, backgroundColor: selectedRows.has(i) ? '#eff6ff' : 'transparent' }}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(i)}
                      onChange={() => handleSelectRow(i)}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.id} style={tdStyle}>
                    {formatCellValue(row[col.field], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedData.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            No data available
          </div>
        )}
      </div>

      {paginated && totalPages > 1 && (
        <div style={paginationStyle}>
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} style={pageButtonStyle}>
            Previous
          </button>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} style={pageButtonStyle}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatCellValue(value: any, column: TableColumn): string {
  if (value === null || value === undefined) return '-';
  if (column.format) return column.format(value);
  if (column.type === 'date' && value instanceof Date) return value.toLocaleDateString();
  if (column.type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  borderBottom: '2px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  position: 'sticky',
  top: 0,
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
};

const trStyle: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'background-color 0.15s',
};

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderTop: '1px solid #e5e7eb',
};

const pageButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  background: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};
