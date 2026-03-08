"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphClient = createGraphClient;
exports.registerPanel = registerPanel;
exports.emitTelemetry = emitTelemetry;
function createGraphClient(apiUrl) {
    return {
        async query(query, variables) {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
            });
            return res.json();
        },
    };
}
function registerPanel(panel) {
    // In the real runtime this would register the panel with the host application.
    // eslint-disable-next-line no-console -- SDK debug logging is intentional
    console.debug(`registering panel ${panel.id}`);
}
function emitTelemetry(event, data) {
    // eslint-disable-next-line no-console -- SDK telemetry logging is intentional
    console.debug(`telemetry:${event}`, data);
}
