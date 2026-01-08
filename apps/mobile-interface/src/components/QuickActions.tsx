// @ts-nocheck
import React from "react";

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className = "" }: QuickActionsProps) {
  return (
    <div className={`grid grid-cols-4 gap-4 p-4 ${className}`}>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">📋</span>
        <span className="text-xs mt-1">New Case</span>
      </button>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">🔍</span>
        <span className="text-xs mt-1">Search</span>
      </button>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">📊</span>
        <span className="text-xs mt-1">Reports</span>
      </button>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">⚙️</span>
        <span className="text-xs mt-1">Settings</span>
      </button>
    </div>
  );
}
