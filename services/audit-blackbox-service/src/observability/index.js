"use strict";
// @ts-nocheck
/**
 * Observability Module
 *
 * Exports telemetry, health checks, and monitoring components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthHandlers = exports.createStandardHealthChecks = exports.HealthChecker = exports.shutdownTelemetry = exports.getTelemetry = exports.initializeTelemetry = exports.TelemetryManager = void 0;
// Telemetry
var telemetry_js_1 = require("./telemetry.js");
Object.defineProperty(exports, "TelemetryManager", { enumerable: true, get: function () { return telemetry_js_1.TelemetryManager; } });
Object.defineProperty(exports, "initializeTelemetry", { enumerable: true, get: function () { return telemetry_js_1.initializeTelemetry; } });
Object.defineProperty(exports, "getTelemetry", { enumerable: true, get: function () { return telemetry_js_1.getTelemetry; } });
Object.defineProperty(exports, "shutdownTelemetry", { enumerable: true, get: function () { return telemetry_js_1.shutdownTelemetry; } });
// Health checks
var health_js_1 = require("./health.js");
Object.defineProperty(exports, "HealthChecker", { enumerable: true, get: function () { return health_js_1.HealthChecker; } });
Object.defineProperty(exports, "createStandardHealthChecks", { enumerable: true, get: function () { return health_js_1.createStandardHealthChecks; } });
Object.defineProperty(exports, "createHealthHandlers", { enumerable: true, get: function () { return health_js_1.createHealthHandlers; } });
