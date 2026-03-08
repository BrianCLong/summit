"use strict";
/**
 * Internationalization Module
 *
 * Multi-language support and regional compliance.
 *
 * @module i18n
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
exports.i18nService = exports.I18nService = void 0;
__exportStar(require("./types.js"), exports);
var I18nService_js_1 = require("./I18nService.js");
Object.defineProperty(exports, "I18nService", { enumerable: true, get: function () { return I18nService_js_1.I18nService; } });
Object.defineProperty(exports, "i18nService", { enumerable: true, get: function () { return I18nService_js_1.i18nService; } });
