import { onCLS, onFID, onLCP, onFCP, onTTFB } from "web-vitals";

function sendToBackend(metric) {
  try {
    fetch("/monitoring/web-vitals", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
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

export function initWebVitals() {
  onCLS(sendToBackend);
  onFID(sendToBackend);
  onLCP(sendToBackend);
  onFCP(sendToBackend);
  onTTFB(sendToBackend);
}
