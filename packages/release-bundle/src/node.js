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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChecksums = exports.parseManifest = void 0;
exports.loadBundleFromDir = loadBundleFromDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const core_js_1 = require("./core.js");
function loadBundleFromDir(dirPath) {
    const manifestPath = path.join(dirPath, 'release-manifest.json');
    const checksumsPath = path.join(dirPath, 'checksums.txt');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest not found at ${manifestPath}`);
    }
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = (0, core_js_1.parseManifest)(manifestContent);
    let checksums = {};
    if (fs.existsSync(checksumsPath)) {
        const checksumsContent = fs.readFileSync(checksumsPath, 'utf-8');
        checksums = (0, core_js_1.parseChecksums)(checksumsContent);
    }
    return {
        manifest,
        checksums
    };
}
var core_js_2 = require("./core.js");
Object.defineProperty(exports, "parseManifest", { enumerable: true, get: function () { return core_js_2.parseManifest; } });
Object.defineProperty(exports, "parseChecksums", { enumerable: true, get: function () { return core_js_2.parseChecksums; } });
