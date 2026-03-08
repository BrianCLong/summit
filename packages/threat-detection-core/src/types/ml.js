"use strict";
/**
 * Machine learning model types for threat detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelType = void 0;
var ModelType;
(function (ModelType) {
    ModelType["SUPERVISED_CLASSIFIER"] = "SUPERVISED_CLASSIFIER";
    ModelType["UNSUPERVISED_ANOMALY"] = "UNSUPERVISED_ANOMALY";
    ModelType["SEMI_SUPERVISED"] = "SEMI_SUPERVISED";
    ModelType["AUTOENCODER"] = "AUTOENCODER";
    ModelType["GAN"] = "GAN";
    ModelType["ENSEMBLE"] = "ENSEMBLE";
    ModelType["ONLINE_LEARNING"] = "ONLINE_LEARNING";
    ModelType["DEEP_LEARNING"] = "DEEP_LEARNING";
    ModelType["TIME_SERIES"] = "TIME_SERIES";
})(ModelType || (exports.ModelType = ModelType = {}));
