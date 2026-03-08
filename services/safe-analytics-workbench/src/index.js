"use strict";
/**
 * Safe Analytics Workbench
 *
 * Governed environments for exploration and analysis within CompanyOS.
 * Provides analysts and data scientists with safe, reproducible, and
 * policy-compliant data access.
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
exports.VERSION = exports.LogLevel = exports.logger = exports.generateResourceQuota = exports.generateNetworkPolicy = exports.SandboxManager = exports.WorkspaceService = void 0;
// Models
__exportStar(require("./models/types"), exports);
__exportStar(require("./models/governance"), exports);
// Services
var WorkspaceService_1 = require("./services/WorkspaceService");
Object.defineProperty(exports, "WorkspaceService", { enumerable: true, get: function () { return WorkspaceService_1.WorkspaceService; } });
// Sandbox
var SandboxManager_1 = require("./sandbox/SandboxManager");
Object.defineProperty(exports, "SandboxManager", { enumerable: true, get: function () { return SandboxManager_1.SandboxManager; } });
Object.defineProperty(exports, "generateNetworkPolicy", { enumerable: true, get: function () { return SandboxManager_1.generateNetworkPolicy; } });
Object.defineProperty(exports, "generateResourceQuota", { enumerable: true, get: function () { return SandboxManager_1.generateResourceQuota; } });
// Utilities
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
// Version
exports.VERSION = '0.1.0';
