/**
 * DemoIndicator.jsx
 * Visual indicator that appears when DEMO_MODE is enabled.
 * Provides clear visual feedback that the application is running in demo mode.
 */

import React from "react";

const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "1" ||
  import.meta.env.VITE_DEMO_MODE === "true" ||
  import.meta.env.DEMO_MODE === "1";

/**
 * Demo mode indicator component
 * Only renders when DEMO_MODE is enabled
 */
export function DemoIndicator() {
  if (!DEMO_MODE) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#f59e0b",
        color: "#000",
        textAlign: "center",
        padding: "4px 8px",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.5px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <span role="img" aria-label="warning">
        ⚠️
      </span>{" "}
      DEMO MODE - Data shown is for demonstration purposes only{" "}
      <span role="img" aria-label="warning">
        ⚠️
      </span>
    </div>
  );
}

/**
 * Hook to check if demo mode is enabled
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDemoMode() {
  return DEMO_MODE;
}

/**
 * Floating badge version of the demo indicator
 * Can be placed anywhere in the UI
 */
export function DemoBadge({ className = "" }) {
  if (!DEMO_MODE) {
    return null;
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        backgroundColor: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#92400e",
      }}
    >
      DEMO
    </span>
  );
}

export default DemoIndicator;
