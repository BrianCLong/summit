"use strict";
/**
 * Report Assembly Service
 * Provides templating and export functionality for briefing packages
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
exports.SlideRenderer = exports.PDFRenderer = exports.HTMLRenderer = exports.TemplateEngine = void 0;
var TemplateEngine_js_1 = require("./templates/TemplateEngine.js");
Object.defineProperty(exports, "TemplateEngine", { enumerable: true, get: function () { return TemplateEngine_js_1.TemplateEngine; } });
var HTMLRenderer_js_1 = require("./renderers/HTMLRenderer.js");
Object.defineProperty(exports, "HTMLRenderer", { enumerable: true, get: function () { return HTMLRenderer_js_1.HTMLRenderer; } });
var PDFRenderer_js_1 = require("./renderers/PDFRenderer.js");
Object.defineProperty(exports, "PDFRenderer", { enumerable: true, get: function () { return PDFRenderer_js_1.PDFRenderer; } });
var SlideRenderer_js_1 = require("./renderers/SlideRenderer.js");
Object.defineProperty(exports, "SlideRenderer", { enumerable: true, get: function () { return SlideRenderer_js_1.SlideRenderer; } });
__exportStar(require("./templates/index.js"), exports);
__exportStar(require("./types.js"), exports);
