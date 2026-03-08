"use strict";
/**
 * Emergent Pattern Genesis Service
 * Entry point - Predicts patterns that don't exist yet
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
exports.patternGenesisResolvers = exports.createPatternGenesisEngine = exports.PatternGenesisEngine = void 0;
var PatternGenesisEngine_js_1 = require("./PatternGenesisEngine.js");
Object.defineProperty(exports, "PatternGenesisEngine", { enumerable: true, get: function () { return PatternGenesisEngine_js_1.PatternGenesisEngine; } });
Object.defineProperty(exports, "createPatternGenesisEngine", { enumerable: true, get: function () { return PatternGenesisEngine_js_1.createPatternGenesisEngine; } });
// Models
__exportStar(require("./models/ProtoPattern.js"), exports);
__exportStar(require("./models/FutureMotif.js"), exports);
__exportStar(require("./models/PatternCompetition.js"), exports);
__exportStar(require("./models/DominanceScore.js"), exports);
// Algorithms
__exportStar(require("./algorithms/ProtoPatternDetector.js"), exports);
__exportStar(require("./algorithms/PatternEvolver.js"), exports);
__exportStar(require("./algorithms/CompetitionSimulator.js"), exports);
__exportStar(require("./algorithms/DominancePredictor.js"), exports);
// Resolvers
var patternGenesisResolvers_js_1 = require("./resolvers/patternGenesisResolvers.js");
Object.defineProperty(exports, "patternGenesisResolvers", { enumerable: true, get: function () { return patternGenesisResolvers_js_1.patternGenesisResolvers; } });
