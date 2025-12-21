/**
 * Analytics event types and utilities
 */

export type AnalyticsEventName =
  | 'page_view'
  | 'nav_click'
  | 'cta_click'
  | 'outbound_click'
  | 'section_view'
  | 'scroll_milestone'
  | 'error_client';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  ts: number;
  path: string;
  ref?: string;
  props?: Record<string, string | number | boolean | null>;
}

/**
 * Sanitize properties to only allow safe types
 */
export function safeProps(
  props: unknown,
): Record<string, string | number | boolean | null> {
  if (!props || typeof props !== 'object') return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      v === null
    ) {
      out[k] = v;
    }
  }
  return out;
}
