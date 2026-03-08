"use strict";
/**
 * STT Provider implementations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureSTTProvider = exports.AWSTranscribeProvider = exports.GoogleSTTProvider = exports.WhisperProvider = exports.STTProviderFactory = exports.BaseSTTProvider = void 0;
var base_js_1 = require("./base.js");
Object.defineProperty(exports, "BaseSTTProvider", { enumerable: true, get: function () { return base_js_1.BaseSTTProvider; } });
Object.defineProperty(exports, "STTProviderFactory", { enumerable: true, get: function () { return base_js_1.STTProviderFactory; } });
var whisper_js_1 = require("./whisper.js");
Object.defineProperty(exports, "WhisperProvider", { enumerable: true, get: function () { return whisper_js_1.WhisperProvider; } });
var google_js_1 = require("./google.js");
Object.defineProperty(exports, "GoogleSTTProvider", { enumerable: true, get: function () { return google_js_1.GoogleSTTProvider; } });
var aws_js_1 = require("./aws.js");
Object.defineProperty(exports, "AWSTranscribeProvider", { enumerable: true, get: function () { return aws_js_1.AWSTranscribeProvider; } });
var azure_js_1 = require("./azure.js");
Object.defineProperty(exports, "AzureSTTProvider", { enumerable: true, get: function () { return azure_js_1.AzureSTTProvider; } });
// Auto-register providers
const base_js_2 = require("./base.js");
const whisper_js_2 = require("./whisper.js");
const google_js_2 = require("./google.js");
const aws_js_2 = require("./aws.js");
const azure_js_2 = require("./azure.js");
const types_js_1 = require("../types.js");
base_js_2.STTProviderFactory.register(types_js_1.STTProvider.WHISPER, () => new whisper_js_2.WhisperProvider());
base_js_2.STTProviderFactory.register(types_js_1.STTProvider.GOOGLE, () => new google_js_2.GoogleSTTProvider());
base_js_2.STTProviderFactory.register(types_js_1.STTProvider.AWS, () => new aws_js_2.AWSTranscribeProvider());
base_js_2.STTProviderFactory.register(types_js_1.STTProvider.AZURE, () => new azure_js_2.AzureSTTProvider());
