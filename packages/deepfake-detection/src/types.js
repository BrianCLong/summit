"use strict";
/**
 * Deepfake Detection Types
 * Comprehensive type definitions for deepfake detection and analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiometricType = exports.ArtifactType = exports.DetectionMethod = void 0;
var DetectionMethod;
(function (DetectionMethod) {
    DetectionMethod["FACIAL_MANIPULATION"] = "facial_manipulation";
    DetectionMethod["VOICE_SYNTHESIS"] = "voice_synthesis";
    DetectionMethod["VIDEO_MANIPULATION"] = "video_manipulation";
    DetectionMethod["AUDIO_DEEPFAKE"] = "audio_deepfake";
    DetectionMethod["GAN_DETECTION"] = "gan_detection";
    DetectionMethod["TEMPORAL_ANALYSIS"] = "temporal_analysis";
    DetectionMethod["LIGHTING_PHYSICS"] = "lighting_physics";
    DetectionMethod["BIOMETRIC_ANOMALY"] = "biometric_anomaly";
    DetectionMethod["COMPRESSION_ARTIFACT"] = "compression_artifact";
    DetectionMethod["MULTI_MODAL"] = "multi_modal";
})(DetectionMethod || (exports.DetectionMethod = DetectionMethod = {}));
var ArtifactType;
(function (ArtifactType) {
    ArtifactType["FACIAL_BOUNDARY"] = "facial_boundary";
    ArtifactType["EYE_BLINK_ANOMALY"] = "eye_blink_anomaly";
    ArtifactType["LIP_SYNC_MISMATCH"] = "lip_sync_mismatch";
    ArtifactType["SKIN_TEXTURE_INCONSISTENCY"] = "skin_texture_inconsistency";
    ArtifactType["LIGHTING_INCONSISTENCY"] = "lighting_inconsistency";
    ArtifactType["SHADOW_MISMATCH"] = "shadow_mismatch";
    ArtifactType["TEMPORAL_DISCONTINUITY"] = "temporal_discontinuity";
    ArtifactType["FREQUENCY_ARTIFACT"] = "frequency_artifact";
    ArtifactType["SPECTRAL_ANOMALY"] = "spectral_anomaly";
    ArtifactType["COMPRESSION_PATTERN"] = "compression_pattern";
    ArtifactType["GAN_FINGERPRINT"] = "gan_fingerprint";
    ArtifactType["BIOMETRIC_MISMATCH"] = "biometric_mismatch";
})(ArtifactType || (exports.ArtifactType = ArtifactType = {}));
var BiometricType;
(function (BiometricType) {
    BiometricType["FACIAL"] = "facial";
    BiometricType["VOICE"] = "voice";
    BiometricType["GAIT"] = "gait";
    BiometricType["BEHAVIORAL"] = "behavioral";
})(BiometricType || (exports.BiometricType = BiometricType = {}));
