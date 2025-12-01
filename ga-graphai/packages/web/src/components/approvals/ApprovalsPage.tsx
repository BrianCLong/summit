import React, { useEffect, useState } from "react";
import { Approval, ApprovalStatus } from "../../api/types.js";
import { fetchApprovals } from "../../api/approvals.js";
import { ApprovalsTable } from "./ApprovalsTable.js";
import { ApprovalDetailDrawer } from "./ApprovalDetailDrawer.js";
import { ApprovalFilters, ApprovalFilterState } from "./ApprovalFilters.js";

export const ApprovalsPage: React.FC = () => {
  const [filters, setFilters] = useState<ApprovalFilterState>({
    status: "PENDING",
    tenantId: "",
    operation: "grant_elevated_access",
    riskTier: "",
  });
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  useEffect(() => {
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
        });
        setApprovals(res.items);
        setTotal(res.total);
      } catch (e: any) {
        setError(e.message ?? "Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [filters, page, pageSize]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Approvals</h1>
          <p className="text-sm text-gray-500">Review and decide on elevated access requests.</p>
        </div>
      </header>

      <ApprovalFilters value={filters} onChange={setFilters} />

      <div className="flex-1 mt-4">
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}
        {!loading && approvals.length === 0 && !error && (
          <div className="text-sm text-gray-500">No approvals match your filters.</div>
        )}

        {approvals.length > 0 && (
          <ApprovalsTable
            approvals={approvals}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onSelect={(id) => setSelectedApprovalId(id)}
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
