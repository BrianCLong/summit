"use strict";
/**
 * API Versioning Module
 * Comprehensive API versioning system for IntelGraph
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.changelogAutomation = exports.documentationGenerator = exports.versionDirectives = exports.schemaVersionManager = exports.compatibilityLayer = exports.getVersionContext = exports.blockDeprecatedVersions = exports.requireVersion = exports.versionMiddleware = exports.versionRegistry = void 0;
var version_registry_js_1 = require("./version-registry.js");
Object.defineProperty(exports, "versionRegistry", { enumerable: true, get: function () { return version_registry_js_1.versionRegistry; } });
var version_middleware_js_1 = require("./version-middleware.js");
Object.defineProperty(exports, "versionMiddleware", { enumerable: true, get: function () { return version_middleware_js_1.versionMiddleware; } });
Object.defineProperty(exports, "requireVersion", { enumerable: true, get: function () { return version_middleware_js_1.requireVersion; } });
Object.defineProperty(exports, "blockDeprecatedVersions", { enumerable: true, get: function () { return version_middleware_js_1.blockDeprecatedVersions; } });
Object.defineProperty(exports, "getVersionContext", { enumerable: true, get: function () { return version_middleware_js_1.getVersionContext; } });
var compatibility_layer_js_1 = require("./compatibility-layer.js");
Object.defineProperty(exports, "compatibilityLayer", { enumerable: true, get: function () { return compatibility_layer_js_1.compatibilityLayer; } });
var schema_versioning_js_1 = require("./schema-versioning.js");
Object.defineProperty(exports, "schemaVersionManager", { enumerable: true, get: function () { return schema_versioning_js_1.schemaVersionManager; } });
Object.defineProperty(exports, "versionDirectives", { enumerable: true, get: function () { return schema_versioning_js_1.versionDirectives; } });
var documentation_generator_js_1 = require("./documentation-generator.js");
Object.defineProperty(exports, "documentationGenerator", { enumerable: true, get: function () { return documentation_generator_js_1.documentationGenerator; } });
var changelog_automation_js_1 = require("./changelog-automation.js");
Object.defineProperty(exports, "changelogAutomation", { enumerable: true, get: function () { return changelog_automation_js_1.changelogAutomation; } });
