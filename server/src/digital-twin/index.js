"use strict";
/**
 * Digital Twin Infrastructure
 * Global digital twins for national infrastructure and public assets
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
exports.SmartCityConnector = exports.SimulationEngine = exports.PredictiveMaintenanceService = exports.digitalTwinService = exports.DigitalTwinService = void 0;
// Types
__exportStar(require("../types/digitalTwin.js"), exports);
// Services
var DigitalTwinService_js_1 = require("../services/DigitalTwinService.js");
Object.defineProperty(exports, "DigitalTwinService", { enumerable: true, get: function () { return DigitalTwinService_js_1.DigitalTwinService; } });
Object.defineProperty(exports, "digitalTwinService", { enumerable: true, get: function () { return DigitalTwinService_js_1.digitalTwinService; } });
var PredictiveMaintenanceService_js_1 = require("../services/PredictiveMaintenanceService.js");
Object.defineProperty(exports, "PredictiveMaintenanceService", { enumerable: true, get: function () { return PredictiveMaintenanceService_js_1.PredictiveMaintenanceService; } });
// Simulation
var SimulationEngine_js_1 = require("../simulation/SimulationEngine.js");
Object.defineProperty(exports, "SimulationEngine", { enumerable: true, get: function () { return SimulationEngine_js_1.SimulationEngine; } });
// Integrations
var SmartCityConnector_js_1 = require("../integrations/SmartCityConnector.js");
Object.defineProperty(exports, "SmartCityConnector", { enumerable: true, get: function () { return SmartCityConnector_js_1.SmartCityConnector; } });
