import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";

const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  border: 0,
};

type RouteAnnouncerProps = {
  mainRef: React.RefObject<HTMLElement>;
  routeLabels: Record<string, string>;
};

export function RouteAnnouncer({ mainRef, routeLabels }: RouteAnnouncerProps) {
  const location = useLocation();
  const guardrailsEnabled = useFeatureFlag("ui.a11yGuardrails");
  const [message, setMessage] = useState("Navigation ready");

  const currentLabel = useMemo(() => {
    const rawLabel =
      routeLabels[location.pathname] || location.pathname.replace("/", "") || "current page";
    return rawLabel.trim() || "current page";
  }, [location.pathname, routeLabels]);

  useEffect(() => {
    if (!guardrailsEnabled) {
      return;
    }

    setMessage(`Navigated to ${currentLabel}`);

    if (mainRef?.current) {
      mainRef.current.focus({ preventScroll: true });
    }
  }, [currentLabel, guardrailsEnabled, mainRef]);

  if (!guardrailsEnabled) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      role="status"
      aria-atomic="true"
      style={visuallyHidden}
      data-testid="route-announcer"
    >
      {message}
    </div>
  );
}

export default RouteAnnouncer;
