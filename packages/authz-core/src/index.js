"use strict";
/**
 * @package authz-core
 *
 * Comprehensive multi-tenant authorization library for IntelGraph
 *
 * Provides:
 * - Central authorization service with isAllowed() API
 * - Warrant lifecycle management
 * - License registry and enforcement
 * - RBAC + ABAC policy evaluation
 * - TOS acceptance tracking
 * - Comprehensive audit logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseError = exports.WarrantError = exports.AuthorizationError = exports.LicenseService = exports.WarrantService = exports.AuthorizationService = void 0;
// Core services
var AuthorizationService_js_1 = require("./AuthorizationService.js");
Object.defineProperty(exports, "AuthorizationService", { enumerable: true, get: function () { return AuthorizationService_js_1.AuthorizationService; } });
var WarrantService_js_1 = require("./WarrantService.js");
Object.defineProperty(exports, "WarrantService", { enumerable: true, get: function () { return WarrantService_js_1.WarrantService; } });
var LicenseService_js_1 = require("./LicenseService.js");
Object.defineProperty(exports, "LicenseService", { enumerable: true, get: function () { return LicenseService_js_1.LicenseService; } });
// Errors
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function () { return types_js_1.AuthorizationError; } });
Object.defineProperty(exports, "WarrantError", { enumerable: true, get: function () { return types_js_1.WarrantError; } });
Object.defineProperty(exports, "LicenseError", { enumerable: true, get: function () { return types_js_1.LicenseError; } });
