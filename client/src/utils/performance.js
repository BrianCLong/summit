/**
 * Frontend Performance Monitoring
 *
 * Tracks Core Web Vitals and reports metrics for performance monitoring.
 * See: https://web.dev/vitals/
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

/**
 * Report Web Vitals to console in development
 */
export function reportWebVitals() {
  const isDevelopment = import.meta.env.DEV;

  function sendToConsole(metric) {
    const { name, value, rating, delta } = metric;

    if (isDevelopment) {
      // Use emoji indicators for quick visual feedback
      const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(`${emoji} ${name}:`, {
        value: `${Math.round(value)}ms`,
        rating,
        delta: `${Math.round(delta)}ms`,
      });
    }
  }

  // Track all Core Web Vitals
  onCLS(sendToConsole);  // Cumulative Layout Shift
  onFID(sendToConsole);  // First Input Delay
  onFCP(sendToConsole);  // First Contentful Paint
  onLCP(sendToConsole);  // Largest Contentful Paint
  onTTFB(sendToConsole); // Time to First Byte
}

/**
 * Report Web Vitals to analytics service (production)
 */
export function reportWebVitalsToAnalytics() {
  const isProduction = import.meta.env.PROD;

  if (!isProduction) return;

  function sendToAnalytics(metric) {
    const { name, value, rating, id, delta } = metric;

    // Send to analytics endpoint
    // You can integrate with:
    // - Google Analytics
    // - DataDog
    // - New Relic
    // - Custom analytics service

    if (window.gtag) {
      // Google Analytics 4
      window.gtag('event', name, {
        event_category: 'Web Vitals',
        event_label: id,
        value: Math.round(value),
        rating,
        delta: Math.round(delta),
        non_interaction: true,
      });
    }

    // Or send to custom endpoint
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        value: Math.round(value),
        rating,
        id,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true, // Ensure request completes even if page is unloading
    }).catch(() => {
      // Silently fail - don't impact user experience
    });
  }

  // Track all Core Web Vitals
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

/**
 * Performance thresholds based on Web Vitals recommendations
 */
export const PERFORMANCE_THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  FID: {
    good: 100,
    needsImprovement: 300,
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
};

/**
 * Get performance rating based on value
 */
export function getPerformanceRating(metricName, value) {
  const threshold = PERFORMANCE_THRESHOLDS[metricName];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Mark performance events for custom measurements
 */
export function markPerformance(name) {
  if (performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name, startMark, endMark) {
  if (performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`⏱️ ${name}: ${Math.round(measure.duration)}ms`);
      return measure.duration;
    } catch (error) {
      console.warn(`Failed to measure performance for ${name}:`, error);
    }
  }
  return null;
}

/**
 * Log bundle loading times
 */
export function logBundlePerformance() {
  if (!performance.getEntriesByType) return;

  const resources = performance.getEntriesByType('resource');
  const jsResources = resources.filter((r) => r.name.endsWith('.js'));
  const cssResources = resources.filter((r) => r.name.endsWith('.css'));

  console.group('📦 Bundle Loading Performance');

  console.log(`JavaScript bundles: ${jsResources.length}`);
  console.log(
    `Total JS size: ${Math.round(
      jsResources.reduce((acc, r) => acc + (r.transferSize || 0), 0) / 1024
    )}KB`
  );
  console.log(
    `Total JS load time: ${Math.round(
      jsResources.reduce((acc, r) => acc + r.duration, 0)
    )}ms`
  );

  console.log(`\nCSS bundles: ${cssResources.length}`);
  console.log(
    `Total CSS size: ${Math.round(
      cssResources.reduce((acc, r) => acc + (r.transferSize || 0), 0) / 1024
    )}KB`
  );

  console.groupEnd();
}

/**
 * Initialize all performance monitoring
 */
export function initPerformanceMonitoring() {
  // Report Web Vitals to console in development
  reportWebVitals();

  // Report Web Vitals to analytics in production
  reportWebVitalsToAnalytics();

  // Log bundle performance after page load
  if (document.readyState === 'complete') {
    logBundlePerformance();
  } else {
    window.addEventListener('load', logBundlePerformance);
  }
}
