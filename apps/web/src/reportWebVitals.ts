import { onCLS, onINP, onLCP } from 'web-vitals'

const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry)
    onINP(onPerfEntry)
    onLCP(onPerfEntry)
  } else {
    // Default handler: send to server
    const sendToAnalytics = (metric: any) => {
      const body = JSON.stringify(metric)
      // Use sendBeacon if available for better reliability on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/monitoring/web-vitals', body)
      } else {
        fetch('/api/monitoring/web-vitals', {
          body,
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        }).catch(console.error)
      }
    }
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics)
    onLCP(sendToAnalytics)
  }
}

export default reportWebVitals
