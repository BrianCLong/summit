"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalTelemetry = exports.DesignSystemTelemetry = exports.BeaconTransport = void 0;
const tokens_1 = require("./tokens");
class BeaconTransport {
    endpoint;
    constructor(endpoint = '/api/ux-telemetry') {
        this.endpoint = endpoint;
    }
    async send(events) {
        const payload = JSON.stringify({ events });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(this.endpoint, payload);
            return;
        }
        await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
        });
    }
}
exports.BeaconTransport = BeaconTransport;
class DesignSystemTelemetry {
    transport;
    buffer = [];
    flushInterval;
    constructor(transport = new BeaconTransport(), options = {}) {
        this.transport = transport;
        const interval = options.autoFlushMs ?? 5000;
        if (interval !== null) {
            this.flushInterval = setInterval(() => this.flush(), interval);
        }
    }
    record(component, version, context) {
        this.buffer.push({ component, version, context, timestamp: Date.now() });
    }
    recordDrift(component, version, field, value, allowed) {
        this.buffer.push({
            component,
            version,
            timestamp: Date.now(),
            drift: [{ field, value, allowed }],
        });
    }
    validateStyle(component, version, styles) {
        Object.entries(styles).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('#') && !tokens_1.allowedColors.has(value)) {
                this.recordDrift(component, version, key, value, Array.from(tokens_1.allowedColors));
            }
            if (typeof value === 'number' && key.toLowerCase().includes('padding') && !tokens_1.allowedSpacing.has(value)) {
                this.recordDrift(component, version, key, value, Array.from(tokens_1.allowedSpacing));
            }
        });
    }
    async flush() {
        if (!this.buffer.length)
            return;
        const snapshot = [...this.buffer];
        this.buffer = [];
        await this.transport.send(snapshot);
    }
    dispose() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
    }
}
exports.DesignSystemTelemetry = DesignSystemTelemetry;
exports.globalTelemetry = new DesignSystemTelemetry();
