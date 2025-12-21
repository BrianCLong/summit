'use client';

import { safeProps, type AnalyticsEventName } from './events';

const mode = process.env.NEXT_PUBLIC_ANALYTICS_MODE ?? 'none';
const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? '/api/analytics';

/**
 * Track an analytics event (client-side)
 */
export function track(
  name: AnalyticsEventName,
  props?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (mode !== 'firstparty') return;

  const payload = {
    name,
    ts: Date.now(),
    path: window.location.pathname,
    ref: document.referrer || undefined,
    props: safeProps(props),
  };

  // Best-effort: don't block UX
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    }
  } catch {
    // Swallow analytics errors
  }
}

/**
 * Track a page view (call on route changes)
 */
export function trackPageView(): void {
  track('page_view');
}

/**
 * Track an outbound link click
 */
export function trackOutbound(url: string, label?: string): void {
  track('outbound_click', { url, label });
}
