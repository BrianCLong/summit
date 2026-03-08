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
exports.buildAdapterBundle = buildAdapterBundle;
// @ts-nocheck
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const tar = __importStar(require("tar"));
const types_js_1 = require("./types.js");
const validation_js_1 = require("./validation.js");
const metadata_js_1 = require("./metadata.js");
const fs_js_1 = require("./fs.js");
async function buildAdapterBundle(options) {
    const { manifest, compatibility, sourceDir, configSchemaPath, outputDir = 'dist', sbomPath, slsaPath, cosignBinary = 'cosign', signingKeyPath, } = options;
    const stagingDir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'adapter-bundle-'));
    const payloadDir = node_path_1.default.join(stagingDir, 'payload');
    try {
        await node_fs_1.promises.mkdir(payloadDir, { recursive: true });
        await node_fs_1.promises.cp(sourceDir, payloadDir, { recursive: true });
        // Validate and write configuration schema
        const configSchema = await (0, fs_js_1.readJsonFile)(configSchemaPath);
        (0, validation_js_1.validateConfigSchema)(configSchema);
        const configSchemaFile = node_path_1.default.join(stagingDir, 'config.schema.json');
        await (0, fs_js_1.writeJson)(configSchemaFile, configSchema);
        // Validate and write compatibility
        (0, validation_js_1.validateCompatibility)(compatibility);
        const compatibilityFile = node_path_1.default.join(stagingDir, 'compatibility.json');
        await (0, fs_js_1.writeJson)(compatibilityFile, compatibility);
        // SBOM
        const sbom = sbomPath
            ? await (0, fs_js_1.readJsonFile)(sbomPath)
            : (0, metadata_js_1.createDefaultSbom)(manifest, compatibility);
        const sbomFile = node_path_1.default.join(stagingDir, 'sbom.json');
        await (0, fs_js_1.writeJson)(sbomFile, sbom);
        const payloadDigest = await (0, fs_js_1.hashDirectory)(payloadDir);
        // SLSA
        const slsa = slsaPath
            ? await (0, fs_js_1.readJsonFile)(slsaPath)
            : (0, metadata_js_1.createDefaultSlsa)(manifest, payloadDigest);
        const slsaFile = node_path_1.default.join(stagingDir, 'slsa.json');
        await (0, fs_js_1.writeJson)(slsaFile, slsa);
        const manifestWithArtifacts = {
            ...manifest,
            createdAt: manifest.createdAt ?? new Date().toISOString(),
            compatibility,
            artifacts: {
                payload: 'payload',
                sbom: node_path_1.default.basename(sbomFile),
                slsa: node_path_1.default.basename(slsaFile),
                configSchema: node_path_1.default.basename(configSchemaFile),
                compatibility: node_path_1.default.basename(compatibilityFile),
            },
            checksums: {
                payload: payloadDigest,
                sbom: await (0, fs_js_1.hashFile)(sbomFile),
                slsa: await (0, fs_js_1.hashFile)(slsaFile),
                configSchema: await (0, fs_js_1.hashFile)(configSchemaFile),
            },
            metadata: {
                buildHost: node_os_1.default.hostname(),
                ...(manifest.metadata ?? {}),
            },
        };
        (0, validation_js_1.validateManifest)(manifestWithArtifacts);
        const manifestFile = node_path_1.default.join(stagingDir, 'manifest.json');
        await (0, fs_js_1.writeJson)(manifestFile, manifestWithArtifacts);
        await node_fs_1.promises.mkdir(outputDir, { recursive: true });
        const bundleName = `${manifestWithArtifacts.id}-${manifestWithArtifacts.version}.tgz`;
        const bundlePath = node_path_1.default.join(outputDir, bundleName);
        await tar.c({ gzip: true, file: bundlePath, cwd: stagingDir }, ['.']);
        const bundleDigest = await (0, fs_js_1.hashFile)(bundlePath);
        const signaturePath = `${bundlePath}.sig`;
        const signResult = (0, node_child_process_1.spawnSync)(cosignBinary, ['sign-blob', '--key', signingKeyPath, '--output-signature', signaturePath, bundlePath], { encoding: 'utf8' });
        if (signResult.status !== 0) {
            throw new types_js_1.BundleValidationError(`Cosign signing failed: ${signResult.stderr || signResult.stdout || signResult.error?.message || 'unknown error'}`);
        }
        return {
            bundlePath,
            signaturePath,
            manifest: manifestWithArtifacts,
            bundleDigest,
        };
    }
    finally {
        await node_fs_1.promises.rm(stagingDir, { recursive: true, force: true });
    }
}
