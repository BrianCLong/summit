"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackQueryLatency = exports.trackSyncDivergence = exports.trackTimeWindowChange = exports.getTelemetryContext = exports.reportError = exports.trackGoldenPathStep = exports.categorizeError = exports.generateErrorFingerprint = void 0;
const audit_1 = require("./audit");
/**
 * Generates a stable fingerprint for an error to enable grouping and deduplication.
 * Uses error type, message pattern, and sanitized stack trace.
 */
const generateErrorFingerprint = (error) => {
    const name = error.name || 'UnknownError';
    const message = (error.message || '').replace(/\d+/g, 'N'); // Replace numbers with N
    const stack = (error.stack || '')
        .split('\n')
        .slice(0, 3) // Take first 3 stack frames
        .map(line => line.replace(/\d+/g, 'N')) // Normalize all numbers including line/col
        .join('|');
    const raw = `${name}:${message}:${stack}`;
    // Simple hash function (FNV-1a)
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
        hash ^= raw.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};
exports.generateErrorFingerprint = generateErrorFingerprint;
/**
 * Categorizes an error based on its properties and context.
 */
const categorizeError = (error, errorInfo) => {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    if (message.includes('network') || message.includes('fetch') || name.includes('networkerror')) {
        return 'network';
    }
    if (message.includes('graphql') || message.includes('query') || message.includes('loading')) {
        return 'data_fetch';
    }
    if (message.includes('mutation') || message.includes('update') || message.includes('save')) {
        return 'mutation';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
        return 'auth';
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return 'validation';
    }
    if (errorInfo?.componentStack) {
        return 'render';
    }
    return 'unknown';
};
exports.categorizeError = categorizeError;
// Generate or retrieve session correlation ID
const getSessionId = () => {
    let sid = sessionStorage.getItem('summit_session_id');
    if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem('summit_session_id', sid);
    }
    return sid;
};
// Generate or retrieve device ID
const getDeviceId = () => {
    let did = localStorage.getItem('summit_device_id');
    if (!did) {
        did = crypto.randomUUID();
        localStorage.setItem('summit_device_id', did);
    }
    return did;
};
/**
 * Tracks a step in the Golden Path user journey.
 * Sends a telemetry event to the backend.
 */
const trackGoldenPathStep = async (step, status = 'success') => {
    try {
        // Log locally for debug/audit
        (0, audit_1.recordAudit)('golden_path_step', { step, status });
        // Send to backend telemetry endpoint
        await fetch('/api/monitoring/telemetry/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-correlation-id': getSessionId(), // Use session ID as correlation ID for events
            },
            body: JSON.stringify({
                event: 'golden_path_step',
                labels: { step, status },
                context: {
                    sessionId: getSessionId(),
                    deviceId: getDeviceId(),
                    url: window.location.href
                }
            }),
        });
    }
    catch (error) {
        console.error('Failed to track golden path step:', error);
    }
};
exports.trackGoldenPathStep = trackGoldenPathStep;
/**
 * Reports an error to the backend telemetry service with fingerprinting and categorization.
 */
const reportError = async (error, errorInfo, severity = 'high', additionalContext) => {
    try {
        const fingerprint = (0, exports.generateErrorFingerprint)(error);
        const category = (0, exports.categorizeError)(error, errorInfo);
        const errorData = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo?.componentStack,
            severity,
            category,
            fingerprint,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...additionalContext,
        };
        // Log to console in dev
        if (import.meta.env.DEV) {
            console.group('🚨 Error Reported');
            console.error(error);
            console.info('Fingerprint:', fingerprint);
            console.info('Category:', category);
            console.info('Severity:', severity);
            console.info('Context:', errorInfo);
            console.groupEnd();
        }
        // Send to backend
        await fetch('/api/monitoring/telemetry/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-correlation-id': getSessionId(),
            },
            body: JSON.stringify({
                event: 'client_error',
                labels: {
                    type: error.name,
                    severity,
                    category,
                    fingerprint,
                },
                payload: errorData,
                context: {
                    sessionId: getSessionId(),
                    deviceId: getDeviceId(),
                }
            }),
        });
    }
    catch (trackingError) {
        // Fallback to console if reporting fails
        console.error('Failed to report error:', trackingError);
    }
};
exports.reportError = reportError;
const getTelemetryContext = () => ({
    sessionId: getSessionId(),
    deviceId: getDeviceId(),
});
exports.getTelemetryContext = getTelemetryContext;
// Tri-pane Telemetry
const trackTimeWindowChange = async (startMs, endMs, granularity, tzMode, source) => {
    // Implementation for sending triPane.timeWindow.change
    // console.log('triPane.timeWindow.change', { startMs, endMs, granularity, tzMode, source });
};
exports.trackTimeWindowChange = trackTimeWindowChange;
const trackSyncDivergence = async (deltaStartMs, deltaEndMs, pane, granularity) => {
    // Implementation for sending triPane.sync.divergence_detected
    // console.log('triPane.sync.divergence_detected', { deltaStartMs, deltaEndMs, pane, granularity });
};
exports.trackSyncDivergence = trackSyncDivergence;
const trackQueryLatency = async (pane, durationMs) => {
    // Implementation for sending triPane.query.latency_ms
    // console.log('triPane.query.latency_ms', { pane, durationMs });
};
exports.trackQueryLatency = trackQueryLatency;
