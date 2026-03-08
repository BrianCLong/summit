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
exports.verifyAdapterBundle = verifyAdapterBundle;
// @ts-nocheck
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const tar = __importStar(require("tar"));
const semver_1 = __importDefault(require("semver"));
const types_js_1 = require("./types.js");
const validation_js_1 = require("./validation.js");
const fs_js_1 = require("./fs.js");
async function ensureFileExists(filePath, label) {
    try {
        await node_fs_1.promises.access(filePath);
    }
    catch {
        throw new types_js_1.BundleValidationError(`${label} is missing at ${filePath}`);
    }
}
function assertCompatibleRuntime(compatibility, expectedSdkVersion, allowPrerelease = false) {
    const sdkVersion = semver_1.default.coerce(expectedSdkVersion);
    if (!sdkVersion) {
        throw new types_js_1.BundleValidationError(`Invalid SDK version: ${expectedSdkVersion}`);
    }
    const minVersion = semver_1.default.coerce(compatibility.sdk.min);
    if (!minVersion) {
        throw new types_js_1.BundleValidationError(`Invalid compatibility sdk.min value: ${compatibility.sdk.min}`);
    }
    const maxVersion = compatibility.sdk.max ? semver_1.default.coerce(compatibility.sdk.max) : undefined;
    if (compatibility.sdk.max && !maxVersion) {
        throw new types_js_1.BundleValidationError(`Invalid compatibility sdk.max value: ${compatibility.sdk.max}`);
    }
    const minOk = semver_1.default.gte(sdkVersion, minVersion, {
        includePrerelease: allowPrerelease,
    });
    const maxOk = !maxVersion
        ? true
        : semver_1.default.lte(sdkVersion, maxVersion, {
            includePrerelease: allowPrerelease,
        });
    if (!minOk || !maxOk) {
        throw new types_js_1.BundleValidationError(`Adapter is incompatible with SDK ${sdkVersion.version} (required ${compatibility.sdk.min}${compatibility.sdk.max ? ` - ${compatibility.sdk.max}` : '+'})`);
    }
    const runtimeMatch = compatibility.runtimes.find((runtime) => (runtime.os === 'any' || runtime.os === process.platform) &&
        (runtime.arch === 'any' || runtime.arch === process.arch) &&
        semver_1.default.satisfies(process.versions.node, runtime.node, {
            includePrerelease: allowPrerelease,
        }));
    if (!runtimeMatch) {
        throw new types_js_1.BundleValidationError(`Adapter does not support current runtime ${process.platform}/${process.arch} (node ${process.versions.node})`);
    }
    return `Runtime satisfied for ${runtimeMatch.os}/${runtimeMatch.arch} with node ${runtimeMatch.node}`;
}
async function verifyChecksums(manifest, root) {
    const payloadDigest = await (0, fs_js_1.hashDirectory)(node_path_1.default.join(root, manifest.artifacts.payload));
    if (payloadDigest !== manifest.checksums.payload) {
        throw new types_js_1.BundleValidationError(`Payload checksum mismatch (expected ${manifest.checksums.payload}, got ${payloadDigest})`);
    }
    const sbomDigest = await (0, fs_js_1.hashFile)(node_path_1.default.join(root, manifest.artifacts.sbom));
    if (sbomDigest !== manifest.checksums.sbom) {
        throw new types_js_1.BundleValidationError('SBOM checksum mismatch');
    }
    const slsaDigest = await (0, fs_js_1.hashFile)(node_path_1.default.join(root, manifest.artifacts.slsa));
    if (slsaDigest !== manifest.checksums.slsa) {
        throw new types_js_1.BundleValidationError('SLSA attestation checksum mismatch');
    }
    const configDigest = await (0, fs_js_1.hashFile)(node_path_1.default.join(root, manifest.artifacts.configSchema));
    if (configDigest !== manifest.checksums.configSchema) {
        throw new types_js_1.BundleValidationError('Config schema checksum mismatch');
    }
}
async function verifyAdapterBundle(options) {
    const { bundlePath, signaturePath, publicKeyPath, expectedSdkVersion, cosignBinary = 'cosign', allowPrerelease = false, } = options;
    await ensureFileExists(bundlePath, 'Bundle');
    await ensureFileExists(signaturePath, 'Signature');
    await ensureFileExists(publicKeyPath, 'Public key');
    const verifyResult = (0, node_child_process_1.spawnSync)(cosignBinary, ['verify-blob', '--key', publicKeyPath, '--signature', signaturePath, bundlePath], { encoding: 'utf8' });
    if (verifyResult.status !== 0) {
        throw new types_js_1.BundleValidationError(`Cosign verification failed: ${verifyResult.stderr || verifyResult.stdout || verifyResult.error?.message || 'unknown error'}`);
    }
    const tempDir = await node_fs_1.promises.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'adapter-verify-'));
    try {
        await tar.x({ file: bundlePath, cwd: tempDir });
        const manifestPath = node_path_1.default.join(tempDir, 'manifest.json');
        const manifest = await (0, fs_js_1.readJsonFile)(manifestPath);
        (0, validation_js_1.validateManifest)(manifest);
        const compatibilityPath = node_path_1.default.join(tempDir, manifest.artifacts.compatibility);
        const configSchemaPath = node_path_1.default.join(tempDir, manifest.artifacts.configSchema);
        const compatibility = await (0, fs_js_1.readJsonFile)(compatibilityPath);
        (0, validation_js_1.validateCompatibility)(compatibility);
        const configSchema = await (0, fs_js_1.readJsonFile)(configSchemaPath);
        (0, validation_js_1.validateConfigSchema)(configSchema);
        if (JSON.stringify(manifest.compatibility) !== JSON.stringify(compatibility)) {
            throw new types_js_1.BundleValidationError('Manifest compatibility does not match compatibility.json');
        }
        await verifyChecksums(manifest, tempDir);
        const runtimeMessage = assertCompatibleRuntime(compatibility, expectedSdkVersion, allowPrerelease);
        const bundleDigest = await (0, fs_js_1.hashFile)(bundlePath);
        return {
            verified: true,
            manifest,
            compatibility,
            bundleDigest,
            diagnostics: [
                runtimeMessage,
                `Signature validated via ${cosignBinary}`,
                `Bundle hash ${bundleDigest}`,
            ],
        };
    }
    finally {
        await node_fs_1.promises.rm(tempDir, { recursive: true, force: true });
    }
}
