"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overloadProtection = void 0;
const system_monitor_js_1 = require("../lib/system-monitor.js");
const logger_js_1 = require("../config/logger.js");
const comprehensive_telemetry_js_1 = require("../lib/telemetry/comprehensive-telemetry.js");
const overloadProtection = (req, res, next) => {
    const health = system_monitor_js_1.systemMonitor.getHealth();
    if (health.isOverloaded) {
        logger_js_1.logger.warn({
            msg: 'Load Shedding Active',
            reason: health.reason,
            metrics: health.metrics
        });
        comprehensive_telemetry_js_1.telemetry.subsystems.api.errors.add(1); // Track dropped requests
        res.set('Retry-After', '5'); // Tell client to retry in 5 seconds
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'System is currently under heavy load. Please retry later.',
            reason: health.reason // Optional: expose reason to client (maybe hide in prod)
        });
        return;
    }
    next();
};
exports.overloadProtection = overloadProtection;
