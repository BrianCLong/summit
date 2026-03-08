"use strict";
// Cross-Domain Solution (CDS) Module
// Implements IC-grade cross-domain transfer with ABAC, content inspection, and diode emulation
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
exports.CrossDomainGuard = exports.HardwareEmulator = exports.ContentInspector = exports.ABACEngine = void 0;
__exportStar(require("./types.js"), exports);
var ABACEngine_js_1 = require("./ABACEngine.js");
Object.defineProperty(exports, "ABACEngine", { enumerable: true, get: function () { return ABACEngine_js_1.ABACEngine; } });
var ContentInspector_js_1 = require("./ContentInspector.js");
Object.defineProperty(exports, "ContentInspector", { enumerable: true, get: function () { return ContentInspector_js_1.ContentInspector; } });
var HardwareEmulator_js_1 = require("./HardwareEmulator.js");
Object.defineProperty(exports, "HardwareEmulator", { enumerable: true, get: function () { return HardwareEmulator_js_1.HardwareEmulator; } });
var CrossDomainGuard_js_1 = require("./CrossDomainGuard.js");
Object.defineProperty(exports, "CrossDomainGuard", { enumerable: true, get: function () { return CrossDomainGuard_js_1.CrossDomainGuard; } });
