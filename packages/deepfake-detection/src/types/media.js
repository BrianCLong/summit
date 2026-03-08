"use strict";
/**
 * Media type definitions for deepfake detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaStatus = exports.MediaType = void 0;
var MediaType;
(function (MediaType) {
    MediaType["VIDEO"] = "VIDEO";
    MediaType["AUDIO"] = "AUDIO";
    MediaType["IMAGE"] = "IMAGE";
})(MediaType || (exports.MediaType = MediaType = {}));
var MediaStatus;
(function (MediaStatus) {
    MediaStatus["UPLOADED"] = "UPLOADED";
    MediaStatus["PROCESSING"] = "PROCESSING";
    MediaStatus["ANALYZED"] = "ANALYZED";
    MediaStatus["FAILED"] = "FAILED";
    MediaStatus["ARCHIVED"] = "ARCHIVED";
})(MediaStatus || (exports.MediaStatus = MediaStatus = {}));
