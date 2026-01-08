// @ts-nocheck
import React from "react";

interface AlertsPanelProps {
  className?: string;
}

export function AlertsPanel({ className = "" }: AlertsPanelProps) {
  return (
    <div className={`p-4 ${className}`}>
      <h3 className="font-semibold mb-3 dark:text-white">Alerts</h3>
      <div className="space-y-2">
        <div className="p-3 bg-green-50 dark:bg-green-900 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">No active alerts</p>
        </div>
      </div>
    </div>
  );
}
