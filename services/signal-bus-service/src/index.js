"use strict";
/**
 * Signal Bus Service
 *
 * Real-time signal ingestion, validation, enrichment, and routing service.
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
exports.createBackpressureHandler = exports.BackpressureHandler = exports.createRuleEvaluator = exports.RuleEvaluatorService = exports.createDeviceEnricher = exports.DeviceEnricherService = exports.createGeoIpEnricher = exports.GeoIpEnricherService = exports.createEnrichmentPipeline = exports.EnrichmentPipeline = exports.createSignalRouter = exports.SignalRouterService = exports.createSignalNormalizer = exports.SignalNormalizerService = exports.createSignalValidator = exports.SignalValidatorService = exports.getConfig = exports.loadConfig = exports.createSignalBusService = exports.SignalBusService = void 0;
// Main service
var server_js_1 = require("./server.js");
Object.defineProperty(exports, "SignalBusService", { enumerable: true, get: function () { return server_js_1.SignalBusService; } });
Object.defineProperty(exports, "createSignalBusService", { enumerable: true, get: function () { return server_js_1.createSignalBusService; } });
// Configuration
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_js_1.loadConfig; } });
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return config_js_1.getConfig; } });
// Types
__exportStar(require("./types.js"), exports);
// Pipeline components
var index_js_1 = require("./pipeline/index.js");
Object.defineProperty(exports, "SignalValidatorService", { enumerable: true, get: function () { return index_js_1.SignalValidatorService; } });
Object.defineProperty(exports, "createSignalValidator", { enumerable: true, get: function () { return index_js_1.createSignalValidator; } });
Object.defineProperty(exports, "SignalNormalizerService", { enumerable: true, get: function () { return index_js_1.SignalNormalizerService; } });
Object.defineProperty(exports, "createSignalNormalizer", { enumerable: true, get: function () { return index_js_1.createSignalNormalizer; } });
Object.defineProperty(exports, "SignalRouterService", { enumerable: true, get: function () { return index_js_1.SignalRouterService; } });
Object.defineProperty(exports, "createSignalRouter", { enumerable: true, get: function () { return index_js_1.createSignalRouter; } });
// Enrichment components
var index_js_2 = require("./enrichment/index.js");
Object.defineProperty(exports, "EnrichmentPipeline", { enumerable: true, get: function () { return index_js_2.EnrichmentPipeline; } });
Object.defineProperty(exports, "createEnrichmentPipeline", { enumerable: true, get: function () { return index_js_2.createEnrichmentPipeline; } });
Object.defineProperty(exports, "GeoIpEnricherService", { enumerable: true, get: function () { return index_js_2.GeoIpEnricherService; } });
Object.defineProperty(exports, "createGeoIpEnricher", { enumerable: true, get: function () { return index_js_2.createGeoIpEnricher; } });
Object.defineProperty(exports, "DeviceEnricherService", { enumerable: true, get: function () { return index_js_2.DeviceEnricherService; } });
Object.defineProperty(exports, "createDeviceEnricher", { enumerable: true, get: function () { return index_js_2.createDeviceEnricher; } });
// Rule engine
var index_js_3 = require("./rules/index.js");
Object.defineProperty(exports, "RuleEvaluatorService", { enumerable: true, get: function () { return index_js_3.RuleEvaluatorService; } });
Object.defineProperty(exports, "createRuleEvaluator", { enumerable: true, get: function () { return index_js_3.createRuleEvaluator; } });
// Backpressure handling
var index_js_4 = require("./backpressure/index.js");
Object.defineProperty(exports, "BackpressureHandler", { enumerable: true, get: function () { return index_js_4.BackpressureHandler; } });
Object.defineProperty(exports, "createBackpressureHandler", { enumerable: true, get: function () { return index_js_4.createBackpressureHandler; } });
