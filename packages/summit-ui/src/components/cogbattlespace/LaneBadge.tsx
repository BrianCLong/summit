import React from "react";

export function LaneBadge({ lane }: { lane: "CANDIDATE" | "OBSERVED" | "TRUSTED" | "PROMOTED" }) {
  return (
    <span className="px-2 py-0.5 rounded-xl border text-xs">
      {lane}
    </span>
  );
}
