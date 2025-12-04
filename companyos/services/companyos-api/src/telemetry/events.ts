import type { Request } from "express";

export function trackEvent(
  _req: Request,
  event: string,
  properties: Record<string, unknown>
): void {
  // placeholder telemetry hook
  if (process.env.DEBUG_TELEMETRY === "true") {
    // eslint-disable-next-line no-console
    console.log("telemetry", event, properties);
  }
}
