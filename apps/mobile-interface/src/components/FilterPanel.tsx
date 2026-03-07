// @ts-nocheck
import React from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterPanelProps {
  filters?: {
    status?: string[];
    type?: string[];
    priority?: string[];
  };
  onChange?: (filters: { status?: string[]; type?: string[]; priority?: string[] }) => void;
  className?: string;
}

export function FilterPanel({ filters = {}, onChange, className = "" }: FilterPanelProps) {
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Filters</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-400">Status</label>
          <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
