"use strict";
/**
 * @package dlp-core
 *
 * Core Data Loss Prevention library for IntelGraph
 *
 * Provides:
 * - Content inspection and pattern detection
 * - Information barrier enforcement
 * - Redaction engine
 * - Policy evaluation integration with OPA
 * - Audit logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACTION_STRATEGIES = exports.SCAN_ACTIONS = exports.BARRIER_TYPES = exports.DATA_CLASSIFICATIONS = exports.DLPStorageHook = exports.DLPApolloPlugin = exports.createDLPMiddleware = exports.PolicyEvaluationError = exports.RedactionError = exports.BarrierViolationError = exports.DetectionError = exports.DLPError = exports.BarrierEnforcer = exports.RedactionEngine = exports.DetectionEngine = exports.DLPService = void 0;
// Core services
var DLPService_1 = require("./DLPService");
Object.defineProperty(exports, "DLPService", { enumerable: true, get: function () { return DLPService_1.DLPService; } });
var DetectionEngine_1 = require("./DetectionEngine");
Object.defineProperty(exports, "DetectionEngine", { enumerable: true, get: function () { return DetectionEngine_1.DetectionEngine; } });
var RedactionEngine_1 = require("./RedactionEngine");
Object.defineProperty(exports, "RedactionEngine", { enumerable: true, get: function () { return RedactionEngine_1.RedactionEngine; } });
var BarrierEnforcer_1 = require("./BarrierEnforcer");
Object.defineProperty(exports, "BarrierEnforcer", { enumerable: true, get: function () { return BarrierEnforcer_1.BarrierEnforcer; } });
// Errors
var errors_1 = require("./errors");
Object.defineProperty(exports, "DLPError", { enumerable: true, get: function () { return errors_1.DLPError; } });
Object.defineProperty(exports, "DetectionError", { enumerable: true, get: function () { return errors_1.DetectionError; } });
Object.defineProperty(exports, "BarrierViolationError", { enumerable: true, get: function () { return errors_1.BarrierViolationError; } });
Object.defineProperty(exports, "RedactionError", { enumerable: true, get: function () { return errors_1.RedactionError; } });
Object.defineProperty(exports, "PolicyEvaluationError", { enumerable: true, get: function () { return errors_1.PolicyEvaluationError; } });
// Utilities
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "createDLPMiddleware", { enumerable: true, get: function () { return middleware_1.createDLPMiddleware; } });
var apollo_plugin_1 = require("./apollo-plugin");
Object.defineProperty(exports, "DLPApolloPlugin", { enumerable: true, get: function () { return apollo_plugin_1.DLPApolloPlugin; } });
var storage_hook_1 = require("./storage-hook");
Object.defineProperty(exports, "DLPStorageHook", { enumerable: true, get: function () { return storage_hook_1.DLPStorageHook; } });
// Constants
var constants_1 = require("./constants");
Object.defineProperty(exports, "DATA_CLASSIFICATIONS", { enumerable: true, get: function () { return constants_1.DATA_CLASSIFICATIONS; } });
Object.defineProperty(exports, "BARRIER_TYPES", { enumerable: true, get: function () { return constants_1.BARRIER_TYPES; } });
Object.defineProperty(exports, "SCAN_ACTIONS", { enumerable: true, get: function () { return constants_1.SCAN_ACTIONS; } });
Object.defineProperty(exports, "REDACTION_STRATEGIES", { enumerable: true, get: function () { return constants_1.REDACTION_STRATEGIES; } });
