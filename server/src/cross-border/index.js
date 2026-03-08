"use strict";
/**
 * Cross-Border AI/Virtual Assistant Interoperability Module
 *
 * Implements Bürokratt-style cross-border government virtual assistant
 * network integration for seamless collaboration between partner nations.
 *
 * Features:
 * - Partner nation registry with trust levels
 * - Adaptive handover protocols with context preservation
 * - Multilingual translation bridge
 * - Secure cross-border data sharing
 * - Comprehensive audit logging
 * - Circuit breakers and rate limiting for resilience
 * - Environment-based configuration
 *
 * @module cross-border
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
exports.getCrossBorderHealth = exports.shutdownCrossBorder = exports.getCrossBorderGraphQL = exports.registerCrossBorderRoutes = exports.initializeCrossBorder = exports.updateActivePartners = exports.updateActiveSessions = exports.recordPartnerHealth = exports.recordTranslation = exports.recordHandover = exports.getCrossBorderMetrics = exports.CrossBorderMetrics = exports.crossBorderRouter = exports.crossBorderResolvers = exports.crossBorderTypeDefs = exports.retryWithBackoff = exports.getResilienceManager = exports.ResilienceManager = exports.RateLimiter = exports.CircuitBreakerOpenError = exports.CircuitBreaker = exports.TIER_OBJECTIVES = exports.SERVICE_PLACEMENT = exports.TARGET_REGIONS = exports.getMultiRegionGovernance = exports.MultiRegionGovernance = exports.getCrossBorderGateway = exports.CrossBorderGateway = exports.getMultilingualBridge = exports.MultilingualBridge = exports.getHandoverProtocol = exports.HandoverProtocol = exports.getPartnerRegistry = exports.PartnerRegistry = exports.validateConfig = exports.getCrossBorderConfig = exports.loadCrossBorderConfig = void 0;
// Types
__exportStar(require("./types.js"), exports);
// Configuration
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "loadCrossBorderConfig", { enumerable: true, get: function () { return config_js_1.loadCrossBorderConfig; } });
Object.defineProperty(exports, "getCrossBorderConfig", { enumerable: true, get: function () { return config_js_1.getCrossBorderConfig; } });
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return config_js_1.validateConfig; } });
// Services
var partner_registry_js_1 = require("./partner-registry.js");
Object.defineProperty(exports, "PartnerRegistry", { enumerable: true, get: function () { return partner_registry_js_1.PartnerRegistry; } });
Object.defineProperty(exports, "getPartnerRegistry", { enumerable: true, get: function () { return partner_registry_js_1.getPartnerRegistry; } });
var handover_protocol_js_1 = require("./handover-protocol.js");
Object.defineProperty(exports, "HandoverProtocol", { enumerable: true, get: function () { return handover_protocol_js_1.HandoverProtocol; } });
Object.defineProperty(exports, "getHandoverProtocol", { enumerable: true, get: function () { return handover_protocol_js_1.getHandoverProtocol; } });
var multilingual_bridge_js_1 = require("./multilingual-bridge.js");
Object.defineProperty(exports, "MultilingualBridge", { enumerable: true, get: function () { return multilingual_bridge_js_1.MultilingualBridge; } });
Object.defineProperty(exports, "getMultilingualBridge", { enumerable: true, get: function () { return multilingual_bridge_js_1.getMultilingualBridge; } });
var gateway_js_1 = require("./gateway.js");
Object.defineProperty(exports, "CrossBorderGateway", { enumerable: true, get: function () { return gateway_js_1.CrossBorderGateway; } });
Object.defineProperty(exports, "getCrossBorderGateway", { enumerable: true, get: function () { return gateway_js_1.getCrossBorderGateway; } });
// Multi-region governance
var multi_region_governance_js_1 = require("./multi-region-governance.js");
Object.defineProperty(exports, "MultiRegionGovernance", { enumerable: true, get: function () { return multi_region_governance_js_1.MultiRegionGovernance; } });
Object.defineProperty(exports, "getMultiRegionGovernance", { enumerable: true, get: function () { return multi_region_governance_js_1.getMultiRegionGovernance; } });
Object.defineProperty(exports, "TARGET_REGIONS", { enumerable: true, get: function () { return multi_region_governance_js_1.TARGET_REGIONS; } });
Object.defineProperty(exports, "SERVICE_PLACEMENT", { enumerable: true, get: function () { return multi_region_governance_js_1.SERVICE_PLACEMENT; } });
Object.defineProperty(exports, "TIER_OBJECTIVES", { enumerable: true, get: function () { return multi_region_governance_js_1.TIER_OBJECTIVES; } });
// Resilience
var resilience_js_1 = require("./resilience.js");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return resilience_js_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitBreakerOpenError", { enumerable: true, get: function () { return resilience_js_1.CircuitBreakerOpenError; } });
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return resilience_js_1.RateLimiter; } });
Object.defineProperty(exports, "ResilienceManager", { enumerable: true, get: function () { return resilience_js_1.ResilienceManager; } });
Object.defineProperty(exports, "getResilienceManager", { enumerable: true, get: function () { return resilience_js_1.getResilienceManager; } });
Object.defineProperty(exports, "retryWithBackoff", { enumerable: true, get: function () { return resilience_js_1.retryWithBackoff; } });
// GraphQL
var index_js_1 = require("./graphql/index.js");
Object.defineProperty(exports, "crossBorderTypeDefs", { enumerable: true, get: function () { return index_js_1.crossBorderTypeDefs; } });
Object.defineProperty(exports, "crossBorderResolvers", { enumerable: true, get: function () { return index_js_1.crossBorderResolvers; } });
// HTTP Router
var router_js_1 = require("./router.js");
Object.defineProperty(exports, "crossBorderRouter", { enumerable: true, get: function () { return router_js_1.crossBorderRouter; } });
// Metrics
var metrics_js_1 = require("./metrics.js");
Object.defineProperty(exports, "CrossBorderMetrics", { enumerable: true, get: function () { return metrics_js_1.CrossBorderMetrics; } });
Object.defineProperty(exports, "getCrossBorderMetrics", { enumerable: true, get: function () { return metrics_js_1.getCrossBorderMetrics; } });
Object.defineProperty(exports, "recordHandover", { enumerable: true, get: function () { return metrics_js_1.recordHandover; } });
Object.defineProperty(exports, "recordTranslation", { enumerable: true, get: function () { return metrics_js_1.recordTranslation; } });
Object.defineProperty(exports, "recordPartnerHealth", { enumerable: true, get: function () { return metrics_js_1.recordPartnerHealth; } });
Object.defineProperty(exports, "updateActiveSessions", { enumerable: true, get: function () { return metrics_js_1.updateActiveSessions; } });
Object.defineProperty(exports, "updateActivePartners", { enumerable: true, get: function () { return metrics_js_1.updateActivePartners; } });
// Integration helpers
var integration_js_1 = require("./integration.js");
Object.defineProperty(exports, "initializeCrossBorder", { enumerable: true, get: function () { return integration_js_1.initializeCrossBorder; } });
Object.defineProperty(exports, "registerCrossBorderRoutes", { enumerable: true, get: function () { return integration_js_1.registerCrossBorderRoutes; } });
Object.defineProperty(exports, "getCrossBorderGraphQL", { enumerable: true, get: function () { return integration_js_1.getCrossBorderGraphQL; } });
Object.defineProperty(exports, "shutdownCrossBorder", { enumerable: true, get: function () { return integration_js_1.shutdownCrossBorder; } });
Object.defineProperty(exports, "getCrossBorderHealth", { enumerable: true, get: function () { return integration_js_1.getCrossBorderHealth; } });
