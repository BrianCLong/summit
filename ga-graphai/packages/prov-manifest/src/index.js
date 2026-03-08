"use strict";
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
exports.toCanonicalPath = exports.manifestSchema = exports.MANIFEST_VERSION = exports.verifyManifestSignature = exports.signManifest = exports.verifyManifest = void 0;
var verifier_js_1 = require("./verifier.js");
Object.defineProperty(exports, "verifyManifest", { enumerable: true, get: function () { return verifier_js_1.verifyManifest; } });
var signature_js_1 = require("./signature.js");
Object.defineProperty(exports, "signManifest", { enumerable: true, get: function () { return signature_js_1.signManifest; } });
Object.defineProperty(exports, "verifyManifestSignature", { enumerable: true, get: function () { return signature_js_1.verifyManifestSignature; } });
var schema_js_1 = require("./schema.js");
Object.defineProperty(exports, "MANIFEST_VERSION", { enumerable: true, get: function () { return schema_js_1.MANIFEST_VERSION; } });
Object.defineProperty(exports, "manifestSchema", { enumerable: true, get: function () { return schema_js_1.manifestSchema; } });
__exportStar(require("./types.js"), exports);
var utils_js_1 = require("./utils.js");
Object.defineProperty(exports, "toCanonicalPath", { enumerable: true, get: function () { return utils_js_1.toCanonicalPath; } });
