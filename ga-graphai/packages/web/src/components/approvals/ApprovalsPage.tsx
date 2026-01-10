import React, { useCallback, useEffect, useState } from "react";
import { Approval, ApprovalStatus } from "../../api/types.js";
import { fetchApprovals } from "../../api/approvals.js";
import { ApprovalsTable } from "./ApprovalsTable.js";
import { ApprovalDetailDrawer } from "./ApprovalDetailDrawer.js";
import { ApprovalFilters, ApprovalFilterState } from "./ApprovalFilters.js";

type SortableColumn = "operation" | "requesterId" | "tenantId" | "status" | "createdAt";
type SortDirection = "asc" | "desc";
const DEFAULT_SORT: { by: SortableColumn; direction: SortDirection } = {
  by: "createdAt",
  direction: "desc",
};

const DEFAULT_FILTERS: ApprovalFilterState = {
  status: "PENDING",
  tenantId: "",
  operation: "grant_elevated_access",
  riskTier: "",
};

const maxPageIndex = (total: number, pageSize: number): number => Math.max(0, Math.ceil(total / pageSize) - 1);

export const ApprovalsPage: React.FC = () => {
  const [filters, setFilters] = useState<ApprovalFilterState>(DEFAULT_FILTERS);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [filters, pageSize, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchApprovals({
          status: filters.status === "ALL" ? undefined : (filters.status as ApprovalStatus),
          tenantId: filters.tenantId || undefined,
          operation: filters.operation || undefined,
          riskTier: filters.riskTier || undefined,
          page,
          pageSize,
          sortBy: sort.by,
          sortDirection: sort.direction,
          signal,
        });
        setTotal(res.total);
        const maxPage = maxPageIndex(res.total, pageSize);
        if (page > maxPage) {
          setPage(maxPage);
          return;
        }
        setApprovals(res.items);
      } catch (e: any) {
        if (signal.aborted) return;
        setError(e.message ?? "Failed to load approvals");
      } finally {
        if (signal.aborted) return;
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [filters, page, pageSize, sort, refreshIndex]);

  const handleRetry = useCallback(() => setRefreshIndex((n) => n + 1), []);

  const handleSortChange = useCallback(
    (column: SortableColumn) => {
      setSort((prev) => {
        if (prev.by === column) {
          return { by: column, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        return { by: column, direction: "desc" };
      });
    },
    [setSort]
  );

  const handleExportCsv = useCallback(() => {
    if (!approvals.length) return;
    const headers = ["operation", "requesterId", "targetUser", "targetRole", "tenantId", "status", "createdAt"];
    const rows = approvals.map((a) => [
      a.operation,
      a.requesterId,
      a.target.userId,
      a.target.role ?? "",
      a.target.tenantId,
      a.status,
      a.createdAt,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approvals-page-${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [approvals, page]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Approvals</h1>
          <p className="text-sm text-gray-500">Review and decide on elevated access requests.</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={approvals.length === 0}
          className="text-xs border rounded px-3 py-1 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Export CSV (page)
        </button>
      </header>

      <ApprovalFilters
        value={filters}
        onChange={setFilters}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setPage(0);
        }}
      />

      <div className="flex-1 mt-4">
        {error && (
          <div className="text-sm text-red-600 mb-2 flex items-center gap-3" role="alert">
            <span>Error: {error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="border rounded px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && approvals.length === 0 && !error && (
          <div className="text-sm text-gray-600 border rounded p-3 bg-gray-50">
            No approvals match your filters. Try clearing tenant/operation filters or expanding your status selection.
          </div>
        )}

        {approvals.length > 0 && (
          <ApprovalsTable
            approvals={approvals}
            total={total}
            page={page}
            pageSize={pageSize}
            sortBy={sort.by}
            sortDirection={sort.direction}
            isLoading={loading}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSelect={(id) => setSelectedApprovalId(id)}
            onSortChange={handleSortChange}
          />
        )}
        {loading && approvals.length === 0 && (
          <ApprovalsTable
            approvals={approvals}
            total={total || pageSize}
            page={page}
            pageSize={pageSize}
            sortBy={sort.by}
            sortDirection={sort.direction}
            isLoading
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSelect={(id) => setSelectedApprovalId(id)}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      <ApprovalDetailDrawer
        approvalId={selectedApprovalId}
        onClose={() => setSelectedApprovalId(null)}
        onDecision={() => {
          setPage(0);
        }}
      />
    </div>
  );
};
