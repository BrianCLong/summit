import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

/**
 * Sends a Web Vitals metric to the backend for monitoring.
 *
 * @param metric - The metric object containing name, value, and ID.
 */
function sendToBackend(metric) {
  try {
    fetch('/monitoring/web-vitals', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
      }),
    });
  } catch (_) {
    // Ignore errors
  }
}

/**
 * Initializes monitoring of core Web Vitals metrics.
 * Hooks into CLS, FID, LCP, FCP, and TTFB and reports them to the backend.
 */
export function initWebVitals() {
  onCLS(sendToBackend);
  onFID(sendToBackend);
  onLCP(sendToBackend);
  onFCP(sendToBackend);
  onTTFB(sendToBackend);
}
