import React from "react";
import { ApprovalStatus } from "../../api/types.js";

export interface ApprovalFilterState {
  status: ApprovalStatus | "ALL";
  tenantId: string;
  operation: string;
  riskTier: string;
}

interface Props {
  value: ApprovalFilterState;
  onChange(next: ApprovalFilterState): void;
  onReset?(): void;
}

export const ApprovalFilters: React.FC<Props> = ({ value, onChange, onReset }) => {
  const setField = <K extends keyof ApprovalFilterState>(key: K, v: ApprovalFilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex gap-3 flex-wrap items-end">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600">Status</label>
        <select
          value={value.status}
          onChange={(e) => setField("status", e.target.value as ApprovalFilterState["status"])}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600">Tenant</label>
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="tenant id or slug"
          value={value.tenantId}
          onChange={(e) => setField("tenantId", e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600">Operation</label>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={value.operation}
          onChange={(e) => setField("operation", e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-600">Risk tier</label>
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="e.g. high"
          value={value.riskTier}
          onChange={(e) => setField("riskTier", e.target.value)}
        />
      </div>

      <button
        type="button"
        className="text-xs border rounded px-3 py-1 h-9 self-end disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        onClick={() => onReset?.()}
        disabled={!onReset}
      >
        Reset filters
      </button>
    </div>
  );
};
