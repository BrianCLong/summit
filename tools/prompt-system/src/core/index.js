"use strict";
/**
 * Core module exports
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
exports.TemplateComposer = exports.TemplateRegistry = exports.TemplateEngine = exports.TemplateValidator = void 0;
__exportStar(require("./types.js"), exports);
var validator_js_1 = require("./validator.js");
Object.defineProperty(exports, "TemplateValidator", { enumerable: true, get: function () { return validator_js_1.TemplateValidator; } });
var engine_js_1 = require("./engine.js");
Object.defineProperty(exports, "TemplateEngine", { enumerable: true, get: function () { return engine_js_1.TemplateEngine; } });
var registry_js_1 = require("./registry.js");
Object.defineProperty(exports, "TemplateRegistry", { enumerable: true, get: function () { return registry_js_1.TemplateRegistry; } });
var composer_js_1 = require("./composer.js");
Object.defineProperty(exports, "TemplateComposer", { enumerable: true, get: function () { return composer_js_1.TemplateComposer; } });
