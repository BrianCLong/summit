"use strict";
/**
 * Predictive Integrity Shield Service
 * Entry point - Detects prediction reliability issues
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
exports.integrityResolvers = exports.createIntegrityShield = exports.IntegrityShield = void 0;
var IntegrityShield_js_1 = require("./IntegrityShield.js");
Object.defineProperty(exports, "IntegrityShield", { enumerable: true, get: function () { return IntegrityShield_js_1.IntegrityShield; } });
Object.defineProperty(exports, "createIntegrityShield", { enumerable: true, get: function () { return IntegrityShield_js_1.createIntegrityShield; } });
// Models
__exportStar(require("./models/IntegrityReport.js"), exports);
__exportStar(require("./models/DriftMetric.js"), exports);
__exportStar(require("./models/AdversarialSignal.js"), exports);
// Algorithms
__exportStar(require("./algorithms/DriftDetector.js"), exports);
__exportStar(require("./algorithms/BiasAnalyzer.js"), exports);
__exportStar(require("./algorithms/AdversarialDetector.js"), exports);
__exportStar(require("./algorithms/SelfHealer.js"), exports);
// Resolvers
var integrityResolvers_js_1 = require("./resolvers/integrityResolvers.js");
Object.defineProperty(exports, "integrityResolvers", { enumerable: true, get: function () { return integrityResolvers_js_1.integrityResolvers; } });
