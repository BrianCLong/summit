"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryService = exports.TelemetryService = void 0;
const logger_js_1 = require("../config/logger.js");
class TelemetryService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!TelemetryService.instance) {
            TelemetryService.instance = new TelemetryService();
        }
        return TelemetryService.instance;
    }
    logEvent(eventType, event) {
        logger_js_1.logger.info({
            eventType,
            ...event,
        }, `Telemetry Event: ${eventType}`);
    }
}
exports.TelemetryService = TelemetryService;
exports.telemetryService = TelemetryService.getInstance();
