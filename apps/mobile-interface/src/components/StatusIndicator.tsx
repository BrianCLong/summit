// @ts-nocheck
import React from "react";

interface StatusIndicatorProps {
  status?: "online" | "offline" | "syncing";
  className?: string;
}

export function StatusIndicator({ status = "online", className = "" }: StatusIndicatorProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-red-500",
    syncing: "bg-yellow-500",
  };

  const statusLabels = {
    online: "Online",
    offline: "Offline",
    syncing: "Syncing...",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-sm text-gray-600 dark:text-gray-400">{statusLabels[status]}</span>
    </div>
  );
}
