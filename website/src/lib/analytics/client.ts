import { safeProps, type AnalyticsEventName } from "./events";

const mode = process.env.NEXT_PUBLIC_ANALYTICS_MODE ?? "none";
const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? "/api/analytics";

export function track(name: AnalyticsEventName, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (mode !== "firstparty") return;

  const payload = {
    name,
    ts: Date.now(),
    path: window.location.pathname,
    ref: document.referrer || undefined,
    props: safeProps(props)
  };

  try {
    navigator.sendBeacon?.(endpoint, JSON.stringify(payload)) ||
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
  } catch {
    // ignore
  }
}
