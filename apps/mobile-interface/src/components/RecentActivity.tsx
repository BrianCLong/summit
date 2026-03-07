// @ts-nocheck
import React from "react";

interface RecentActivityProps {
  className?: string;
}

export function RecentActivity({ className = "" }: RecentActivityProps) {
  return (
    <div className={`p-4 ${className}`}>
      <h3 className="font-semibold mb-3 dark:text-white">Recent Activity</h3>
      <div className="space-y-2">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm dark:text-gray-200">No recent activity</p>
        </div>
      </div>
    </div>
  );
}
