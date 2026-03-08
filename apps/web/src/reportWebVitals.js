"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web_vitals_1 = require("web-vitals");
const reportWebVitals = (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        (0, web_vitals_1.onCLS)(onPerfEntry);
        (0, web_vitals_1.onINP)(onPerfEntry);
        (0, web_vitals_1.onLCP)(onPerfEntry);
    }
    else {
        // Default handler: send to server
        const sendToAnalytics = (metric) => {
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
        (0, web_vitals_1.onCLS)(sendToAnalytics);
        (0, web_vitals_1.onINP)(sendToAnalytics);
        (0, web_vitals_1.onLCP)(sendToAnalytics);
    }
};
exports.default = reportWebVitals;
