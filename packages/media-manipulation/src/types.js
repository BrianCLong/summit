"use strict";
/**
 * Media Manipulation Detection Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceType = exports.ManipulationType = void 0;
var ManipulationType;
(function (ManipulationType) {
    ManipulationType["COPY_PASTE"] = "copy_paste";
    ManipulationType["SPLICING"] = "splicing";
    ManipulationType["CLONING"] = "cloning";
    ManipulationType["CONTENT_AWARE_FILL"] = "content_aware_fill";
    ManipulationType["COLOR_ADJUSTMENT"] = "color_adjustment";
    ManipulationType["TONE_MAPPING"] = "tone_mapping";
    ManipulationType["FILTER_APPLICATION"] = "filter_application";
    ManipulationType["RESAMPLING"] = "resampling";
    ManipulationType["NOISE_ADDITION"] = "noise_addition";
    ManipulationType["BLUR_SHARPENING"] = "blur_sharpening";
    ManipulationType["OBJECT_REMOVAL"] = "object_removal";
    ManipulationType["OBJECT_ADDITION"] = "object_addition";
    ManipulationType["PERSPECTIVE_DISTORTION"] = "perspective_distortion";
    ManipulationType["COMPRESSION_INCONSISTENCY"] = "compression_inconsistency";
})(ManipulationType || (exports.ManipulationType = ManipulationType = {}));
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["ERROR_LEVEL_ANALYSIS"] = "ela";
    EvidenceType["NOISE_ANALYSIS"] = "noise";
    EvidenceType["JPEG_GHOSTS"] = "jpeg_ghosts";
    EvidenceType["DCT_ANALYSIS"] = "dct";
    EvidenceType["METADATA_INCONSISTENCY"] = "metadata";
    EvidenceType["DOUBLE_COMPRESSION"] = "double_compression";
    EvidenceType["CLONING_DETECTION"] = "cloning";
    EvidenceType["FORGERY_LOCALIZATION"] = "forgery_localization";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
