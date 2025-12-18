import React from "react";
import { Approval } from "../../api/types.js";

interface Props {
  approvals: Approval[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange(page: number): void;
  onSelect(id: string): void;
}

export const ApprovalsTable: React.FC<Props> = ({
  approvals,
  total,
  page,
  pageSize,
  onPageChange,
  onSelect,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Operation</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Requester</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Target</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Tenant</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Created</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(a.id)}>
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

      <div className="flex items-center justify-between px-3 py-2 border-t bg-white text-xs text-gray-600">
        <span>
          Page {page + 1} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            className="border rounded px-2 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="border rounded px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
