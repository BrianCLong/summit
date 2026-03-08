"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abuseDetectionMiddleware = void 0;
const metrics_js_1 = require("../monitoring/metrics.js");
const ledger_js_1 = require("../provenance/ledger.js");
// Simple in-memory cache for abuse tracking (should be Redis in production)
const abuseCache = new Map();
const REPEAT_WINDOW_MS = 60 * 1000; // 1 minute
const REPEAT_THRESHOLD = 5; // 5 identical failed requests
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const abuseDetectionMiddleware = (req, res, next) => {
    const ip = req.ip || 'unknown';
    const key = `abuse:${ip}`;
    const entry = abuseCache.get(key);
    if (entry && entry.blockedUntil > Date.now()) {
        return res.status(403).json({
            error: 'Access denied due to suspicious activity.',
            retryAfter: Math.ceil((entry.blockedUntil - Date.now()) / 1000)
        });
    }
    // Hook into response to check for repeated failures
    const originalSend = res.json;
    res.json = function (body) {
        if (res.statusCode === 403 || res.statusCode === 422) {
            // Check if it's the same error?
            // For now, just count failed requests from this IP.
            const now = Date.now();
            const currentEntry = abuseCache.get(key) || { count: 0, blockedUntil: 0 };
            // Reset count if window passed
            // Ideally we need sliding window, but this is MVP.
            currentEntry.count += 1;
            abuseCache.set(key, currentEntry);
            if (currentEntry.count > REPEAT_THRESHOLD) {
                currentEntry.blockedUntil = now + BLOCK_DURATION_MS;
                abuseCache.set(key, currentEntry);
                // Audit Log
                ledger_js_1.provenanceLedger.appendEntry({
                    tenantId: req.user?.tenantId || 'unknown',
                    actionType: 'ABUSE_DETECTED',
                    resourceType: 'system',
                    resourceId: 'abuse-guard',
                    actorId: req.user?.id || ip,
                    actorType: 'user',
                    timestamp: new Date(),
                    payload: {
                        mutationType: 'UPDATE',
                        entityId: 'abuse-guard',
                        entityType: 'System',
                        data: { reason: 'Retry Spamming', ip }
                    },
                    metadata: { count: currentEntry.count }
                }).catch(err => console.error('Failed to log abuse', err));
                metrics_js_1.metrics.applicationErrors.labels('abuse_detection', 'retry_spam', 'high').inc();
            }
        }
        return originalSend.call(this, body);
    };
    next();
};
exports.abuseDetectionMiddleware = abuseDetectionMiddleware;
