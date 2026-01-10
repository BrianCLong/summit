import React, { useMemo } from "react";
import { Approval } from "../../api/types.js";

type SortableColumn = "operation" | "requesterId" | "tenantId" | "status" | "createdAt";

type ColumnKey = SortableColumn | "targetUser";

interface Props {
  approvals: Approval[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: SortableColumn;
  sortDirection: "asc" | "desc";
  isLoading?: boolean;
  onPageChange(page: number): void;
  onPageSizeChange(size: number): void;
  onSelect(id: string): void;
  onSortChange(column: SortableColumn): void;
}

const columns: Array<{
  key: ColumnKey;
  label: string;
  sortable: boolean;
}> = [
  { key: "operation", label: "Operation", sortable: true },
  { key: "requesterId", label: "Requester", sortable: true },
  { key: "targetUser", label: "Target user", sortable: false },
  { key: "tenantId", label: "Tenant", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "createdAt", label: "Created", sortable: true },
];

export const ApprovalsTable: React.FC<Props> = ({
  approvals,
  total,
  page,
  pageSize,
  sortBy,
  sortDirection,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onSelect,
  onSortChange,
}) => {
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const placeholderRows = useMemo(() => Math.max(3, Math.min(pageSize, 6)), [pageSize]);

  const renderSortIndicator = (column: SortableColumn) => {
    if (sortBy !== column) return "⇅";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const renderCell = (approval: Approval, column: ColumnKey) => {
    switch (column) {
      case "operation":
        return approval.operation;
      case "requesterId":
        return approval.requesterId;
      case "targetUser":
        return (
          <>
            {approval.target.userId}
            {approval.target.role ? ` (${approval.target.role})` : ""}
          </>
        );
      case "tenantId":
        return approval.target.tenantId;
      case "status":
        return <span className="uppercase text-xs font-semibold">{approval.status}</span>;
      case "createdAt":
        return new Date(approval.createdAt).toLocaleString();
      default:
        return null;
    }
  };

  const clampAndChangePage = (next: number) => {
    const bounded = Math.min(Math.max(next, 0), totalPages - 1);
    onPageChange(bounded);
  };

  return (
    <div className="border rounded-md overflow-hidden" aria-busy={isLoading}>
      <table className="min-w-full text-sm" aria-busy={isLoading}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => {
              const isSorted = column.sortable && sortBy === column.key;
              return (
                <th
                  key={column.key}
                  className="px-3 py-2 text-left font-medium text-gray-600"
                  scope="col"
                  aria-sort={
                    column.sortable
                      ? isSorted
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key as SortableColumn)}
                      className="flex items-center gap-1 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                      <span>{column.label}</span>
                      <span aria-hidden>{renderSortIndicator(column.key as SortableColumn)}</span>
                    </button>
                  ) : (
                    <span>{column.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && approvals.length === 0
            ? Array.from({ length: placeholderRows }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse bg-white">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3">
                      <div className="h-3 rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            : approvals.map((a) => (
                <tr
                  key={a.id}
                  className="hover:bg-gray-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black"
                  tabIndex={0}
                  onClick={() => onSelect(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(a.id);
                    }
                  }}
                  aria-label={`Approval ${a.id} for ${a.target.userId}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2">
                      {renderCell(a, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-2 px-3 py-2 border-t bg-white text-xs text-gray-700 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span>
            Page {page + 1} of {totalPages} ({total} total)
          </span>
          <label className="flex items-center gap-2">
            Rows per page
            <select
              className="border rounded px-2 py-1"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => clampAndChangePage(0)}
            className="border rounded px-2 py-1 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            First
          </button>
          <button
            disabled={page === 0}
            onClick={() => clampAndChangePage(page - 1)}
            className="border rounded px-2 py-1 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Previous
          </button>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => clampAndChangePage(page + 1)}
            className="border rounded px-2 py-1 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Next
          </button>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => clampAndChangePage(totalPages - 1)}
            className="border rounded px-2 py-1 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};
