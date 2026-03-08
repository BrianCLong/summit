"use strict";
/**
 * Privacy-Preserving Analytics Service
 *
 * Public API exports for the privacy-analytics-service package.
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
exports.loadConfig = exports.config = exports.createRequestLogger = exports.createChildLogger = exports.logger = exports.startServer = exports.app = exports.DatabaseConnections = exports.db = exports.PredefinedMetricsRegistry = exports.predefinedMetrics = exports.GovernanceClient = exports.QueryExecutor = exports.QueryTranslator = exports.DifferentialPrivacy = exports.PolicyEnforcer = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Privacy modules
var PolicyEnforcer_js_1 = require("./privacy/PolicyEnforcer.js");
Object.defineProperty(exports, "PolicyEnforcer", { enumerable: true, get: function () { return PolicyEnforcer_js_1.PolicyEnforcer; } });
var DifferentialPrivacy_js_1 = require("./privacy/DifferentialPrivacy.js");
Object.defineProperty(exports, "DifferentialPrivacy", { enumerable: true, get: function () { return DifferentialPrivacy_js_1.DifferentialPrivacy; } });
// Query modules
var QueryTranslator_js_1 = require("./query/QueryTranslator.js");
Object.defineProperty(exports, "QueryTranslator", { enumerable: true, get: function () { return QueryTranslator_js_1.QueryTranslator; } });
var QueryExecutor_js_1 = require("./query/QueryExecutor.js");
Object.defineProperty(exports, "QueryExecutor", { enumerable: true, get: function () { return QueryExecutor_js_1.QueryExecutor; } });
// Governance
var GovernanceClient_js_1 = require("./governance/GovernanceClient.js");
Object.defineProperty(exports, "GovernanceClient", { enumerable: true, get: function () { return GovernanceClient_js_1.GovernanceClient; } });
// Metrics
var PredefinedMetrics_js_1 = require("./metrics/PredefinedMetrics.js");
Object.defineProperty(exports, "predefinedMetrics", { enumerable: true, get: function () { return PredefinedMetrics_js_1.predefinedMetrics; } });
Object.defineProperty(exports, "PredefinedMetricsRegistry", { enumerable: true, get: function () { return PredefinedMetrics_js_1.PredefinedMetricsRegistry; } });
// Database
var connections_js_1 = require("./db/connections.js");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return connections_js_1.db; } });
Object.defineProperty(exports, "DatabaseConnections", { enumerable: true, get: function () { return connections_js_1.DatabaseConnections; } });
// Server
var server_js_1 = require("./server.js");
Object.defineProperty(exports, "app", { enumerable: true, get: function () { return server_js_1.app; } });
Object.defineProperty(exports, "startServer", { enumerable: true, get: function () { return server_js_1.startServer; } });
// Utils
var logger_js_1 = require("./utils/logger.js");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_js_1.logger; } });
Object.defineProperty(exports, "createChildLogger", { enumerable: true, get: function () { return logger_js_1.createChildLogger; } });
Object.defineProperty(exports, "createRequestLogger", { enumerable: true, get: function () { return logger_js_1.createRequestLogger; } });
var config_js_1 = require("./utils/config.js");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return config_js_1.config; } });
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_js_1.loadConfig; } });
