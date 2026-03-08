"use strict";
/**
 * Sandbox Tenant Profile Service
 *
 * Provides secure sandbox tenant management for research and data lab environments.
 * Ensures strict isolation from production with comprehensive policy enforcement.
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
exports.logger = exports.createLogger = exports.ValidationSeverity = exports.getSandboxValidator = exports.SandboxValidator = exports.OperationType = exports.getSandboxEnforcer = exports.SandboxEnforcer = exports.SANDBOX_PRESETS = exports.getSandboxConfigManager = exports.SandboxConfigManager = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Config
var SandboxConfigManager_js_1 = require("./config/SandboxConfigManager.js");
Object.defineProperty(exports, "SandboxConfigManager", { enumerable: true, get: function () { return SandboxConfigManager_js_1.SandboxConfigManager; } });
Object.defineProperty(exports, "getSandboxConfigManager", { enumerable: true, get: function () { return SandboxConfigManager_js_1.getSandboxConfigManager; } });
Object.defineProperty(exports, "SANDBOX_PRESETS", { enumerable: true, get: function () { return SandboxConfigManager_js_1.SANDBOX_PRESETS; } });
// Enforcement
var SandboxEnforcer_js_1 = require("./enforcement/SandboxEnforcer.js");
Object.defineProperty(exports, "SandboxEnforcer", { enumerable: true, get: function () { return SandboxEnforcer_js_1.SandboxEnforcer; } });
Object.defineProperty(exports, "getSandboxEnforcer", { enumerable: true, get: function () { return SandboxEnforcer_js_1.getSandboxEnforcer; } });
Object.defineProperty(exports, "OperationType", { enumerable: true, get: function () { return SandboxEnforcer_js_1.OperationType; } });
// Validation
var SandboxValidator_js_1 = require("./validation/SandboxValidator.js");
Object.defineProperty(exports, "SandboxValidator", { enumerable: true, get: function () { return SandboxValidator_js_1.SandboxValidator; } });
Object.defineProperty(exports, "getSandboxValidator", { enumerable: true, get: function () { return SandboxValidator_js_1.getSandboxValidator; } });
Object.defineProperty(exports, "ValidationSeverity", { enumerable: true, get: function () { return SandboxValidator_js_1.ValidationSeverity; } });
// Utilities
var logger_js_1 = require("./utils/logger.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_js_1.createLogger; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_js_1.logger; } });
