"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyManifest = verifyManifest;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const schema_js_1 = require("./schema.js");
const signature_js_1 = require("./signature.js");
const utils_js_1 = require("./utils.js");
function mergeEntries(manifest) {
    const entries = [];
    manifest.documents.forEach((entry) => entries.push({ ...entry, category: 'documents' }));
    manifest.exhibits?.forEach((entry) => entries.push({ ...entry, category: 'exhibits' }));
    manifest.evidence?.forEach((entry) => entries.push({ ...entry, category: 'evidence' }));
    return entries;
}
function buildEntryMap(entries) {
    const map = new Map();
    entries.forEach((entry) => {
        if (!map.has(entry.id)) {
            map.set(entry.id, entry);
        }
    });
    return map;
}
function resolveEntryPath(bundlePath, entry) {
    try {
        const canonical = (0, utils_js_1.toCanonicalPath)(bundlePath, entry.path);
        const absolutePath = node_path_1.default.join(node_path_1.default.resolve(bundlePath), canonical);
        return { absolutePath };
    }
    catch (error) {
        return {
            issue: {
                code: 'PATH_TRAVERSAL',
                message: `Path outside bundle: ${entry.path}`,
                path: entry.path,
                details: { error: error.message }
            }
        };
    }
}
async function validateEntryAsset(entry, absolutePath) {
    const exists = await (0, utils_js_1.fileExists)(absolutePath);
    if (!exists) {
        return {
            code: 'MISSING_FILE',
            message: `Missing file for ${entry.id}`,
            path: entry.path
        };
    }
    const computedHash = await (0, utils_js_1.hashFile)(absolutePath);
    entry.computedHash = computedHash;
    if (computedHash.toLowerCase() !== entry.sha256.toLowerCase()) {
        return {
            code: 'HASH_MISMATCH',
            message: `Hash mismatch for ${entry.id}`,
            path: entry.path,
            details: {
                expected: entry.sha256,
                actual: computedHash
            }
        };
    }
    return undefined;
}
function verifyEvidenceLinks(entry, entryMap) {
    const issues = [];
    if (!entry.evidence) {
        return issues;
    }
    entry.evidence.forEach((evidenceId) => {
        const evidenceEntry = entryMap.get(evidenceId);
        if (!evidenceEntry) {
            issues.push({
                code: 'EVIDENCE_MISSING',
                message: `Evidence ${evidenceId} referenced by ${entry.id} is missing from manifest`,
                path: entry.path
            });
        }
    });
    return issues;
}
function verifyTransformChain(entry, entryMap, transformMap) {
    const issues = [];
    if (!entry.transforms || entry.transforms.length === 0) {
        return issues;
    }
    let previousOutput;
    const transforms = entry.transforms;
    transforms.forEach((transformId, index) => {
        const transform = transformMap.get(transformId);
        if (!transform) {
            issues.push({
                code: 'TRANSFORM_BROKEN',
                message: `Transform ${transformId} referenced by ${entry.id} is missing`,
                path: entry.path
            });
            return;
        }
        const inputEntry = entryMap.get(transform.inputId);
        const outputEntry = entryMap.get(transform.outputId);
        if (!inputEntry || !outputEntry) {
            issues.push({
                code: 'TRANSFORM_BROKEN',
                message: `Transform ${transformId} references unknown input/output`,
                path: entry.path,
                details: { inputId: transform.inputId, outputId: transform.outputId }
            });
            return;
        }
        if (index === 0 && entry.evidence && entry.evidence.length > 0) {
            const expectedInput = entry.evidence[0];
            if (transform.inputId !== expectedInput) {
                issues.push({
                    code: 'TRANSFORM_BROKEN',
                    message: `Transform chain for ${entry.id} must start from evidence ${expectedInput}`,
                    path: entry.path,
                    details: { expectedInput, actualInput: transform.inputId }
                });
            }
        }
        if (previousOutput && transform.inputId !== previousOutput) {
            issues.push({
                code: 'TRANSFORM_BROKEN',
                message: `Transform chain for ${entry.id} is broken between steps ${index} and ${index + 1}`,
                path: entry.path,
                details: { expectedInput: previousOutput, actualInput: transform.inputId }
            });
        }
        if (index === transforms.length - 1 && transform.outputId !== entry.id) {
            issues.push({
                code: 'TRANSFORM_BROKEN',
                message: `Final transform for ${entry.id} must output the document id`,
                path: entry.path,
                details: { expectedOutput: entry.id, actualOutput: transform.outputId }
            });
        }
        previousOutput = transform.outputId;
    });
    return issues;
}
async function verifyManifest(bundlePath) {
    const issues = [];
    const absoluteBundle = node_path_1.default.resolve(bundlePath);
    const manifestPath = node_path_1.default.join(absoluteBundle, 'manifest.json');
    const signaturePath = node_path_1.default.join(absoluteBundle, 'signature.json');
    if (!(await (0, utils_js_1.fileExists)(manifestPath))) {
        issues.push({ code: 'MISSING_MANIFEST', message: 'manifest.json not found', path: manifestPath });
        return {
            bundlePath: absoluteBundle,
            manifestPath,
            valid: false,
            manifestVersion: undefined,
            issues,
            filesChecked: 0,
            transformsChecked: 0
        };
    }
    const manifestRaw = await node_fs_1.default.promises.readFile(manifestPath, 'utf8');
    let manifest;
    try {
        manifest = JSON.parse(manifestRaw);
    }
    catch (error) {
        issues.push({
            code: 'SCHEMA_INVALID',
            message: 'manifest.json is not valid JSON',
            path: manifestPath,
            details: { error: error.message }
        });
        return {
            bundlePath: absoluteBundle,
            manifestPath,
            valid: false,
            manifestVersion: undefined,
            issues,
            filesChecked: 0,
            transformsChecked: 0
        };
    }
    const schemaResult = (0, schema_js_1.validateManifestStructure)(manifest);
    if (!schemaResult.valid) {
        issues.push({
            code: 'SCHEMA_INVALID',
            message: 'manifest.json does not match schema',
            path: manifestPath,
            details: { errors: schemaResult.errors }
        });
    }
    if (manifest.manifestVersion && manifest.manifestVersion !== schema_js_1.MANIFEST_VERSION) {
        issues.push({
            code: 'SCHEMA_INVALID',
            message: `Unsupported manifestVersion: ${manifest.manifestVersion}`,
            path: manifestPath
        });
    }
    if (issues.length > 0) {
        return {
            bundlePath: absoluteBundle,
            manifestPath,
            valid: false,
            manifestVersion: manifest.manifestVersion,
            issues,
            filesChecked: 0,
            transformsChecked: 0
        };
    }
    const entries = mergeEntries(manifest);
    const entryMap = buildEntryMap(entries);
    const transformMap = new Map();
    manifest.transforms?.forEach((transform) => transformMap.set(transform.id, transform));
    let filesChecked = 0;
    const transformsChecked = manifest.transforms?.length ?? 0;
    for (const entry of entries) {
        const resolved = resolveEntryPath(absoluteBundle, entry);
        if (resolved.issue) {
            issues.push(resolved.issue);
            continue;
        }
        entry.absolutePath = resolved.absolutePath;
        entry.canonicalPath = (0, utils_js_1.toCanonicalPath)(absoluteBundle, entry.path);
        const assetIssue = await validateEntryAsset(entry, entry.absolutePath);
        filesChecked += 1;
        if (assetIssue) {
            issues.push(assetIssue);
        }
        issues.push(...verifyEvidenceLinks(entry, entryMap));
        issues.push(...verifyTransformChain(entry, entryMap, transformMap));
    }
    const disclosureSummary = manifest.disclosure
        ? {
            licenseId: manifest.disclosure.license?.id,
            audiencePolicyId: manifest.disclosure.audience?.policyId,
            redactionCount: manifest.disclosure.redactions?.length ?? 0,
            redactedFields: Array.from(new Set(manifest.disclosure.redactions?.map((redaction) => redaction.field) ?? [])),
        }
        : undefined;
    let signature;
    if (await (0, utils_js_1.fileExists)(signaturePath)) {
        try {
            const rawSignature = await node_fs_1.default.promises.readFile(signaturePath, 'utf8');
            const signatureFile = JSON.parse(rawSignature);
            const { valid, reason } = (0, signature_js_1.verifyManifestSignature)(manifest, signatureFile);
            if (!valid) {
                issues.push({
                    code: 'SIGNATURE_INVALID',
                    message: reason ?? 'Signature invalid',
                    path: signaturePath,
                });
            }
            signature = {
                valid,
                keyId: signatureFile.signature.keyId,
                algorithm: signatureFile.signature.algorithm,
                signedAt: signatureFile.signature.signedAt,
                manifestHash: signatureFile.manifestHash,
                reason,
            };
        }
        catch (error) {
            issues.push({
                code: 'SIGNATURE_INVALID',
                message: 'Signature file invalid JSON',
                path: signaturePath,
                details: { error: error.message },
            });
            signature = { valid: false, reason: 'Signature file invalid JSON' };
        }
    }
    else if (manifest.signature) {
        const signatureFile = {
            manifestHash: (0, signature_js_1.hashManifest)(manifest),
            signature: manifest.signature,
        };
        const { valid, reason } = (0, signature_js_1.verifyManifestSignature)(manifest, signatureFile);
        if (!valid) {
            issues.push({
                code: 'SIGNATURE_INVALID',
                message: reason ?? 'Signature invalid',
                path: manifestPath,
            });
        }
        signature = {
            valid,
            keyId: manifest.signature.keyId,
            algorithm: manifest.signature.algorithm,
            signedAt: manifest.signature.signedAt,
            manifestHash: signatureFile.manifestHash,
            reason,
        };
    }
    else {
        signature = undefined;
    }
    return {
        bundlePath: absoluteBundle,
        manifestPath,
        manifestVersion: manifest.manifestVersion,
        valid: issues.length === 0,
        issues,
        filesChecked,
        transformsChecked,
        signature,
        disclosure: disclosureSummary,
    };
}
