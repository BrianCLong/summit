"use strict";
/**
 * SIGINT Telemetry System
 *
 * Defensive SIGINT/CYBINT telemetry simulation stack for blue team analytics.
 *
 * IMPORTANT: This is a SIMULATION-ONLY system.
 * - All data is synthetic and fabricated
 * - No real-world targeting or sensitive data collection
 * - For defensive testing and security research only
 *
 * @packageDocumentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityControls = exports.createSampleInfrastructure = exports.runSimulation = exports.allRules = exports.createAnomalyDetector = exports.createDetectionEngine = exports.VERSION = void 0;
// Schemas
__exportStar(require("./schemas/index.js"), exports);
// Generators
__exportStar(require("./generators/index.js"), exports);
// Detection Engine
__exportStar(require("./detections/index.js"), exports);
// Simulation
__exportStar(require("./simulation/index.js"), exports);
// Version
exports.VERSION = '1.0.0';
// Quick start helpers
var engine_js_1 = require("./detections/engine.js");
Object.defineProperty(exports, "createDetectionEngine", { enumerable: true, get: function () { return engine_js_1.createDetectionEngine; } });
var anomaly_js_1 = require("./detections/anomaly.js");
Object.defineProperty(exports, "createAnomalyDetector", { enumerable: true, get: function () { return anomaly_js_1.createAnomalyDetector; } });
var index_js_1 = require("./detections/rules/index.js");
Object.defineProperty(exports, "allRules", { enumerable: true, get: function () { return index_js_1.allRules; } });
var runner_js_1 = require("./simulation/runner.js");
Object.defineProperty(exports, "runSimulation", { enumerable: true, get: function () { return runner_js_1.runSimulation; } });
var graph_js_1 = require("./simulation/graph.js");
Object.defineProperty(exports, "createSampleInfrastructure", { enumerable: true, get: function () { return graph_js_1.createSampleInfrastructure; } });
var controls_js_1 = require("./simulation/controls.js");
Object.defineProperty(exports, "securityControls", { enumerable: true, get: function () { return controls_js_1.securityControls; } });
