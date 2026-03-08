"use strict";
/**
 * Detection type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingMethod = exports.ExplanationMethod = exports.DetectionStatus = exports.DetectorType = void 0;
var DetectorType;
(function (DetectorType) {
    DetectorType["VIDEO_FACE"] = "VIDEO_FACE";
    DetectorType["VIDEO_GENERIC"] = "VIDEO_GENERIC";
    DetectorType["AUDIO_SPECTROGRAM"] = "AUDIO_SPECTROGRAM";
    DetectorType["AUDIO_WAVEFORM"] = "AUDIO_WAVEFORM";
    DetectorType["IMAGE_MANIPULATION"] = "IMAGE_MANIPULATION";
    DetectorType["IMAGE_GAN"] = "IMAGE_GAN";
    DetectorType["TEXT_SYNTHETIC"] = "TEXT_SYNTHETIC";
    DetectorType["ENSEMBLE"] = "ENSEMBLE";
})(DetectorType || (exports.DetectorType = DetectorType = {}));
var DetectionStatus;
(function (DetectionStatus) {
    DetectionStatus["PENDING"] = "PENDING";
    DetectionStatus["PROCESSING"] = "PROCESSING";
    DetectionStatus["COMPLETED"] = "COMPLETED";
    DetectionStatus["FAILED"] = "FAILED";
    DetectionStatus["CANCELLED"] = "CANCELLED";
})(DetectionStatus || (exports.DetectionStatus = DetectionStatus = {}));
var ExplanationMethod;
(function (ExplanationMethod) {
    ExplanationMethod["GRAD_CAM"] = "GRAD_CAM";
    ExplanationMethod["LIME"] = "LIME";
    ExplanationMethod["SHAP"] = "SHAP";
    ExplanationMethod["ATTENTION_WEIGHTS"] = "ATTENTION_WEIGHTS";
    ExplanationMethod["INTEGRATED_GRADIENTS"] = "INTEGRATED_GRADIENTS";
})(ExplanationMethod || (exports.ExplanationMethod = ExplanationMethod = {}));
var VotingMethod;
(function (VotingMethod) {
    VotingMethod["WEIGHTED_AVERAGE"] = "WEIGHTED_AVERAGE";
    VotingMethod["MAJORITY_VOTE"] = "MAJORITY_VOTE";
    VotingMethod["MAX_CONFIDENCE"] = "MAX_CONFIDENCE";
    VotingMethod["UNANIMOUS"] = "UNANIMOUS";
})(VotingMethod || (exports.VotingMethod = VotingMethod = {}));
