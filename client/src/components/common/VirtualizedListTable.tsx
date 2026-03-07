import React, { useCallback, useMemo } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

type Column<T> = {
  key: string;
  label: string;
  width?: string;
  render: (item: T) => React.ReactNode;
};

type VirtualizedListTableProps<T> = {
  items: T[];
  columns: Column<T>[];
  height: number;
  rowHeight: number;
  virtualizationEnabled: boolean;
  overscan?: number;
  getRowId?: (item: T, index: number) => string | number;
  ariaLabel?: string;
  emptyMessage?: string;
};

type ItemData<T> = {
  items: T[];
  columns: Column<T>[];
  gridTemplate: string;
  getRowId?: (item: T, index: number) => string | number;
};

function RowRenderer<T>({ index, style, data }: ListChildComponentProps<ItemData<T>>) {
  const item = data.items[index];
  const rowId = data.getRowId?.(item, index) ?? index;

  return (
    <div
      role="row"
      tabIndex={0}
      data-row-index={index}
      style={{ ...style, display: "grid", gridTemplateColumns: data.gridTemplate }}
      className="border-b border-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 bg-white"
      aria-rowindex={index + 1}
      key={rowId}
    >
      {data.columns.map((column) => (
        <div
          role="cell"
          key={column.key}
          className="px-3 py-2 text-sm text-gray-900 truncate"
          style={{ minWidth: 0 }}
        >
          {column.render(item)}
        </div>
      ))}
    </div>
  );
}

export function VirtualizedListTable<T>({
  items,
  columns,
  height,
  rowHeight,
  virtualizationEnabled,
  overscan = 6,
  getRowId,
  ariaLabel,
  emptyMessage = "No rows",
}: VirtualizedListTableProps<T>) {
  const gridTemplate = useMemo(() => columns.map((col) => col.width || "1fr").join(" "), [columns]);

  const itemData = useMemo<ItemData<T>>(
    () => ({ items, columns, gridTemplate, getRowId }),
    [items, columns, gridTemplate, getRowId]
  );

  const renderStaticRows = useCallback(
    () =>
      items.map((item, index) => {
        const rowId = getRowId?.(item, index) ?? index;
        return (
          <div
            role="row"
            tabIndex={0}
            data-row-index={index}
            key={rowId}
            style={{ display: "grid", gridTemplateColumns: gridTemplate }}
            className="border-b border-gray-200 bg-white"
            aria-rowindex={index + 1}
          >
            {columns.map((column) => (
              <div
                role="cell"
                key={column.key}
                className="px-3 py-2 text-sm text-gray-900 truncate"
                style={{ minWidth: 0 }}
              >
                {column.render(item)}
              </div>
            ))}
          </div>
        );
      }),
    [items, columns, gridTemplate, getRowId]
  );

  return (
    <div
      role="table"
      aria-label={ariaLabel}
      className="w-full border border-gray-200 rounded-md overflow-hidden"
    >
      <div role="rowgroup" className="bg-gray-50 border-b border-gray-200">
        <div
          role="row"
          className="grid text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              role="columnheader"
              className="px-3 py-2 whitespace-nowrap"
              style={{ minWidth: 0 }}
            >
              {column.label}
            </div>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-3 text-sm text-gray-500" role="rowgroup">
          {emptyMessage}
        </div>
      ) : virtualizationEnabled ? (
        <List
          height={height}
          itemCount={items.length}
          itemSize={rowHeight}
          itemData={itemData}
          overscanCount={overscan}
        >
          {RowRenderer}
        </List>
      ) : (
        <div role="rowgroup">{renderStaticRows()}</div>
      )}
    </div>
  );
}

export default VirtualizedListTable;
