"use strict";
/**
 * @intelgraph/speech-recognition
 *
 * Speech-to-text recognition with multi-provider support including:
 * - Whisper (OpenAI)
 * - Google Cloud Speech-to-Text
 * - AWS Transcribe
 * - Azure Speech Services
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
exports.AzureSTTProvider = exports.AWSTranscribeProvider = exports.GoogleSTTProvider = exports.WhisperProvider = exports.STTProviderFactory = exports.SUPPORTED_LANGUAGES = exports.WhisperModel = exports.STTProvider = void 0;
// Export types
__exportStar(require("./types.js"), exports);
// Export interfaces
__exportStar(require("./interfaces.js"), exports);
// Export providers
__exportStar(require("./providers/index.js"), exports);
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "STTProvider", { enumerable: true, get: function () { return types_js_1.STTProvider; } });
Object.defineProperty(exports, "WhisperModel", { enumerable: true, get: function () { return types_js_1.WhisperModel; } });
Object.defineProperty(exports, "SUPPORTED_LANGUAGES", { enumerable: true, get: function () { return types_js_1.SUPPORTED_LANGUAGES; } });
var index_js_1 = require("./providers/index.js");
Object.defineProperty(exports, "STTProviderFactory", { enumerable: true, get: function () { return index_js_1.STTProviderFactory; } });
Object.defineProperty(exports, "WhisperProvider", { enumerable: true, get: function () { return index_js_1.WhisperProvider; } });
Object.defineProperty(exports, "GoogleSTTProvider", { enumerable: true, get: function () { return index_js_1.GoogleSTTProvider; } });
Object.defineProperty(exports, "AWSTranscribeProvider", { enumerable: true, get: function () { return index_js_1.AWSTranscribeProvider; } });
Object.defineProperty(exports, "AzureSTTProvider", { enumerable: true, get: function () { return index_js_1.AzureSTTProvider; } });
