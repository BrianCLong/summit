"use strict";
/**
 * Cross-System Entanglement Detector Service
 * Entry point - Discovers hidden relationships across domains
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
exports.entanglementResolvers = exports.EntanglementDetector = void 0;
var EntanglementDetector_js_1 = require("./EntanglementDetector.js");
Object.defineProperty(exports, "EntanglementDetector", { enumerable: true, get: function () { return EntanglementDetector_js_1.EntanglementDetector; } });
// Models
__exportStar(require("./models/EntanglementSignature.js"), exports);
__exportStar(require("./models/SystemCoupling.js"), exports);
__exportStar(require("./models/SynchronizationEvent.js"), exports);
__exportStar(require("./models/RiskScore.js"), exports);
// Algorithms
__exportStar(require("./algorithms/LatentCouplingFinder.js"), exports);
__exportStar(require("./algorithms/SynchronizationDetector.js"), exports);
__exportStar(require("./algorithms/RiskScorer.js"), exports);
__exportStar(require("./algorithms/CrossDomainCorrelator.js"), exports);
// Resolvers
var entanglementResolvers_js_1 = require("./resolvers/entanglementResolvers.js");
Object.defineProperty(exports, "entanglementResolvers", { enumerable: true, get: function () { return entanglementResolvers_js_1.entanglementResolvers; } });
