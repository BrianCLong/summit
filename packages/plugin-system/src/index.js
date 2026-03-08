"use strict";
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
exports.InMemoryPluginRegistry = exports.PluginEventBus = exports.ConnectorExtension = exports.VisualizationExtension = exports.AnalyticsExtension = exports.BaseExtension = exports.CPUTimeTracker = exports.QuotaEnforcer = exports.InMemoryAuthorizationProvider = exports.DevelopmentAuthorizationProvider = exports.OPAAuthorizationProvider = exports.verifySignature = exports.PluginSecurity = exports.DefaultDependencyResolver = exports.PluginSandbox = exports.DefaultPluginLoader = exports.PluginManager = exports.PluginManifestValidationError = exports.PluginSignatureSchema = exports.PluginManifestSchema = void 0;
// Types
__exportStar(require("./types/plugin.js"), exports);
var schema_js_1 = require("./manifest/schema.js");
Object.defineProperty(exports, "PluginManifestSchema", { enumerable: true, get: function () { return schema_js_1.PluginManifestSchema; } });
Object.defineProperty(exports, "PluginSignatureSchema", { enumerable: true, get: function () { return schema_js_1.PluginSignatureSchema; } });
var PluginManifestValidationError_js_1 = require("./errors/PluginManifestValidationError.js");
Object.defineProperty(exports, "PluginManifestValidationError", { enumerable: true, get: function () { return PluginManifestValidationError_js_1.PluginManifestValidationError; } });
// Core
var PluginManager_js_1 = require("./core/PluginManager.js");
Object.defineProperty(exports, "PluginManager", { enumerable: true, get: function () { return PluginManager_js_1.PluginManager; } });
var PluginLoader_js_1 = require("./core/PluginLoader.js");
Object.defineProperty(exports, "DefaultPluginLoader", { enumerable: true, get: function () { return PluginLoader_js_1.DefaultPluginLoader; } });
var PluginSandbox_js_1 = require("./core/PluginSandbox.js");
Object.defineProperty(exports, "PluginSandbox", { enumerable: true, get: function () { return PluginSandbox_js_1.PluginSandbox; } });
var DependencyResolver_js_1 = require("./core/DependencyResolver.js");
Object.defineProperty(exports, "DefaultDependencyResolver", { enumerable: true, get: function () { return DependencyResolver_js_1.DefaultDependencyResolver; } });
// Security
var PluginSecurity_js_1 = require("./security/PluginSecurity.js");
Object.defineProperty(exports, "PluginSecurity", { enumerable: true, get: function () { return PluginSecurity_js_1.PluginSecurity; } });
var verifySignature_js_1 = require("./security/verifySignature.js");
Object.defineProperty(exports, "verifySignature", { enumerable: true, get: function () { return verifySignature_js_1.verifySignature; } });
// Authorization
var AuthorizationProvider_js_1 = require("./auth/AuthorizationProvider.js");
Object.defineProperty(exports, "OPAAuthorizationProvider", { enumerable: true, get: function () { return AuthorizationProvider_js_1.OPAAuthorizationProvider; } });
Object.defineProperty(exports, "DevelopmentAuthorizationProvider", { enumerable: true, get: function () { return AuthorizationProvider_js_1.DevelopmentAuthorizationProvider; } });
Object.defineProperty(exports, "InMemoryAuthorizationProvider", { enumerable: true, get: function () { return AuthorizationProvider_js_1.InMemoryAuthorizationProvider; } });
// Resource Management
var QuotaEnforcer_js_1 = require("./resources/QuotaEnforcer.js");
Object.defineProperty(exports, "QuotaEnforcer", { enumerable: true, get: function () { return QuotaEnforcer_js_1.QuotaEnforcer; } });
Object.defineProperty(exports, "CPUTimeTracker", { enumerable: true, get: function () { return QuotaEnforcer_js_1.CPUTimeTracker; } });
// Extensions
var BaseExtension_js_1 = require("./extensions/BaseExtension.js");
Object.defineProperty(exports, "BaseExtension", { enumerable: true, get: function () { return BaseExtension_js_1.BaseExtension; } });
var AnalyticsExtension_js_1 = require("./extensions/AnalyticsExtension.js");
Object.defineProperty(exports, "AnalyticsExtension", { enumerable: true, get: function () { return AnalyticsExtension_js_1.AnalyticsExtension; } });
var VisualizationExtension_js_1 = require("./extensions/VisualizationExtension.js");
Object.defineProperty(exports, "VisualizationExtension", { enumerable: true, get: function () { return VisualizationExtension_js_1.VisualizationExtension; } });
var ConnectorExtension_js_1 = require("./extensions/ConnectorExtension.js");
Object.defineProperty(exports, "ConnectorExtension", { enumerable: true, get: function () { return ConnectorExtension_js_1.ConnectorExtension; } });
// Events
var PluginEventBus_js_1 = require("./events/PluginEventBus.js");
Object.defineProperty(exports, "PluginEventBus", { enumerable: true, get: function () { return PluginEventBus_js_1.PluginEventBus; } });
// Registry
var InMemoryPluginRegistry_js_1 = require("./registry/InMemoryPluginRegistry.js");
Object.defineProperty(exports, "InMemoryPluginRegistry", { enumerable: true, get: function () { return InMemoryPluginRegistry_js_1.InMemoryPluginRegistry; } });
