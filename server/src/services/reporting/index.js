"use strict";
// @ts-nocheck
/**
 * Reporting Service - Public API
 * Main entry point for the refactored reporting service
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
exports.TemplateValidator = exports.ValidationError = exports.ReportRequestValidator = exports.ExporterFactory = exports.ReportMetrics = exports.ReportTemplateRegistry = exports.ReportingService = void 0;
var ReportingService_js_1 = require("./ReportingService.js");
Object.defineProperty(exports, "ReportingService", { enumerable: true, get: function () { return ReportingService_js_1.ReportingService; } });
var ReportTemplateRegistry_js_1 = require("./ReportTemplateRegistry.js");
Object.defineProperty(exports, "ReportTemplateRegistry", { enumerable: true, get: function () { return ReportTemplateRegistry_js_1.ReportTemplateRegistry; } });
var ReportMetrics_js_1 = require("./ReportMetrics.js");
Object.defineProperty(exports, "ReportMetrics", { enumerable: true, get: function () { return ReportMetrics_js_1.ReportMetrics; } });
var ExporterFactory_js_1 = require("./exporters/ExporterFactory.js");
Object.defineProperty(exports, "ExporterFactory", { enumerable: true, get: function () { return ExporterFactory_js_1.ExporterFactory; } });
// Export types
__exportStar(require("./types/index.js"), exports);
// Export validators
var ReportRequestValidator_js_1 = require("./validators/ReportRequestValidator.js");
Object.defineProperty(exports, "ReportRequestValidator", { enumerable: true, get: function () { return ReportRequestValidator_js_1.ReportRequestValidator; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return ReportRequestValidator_js_1.ValidationError; } });
var TemplateValidator_js_1 = require("./validators/TemplateValidator.js");
Object.defineProperty(exports, "TemplateValidator", { enumerable: true, get: function () { return TemplateValidator_js_1.TemplateValidator; } });
