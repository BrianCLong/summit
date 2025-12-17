/**
 * Frontend Performance Monitoring with Web Vitals
 *
 * Enhanced version with development logging and production analytics
 * See: https://web.dev/vitals/
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Send metrics to backend monitoring service
 */
function sendToBackend(metric) {
  if (!isProduction) return;

  try {
    fetch('/monitoring/web-vitals', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
        id: metric.id,
        delta: Math.round(metric.delta),
        timestamp: Date.now(),
        url: window.location.href,
      }),
    });
  } catch (_) {
    // Silently fail - don't impact user experience
  }
}

/**
 * Log metrics to console in development
 */
function logToConsole(metric) {
  if (!isDevelopment) return;

  const { name, value, rating, delta } = metric;

  // Use emoji indicators for quick visual feedback
  const emoji =
    rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';

  console.log(`${emoji} ${name}:`, {
    value: `${Math.round(value)}ms`,
    rating,
    delta: `${Math.round(delta)}ms`,
  });
}

/**
 * Combined metric handler
 */
function handleMetric(metric) {
  logToConsole(metric);
  sendToBackend(metric);
}

/**
 * Log bundle loading performance
 */
function logBundlePerformance() {
  if (!isDevelopment || !performance.getEntriesByType) return;

  const resources = performance.getEntriesByType('resource');
  const jsResources = resources.filter((r) => r.name.endsWith('.js'));
  const cssResources = resources.filter((r) => r.name.endsWith('.css'));

  console.group('📦 Bundle Loading Performance');

  const jsTotalSize = jsResources.reduce(
    (acc, r) => acc + (r.transferSize || 0),
    0
  );
  const jsTotalTime = jsResources.reduce((acc, r) => acc + r.duration, 0);

  console.log(`JavaScript bundles: ${jsResources.length}`);
  console.log(`Total JS size: ${Math.round(jsTotalSize / 1024)}KB`);
  console.log(`Total JS load time: ${Math.round(jsTotalTime)}ms`);

  if (cssResources.length > 0) {
    const cssTotalSize = cssResources.reduce(
      (acc, r) => acc + (r.transferSize || 0),
      0
    );
    console.log(`\nCSS bundles: ${cssResources.length}`);
    console.log(`Total CSS size: ${Math.round(cssTotalSize / 1024)}KB`);
  }

  console.groupEnd();
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals() {
  // Track all Core Web Vitals
  onCLS(handleMetric); // Cumulative Layout Shift
  onFID(handleMetric); // First Input Delay
  onFCP(handleMetric); // First Contentful Paint
  onLCP(handleMetric); // Largest Contentful Paint
  onTTFB(handleMetric); // Time to First Byte

  // Log bundle performance after page load (development only)
  if (isDevelopment) {
    if (document.readyState === 'complete') {
      logBundlePerformance();
    } else {
      window.addEventListener('load', logBundlePerformance);
    }
  }
}
