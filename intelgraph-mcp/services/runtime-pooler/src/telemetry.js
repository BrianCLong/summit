"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = initTelemetry;
exports.emitFrame = emitFrame;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const api_1 = require("@opentelemetry/api");
let sdk = null;
async function initTelemetry(serviceName) {
    if (sdk)
        return;
    sdk = new sdk_node_1.NodeSDK({
        serviceName,
        instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
    });
    await sdk.start();
}
function emitFrame(direction, channel, attributes = {}) {
    const span = api_1.trace.getSpan(api_1.context.active());
    span?.addEvent('mcp.frame', {
        'mcp.frame.direction': direction,
        'mcp.frame.channel': channel,
        ...attributes,
    });
}
