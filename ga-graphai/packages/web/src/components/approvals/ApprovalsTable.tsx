import React, { useMemo } from "react";
import { Approval } from "../../api/types.js";

type SortableColumn = "operation" | "requesterId" | "tenantId" | "status" | "createdAt";

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

const columnLabels: Record<SortableColumn, string> = {
  operation: "Operation",
  requesterId: "Requester",
  tenantId: "Tenant",
  status: "Status",
  createdAt: "Created",
};

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

  const clampAndChangePage = (next: number) => {
    const bounded = Math.min(Math.max(next, 0), totalPages - 1);
    onPageChange(bounded);
  };

  return (
    <div className="border rounded-md overflow-hidden" aria-busy={isLoading}>
      <table className="min-w-full text-sm" aria-busy={isLoading}>
        <thead className="bg-gray-50">
          <tr>
            {(Object.keys(columnLabels) as SortableColumn[]).map((column) => (
              <th key={column} className="px-3 py-2 text-left font-medium text-gray-600" scope="col">
                <button
                  type="button"
                  onClick={() => onSortChange(column)}
                  className="flex items-center gap-1 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  aria-sort={
                    sortBy === column ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <span>{columnLabels[column]}</span>
                  <span aria-hidden>{renderSortIndicator(column)}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && approvals.length === 0
            ? Array.from({ length: placeholderRows }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse bg-white">
                  {(Object.keys(columnLabels) as SortableColumn[]).map((column) => (
                    <td key={column} className="px-3 py-3">
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
                  <td className="px-3 py-2">{a.operation}</td>
                  <td className="px-3 py-2">{a.requesterId}</td>
                  <td className="px-3 py-2">
                    {a.target.userId}
                    {a.target.role ? ` (${a.target.role})` : ""}
                  </td>
                  <td className="px-3 py-2">{a.target.tenantId}</td>
                  <td className="px-3 py-2">
                    <span className="uppercase text-xs font-semibold">{a.status}</span>
                  </td>
                  <td className="px-3 py-2">{new Date(a.createdAt).toLocaleString()}</td>
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
