"use strict";
/**
 * XAI Overlay Service
 *
 * Provides comprehensive explainability for model outputs including:
 * - Input summaries and model metadata tracking
 * - Saliency maps and feature importance explanations
 * - Cryptographic signing of reasoning traces
 * - Tamper detection with dual-control override
 * - External verification for reproducibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalVerifier = exports.ExternalVerifier = exports.xaiOverlay = exports.XAIOverlayService = void 0;
var XAIOverlayService_js_1 = require("./XAIOverlayService.js");
Object.defineProperty(exports, "XAIOverlayService", { enumerable: true, get: function () { return XAIOverlayService_js_1.XAIOverlayService; } });
Object.defineProperty(exports, "xaiOverlay", { enumerable: true, get: function () { return XAIOverlayService_js_1.xaiOverlay; } });
var ExternalVerifier_js_1 = require("./ExternalVerifier.js");
Object.defineProperty(exports, "ExternalVerifier", { enumerable: true, get: function () { return ExternalVerifier_js_1.ExternalVerifier; } });
Object.defineProperty(exports, "externalVerifier", { enumerable: true, get: function () { return ExternalVerifier_js_1.externalVerifier; } });
