"use strict";
/**
 * @intelgraph/i18n-service
 *
 * Backend i18n service for language detection and policy-aware translation
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
exports.startService = exports.createApp = void 0;
// Main service exports
__exportStar(require("./lib/language-detector.js"), exports);
__exportStar(require("./lib/translation-service.js"), exports);
__exportStar(require("./lib/translation-provider.js"), exports);
__exportStar(require("./lib/metrics.js"), exports);
// Configuration exports
__exportStar(require("./config/supported-languages.js"), exports);
__exportStar(require("./config/translation-policies.js"), exports);
// Integration adapters
__exportStar(require("./integrations/copilot/i18n-adapter.js"), exports);
__exportStar(require("./integrations/ingestion/i18n-adapter.js"), exports);
// Types
__exportStar(require("./types/index.js"), exports);
// Service startup
var index_js_1 = require("./index.js");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return index_js_1.createApp; } });
Object.defineProperty(exports, "startService", { enumerable: true, get: function () { return index_js_1.startService; } });
