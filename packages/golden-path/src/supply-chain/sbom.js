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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSbom = generateSbom;
exports.writeSbom = writeSbom;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
function generateSbom(manifestPath) {
    const manifest = JSON.parse((0, node_fs_1.readFileSync)(manifestPath, 'utf-8'));
    const components = [
        { name: manifest.name, version: manifest.version, type: 'application' },
    ];
    for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
        components.push({ name, version, type: 'library' });
    }
    const digest = (0, node_crypto_1.createHash)('sha256')
        .update(JSON.stringify(components))
        .digest('hex');
    return {
        tool: 'golden-path-sbom',
        createdAt: new Date().toISOString(),
        components,
        digest,
    };
}
async function writeSbom(manifestDir, outputDir) {
    const sbom = generateSbom(node_path_1.default.join(manifestDir, 'package.json'));
    const outputPath = node_path_1.default.join(outputDir, 'sbom.json');
    const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(sbom, null, 2), 'utf-8');
    return outputPath;
}
