import { onCLS, onINP, onLCP } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onINP(onPerfEntry);
    onLCP(onPerfEntry);
  } else {
    // Default handler: send to server
    const sendToAnalytics = (metric: any) => {
      const body = JSON.stringify(metric);
      const token = localStorage.getItem('auth_token');

      // Always use fetch to support custom headers for authentication
      // keepalive: true ensures the request outlives the page (similar to sendBeacon)
      fetch('/api/monitoring/web-vitals', {
        body,
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }).catch(console.error);
    };
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
  }
};

export default reportWebVitals;
