"use strict";
/**
 * @intelgraph/audio-processing
 *
 * Core audio processing types, interfaces, and utilities for the IntelGraph platform.
 * Provides foundational building blocks for audio analysis, speech processing, and acoustic intelligence.
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
exports.JobStatus = exports.ChannelConfig = exports.SampleRate = exports.AudioCodec = exports.AudioFormat = void 0;
// Export all types
__exportStar(require("./types.js"), exports);
// Export all interfaces
__exportStar(require("./interfaces.js"), exports);
// Export all utilities
__exportStar(require("./utils.js"), exports);
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "AudioFormat", { enumerable: true, get: function () { return types_js_1.AudioFormat; } });
Object.defineProperty(exports, "AudioCodec", { enumerable: true, get: function () { return types_js_1.AudioCodec; } });
Object.defineProperty(exports, "SampleRate", { enumerable: true, get: function () { return types_js_1.SampleRate; } });
Object.defineProperty(exports, "ChannelConfig", { enumerable: true, get: function () { return types_js_1.ChannelConfig; } });
Object.defineProperty(exports, "JobStatus", { enumerable: true, get: function () { return types_js_1.JobStatus; } });
