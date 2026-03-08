"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryGuard = void 0;
class TelemetryGuard {
    analyticsEnabled;
    constructor() {
        const blocked = process.env.A11Y_LAB_ALLOW_ANALYTICS !== 'true';
        this.analyticsEnabled = !blocked;
    }
    enforceNoAnalytics() {
        if (!this.analyticsEnabled) {
            return;
        }
        this.analyticsEnabled = false;
    }
    blockContentAnalytics(data) {
        if (this.analyticsEnabled) {
            this.analyticsEnabled = false;
        }
        if (data && 'violations' in data) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete data.violations;
        }
    }
    sanitizePayload(payload) {
        const sanitized = {};
        Object.entries(payload).forEach(([key, value]) => {
            if (typeof value === 'string') {
                sanitized[key] = this.redact(value);
            }
            else {
                sanitized[key] = value;
            }
        });
        return sanitized;
    }
    redact(value) {
        return value.replace(/[A-Za-z0-9]{3,}@/g, '[redacted-email]');
    }
}
exports.TelemetryGuard = TelemetryGuard;
