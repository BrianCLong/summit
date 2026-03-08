"use strict";
/**
 * @intelgraph/ml-models
 * ML model integration for threat detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelMonitoring = exports.FeatureEngineering = exports.OnlineLearningModel = exports.EnsembleModel = exports.AnomalyDetectionModel = exports.PredictionResult = exports.PredictionRequest = exports.MLModel = exports.ModelType = exports.MLThreatClient = void 0;
var ml_client_1 = require("./ml-client");
Object.defineProperty(exports, "MLThreatClient", { enumerable: true, get: function () { return ml_client_1.MLThreatClient; } });
// Re-export core ML types
var threat_detection_core_1 = require("@intelgraph/threat-detection-core");
Object.defineProperty(exports, "ModelType", { enumerable: true, get: function () { return threat_detection_core_1.ModelType; } });
Object.defineProperty(exports, "MLModel", { enumerable: true, get: function () { return threat_detection_core_1.MLModel; } });
Object.defineProperty(exports, "PredictionRequest", { enumerable: true, get: function () { return threat_detection_core_1.PredictionRequest; } });
Object.defineProperty(exports, "PredictionResult", { enumerable: true, get: function () { return threat_detection_core_1.PredictionResult; } });
Object.defineProperty(exports, "AnomalyDetectionModel", { enumerable: true, get: function () { return threat_detection_core_1.AnomalyDetectionModel; } });
Object.defineProperty(exports, "EnsembleModel", { enumerable: true, get: function () { return threat_detection_core_1.EnsembleModel; } });
Object.defineProperty(exports, "OnlineLearningModel", { enumerable: true, get: function () { return threat_detection_core_1.OnlineLearningModel; } });
Object.defineProperty(exports, "FeatureEngineering", { enumerable: true, get: function () { return threat_detection_core_1.FeatureEngineering; } });
Object.defineProperty(exports, "ModelMonitoring", { enumerable: true, get: function () { return threat_detection_core_1.ModelMonitoring; } });
