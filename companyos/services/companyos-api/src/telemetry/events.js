"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = trackEvent;
function trackEvent(_req, event, properties) {
    // placeholder telemetry hook
    if (process.env.DEBUG_TELEMETRY === "true") {
        // eslint-disable-next-line no-console
        console.log("telemetry", event, properties);
    }
}
