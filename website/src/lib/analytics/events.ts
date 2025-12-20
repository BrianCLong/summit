export type AnalyticsEventName = "page_view" | "nav_click" | "cta_click" | "outbound_click" | "error_client";

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  ts: number;
  path: string;
  ref?: string;
  props?: Record<string, string | number | boolean | null>;
};

export const safeProps = (props: unknown): Record<string, string | number | boolean | null> => {
  if (!props || typeof props !== "object") return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
};
