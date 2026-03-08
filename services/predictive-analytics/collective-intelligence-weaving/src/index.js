"use strict";
/**
 * Collective Intelligence Future Weaving Service
 * Entry point for the service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.weavingResolvers = exports.mergeFabrics = exports.createHarmonizer = exports.FabricHarmonizer = exports.createTrustCalculator = exports.TrustCalculator = exports.createConflictResolver = exports.ConflictResolver = exports.createFuser = exports.FusionMethod = exports.SignalFuser = exports.shouldIncludeSource = exports.getTrustLevel = exports.TrustScoreFactory = exports.getDomainConfidence = exports.getHighestConfidencePrediction = exports.FutureFabricFactory = exports.hasUnresolvedConflicts = exports.isCoherent = exports.ResolutionMethod = exports.SignalBraidFactory = exports.getWeightedPrediction = exports.calculateConsensus = exports.groupSignalsByDomain = exports.PredictiveSignalFactory = exports.isSourceActive = exports.getSourceWeight = exports.SourceType = exports.IntelligenceSourceFactory = exports.createFutureWeaver = exports.FutureWeaver = void 0;
var FutureWeaver_js_1 = require("./FutureWeaver.js");
Object.defineProperty(exports, "FutureWeaver", { enumerable: true, get: function () { return FutureWeaver_js_1.FutureWeaver; } });
Object.defineProperty(exports, "createFutureWeaver", { enumerable: true, get: function () { return FutureWeaver_js_1.createFutureWeaver; } });
// Models
var IntelligenceSource_js_1 = require("./models/IntelligenceSource.js");
Object.defineProperty(exports, "IntelligenceSourceFactory", { enumerable: true, get: function () { return IntelligenceSource_js_1.IntelligenceSourceFactory; } });
Object.defineProperty(exports, "SourceType", { enumerable: true, get: function () { return IntelligenceSource_js_1.SourceType; } });
Object.defineProperty(exports, "getSourceWeight", { enumerable: true, get: function () { return IntelligenceSource_js_1.getSourceWeight; } });
Object.defineProperty(exports, "isSourceActive", { enumerable: true, get: function () { return IntelligenceSource_js_1.isSourceActive; } });
var PredictiveSignal_js_1 = require("./models/PredictiveSignal.js");
Object.defineProperty(exports, "PredictiveSignalFactory", { enumerable: true, get: function () { return PredictiveSignal_js_1.PredictiveSignalFactory; } });
Object.defineProperty(exports, "groupSignalsByDomain", { enumerable: true, get: function () { return PredictiveSignal_js_1.groupSignalsByDomain; } });
Object.defineProperty(exports, "calculateConsensus", { enumerable: true, get: function () { return PredictiveSignal_js_1.calculateConsensus; } });
Object.defineProperty(exports, "getWeightedPrediction", { enumerable: true, get: function () { return PredictiveSignal_js_1.getWeightedPrediction; } });
var SignalBraid_js_1 = require("./models/SignalBraid.js");
Object.defineProperty(exports, "SignalBraidFactory", { enumerable: true, get: function () { return SignalBraid_js_1.SignalBraidFactory; } });
Object.defineProperty(exports, "ResolutionMethod", { enumerable: true, get: function () { return SignalBraid_js_1.ResolutionMethod; } });
Object.defineProperty(exports, "isCoherent", { enumerable: true, get: function () { return SignalBraid_js_1.isCoherent; } });
Object.defineProperty(exports, "hasUnresolvedConflicts", { enumerable: true, get: function () { return SignalBraid_js_1.hasUnresolvedConflicts; } });
var FutureFabric_js_1 = require("./models/FutureFabric.js");
Object.defineProperty(exports, "FutureFabricFactory", { enumerable: true, get: function () { return FutureFabric_js_1.FutureFabricFactory; } });
Object.defineProperty(exports, "getHighestConfidencePrediction", { enumerable: true, get: function () { return FutureFabric_js_1.getHighestConfidencePrediction; } });
Object.defineProperty(exports, "getDomainConfidence", { enumerable: true, get: function () { return FutureFabric_js_1.getDomainConfidence; } });
var TrustScore_js_1 = require("./models/TrustScore.js");
Object.defineProperty(exports, "TrustScoreFactory", { enumerable: true, get: function () { return TrustScore_js_1.TrustScoreFactory; } });
Object.defineProperty(exports, "getTrustLevel", { enumerable: true, get: function () { return TrustScore_js_1.getTrustLevel; } });
Object.defineProperty(exports, "shouldIncludeSource", { enumerable: true, get: function () { return TrustScore_js_1.shouldIncludeSource; } });
// Algorithms
var SignalFuser_js_1 = require("./algorithms/SignalFuser.js");
Object.defineProperty(exports, "SignalFuser", { enumerable: true, get: function () { return SignalFuser_js_1.SignalFuser; } });
Object.defineProperty(exports, "FusionMethod", { enumerable: true, get: function () { return SignalFuser_js_1.FusionMethod; } });
Object.defineProperty(exports, "createFuser", { enumerable: true, get: function () { return SignalFuser_js_1.createFuser; } });
var ConflictResolver_js_1 = require("./algorithms/ConflictResolver.js");
Object.defineProperty(exports, "ConflictResolver", { enumerable: true, get: function () { return ConflictResolver_js_1.ConflictResolver; } });
Object.defineProperty(exports, "createConflictResolver", { enumerable: true, get: function () { return ConflictResolver_js_1.createConflictResolver; } });
var TrustCalculator_js_1 = require("./algorithms/TrustCalculator.js");
Object.defineProperty(exports, "TrustCalculator", { enumerable: true, get: function () { return TrustCalculator_js_1.TrustCalculator; } });
Object.defineProperty(exports, "createTrustCalculator", { enumerable: true, get: function () { return TrustCalculator_js_1.createTrustCalculator; } });
var FabricHarmonizer_js_1 = require("./algorithms/FabricHarmonizer.js");
Object.defineProperty(exports, "FabricHarmonizer", { enumerable: true, get: function () { return FabricHarmonizer_js_1.FabricHarmonizer; } });
Object.defineProperty(exports, "createHarmonizer", { enumerable: true, get: function () { return FabricHarmonizer_js_1.createHarmonizer; } });
Object.defineProperty(exports, "mergeFabrics", { enumerable: true, get: function () { return FabricHarmonizer_js_1.mergeFabrics; } });
// Resolvers
var weavingResolvers_js_1 = require("./resolvers/weavingResolvers.js");
Object.defineProperty(exports, "weavingResolvers", { enumerable: true, get: function () { return weavingResolvers_js_1.weavingResolvers; } });
// Utils
var logger_js_1 = require("./utils/logger.js");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_js_1.createLogger; } });
