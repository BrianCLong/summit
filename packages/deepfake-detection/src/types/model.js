"use strict";
/**
 * ML Model type definitions for model registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelFramework = exports.ModelStatus = exports.ModelType = void 0;
var ModelType;
(function (ModelType) {
    ModelType["VIDEO_DETECTOR"] = "VIDEO_DETECTOR";
    ModelType["AUDIO_DETECTOR"] = "AUDIO_DETECTOR";
    ModelType["IMAGE_DETECTOR"] = "IMAGE_DETECTOR";
    ModelType["ENSEMBLE"] = "ENSEMBLE";
    ModelType["FEATURE_EXTRACTOR"] = "FEATURE_EXTRACTOR";
})(ModelType || (exports.ModelType = ModelType = {}));
var ModelStatus;
(function (ModelStatus) {
    ModelStatus["DRAFT"] = "DRAFT";
    ModelStatus["TESTING"] = "TESTING";
    ModelStatus["STAGING"] = "STAGING";
    ModelStatus["PRODUCTION"] = "PRODUCTION";
    ModelStatus["DEPRECATED"] = "DEPRECATED";
    ModelStatus["ARCHIVED"] = "ARCHIVED";
})(ModelStatus || (exports.ModelStatus = ModelStatus = {}));
var ModelFramework;
(function (ModelFramework) {
    ModelFramework["PYTORCH"] = "PYTORCH";
    ModelFramework["TENSORFLOW"] = "TENSORFLOW";
    ModelFramework["ONNX"] = "ONNX";
    ModelFramework["SCIKIT_LEARN"] = "SCIKIT_LEARN";
    ModelFramework["CUSTOM"] = "CUSTOM";
})(ModelFramework || (exports.ModelFramework = ModelFramework = {}));
