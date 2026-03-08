"use strict";
/**
 * Multi-Agent Negotiation Module
 *
 * Exports the negotiation runtime and related types.
 *
 * @module agents/negotiation
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
exports.getNegotiationRuntime = exports.NegotiationRuntime = void 0;
var NegotiationRuntime_js_1 = require("./NegotiationRuntime.js");
Object.defineProperty(exports, "NegotiationRuntime", { enumerable: true, get: function () { return NegotiationRuntime_js_1.NegotiationRuntime; } });
Object.defineProperty(exports, "getNegotiationRuntime", { enumerable: true, get: function () { return NegotiationRuntime_js_1.getNegotiationRuntime; } });
__exportStar(require("./types.js"), exports);
