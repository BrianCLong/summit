"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileModelCardFromFile = compileModelCardFromFile;
exports.compileModelCard = compileModelCard;
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const yaml_1 = require("yaml");
const validator_js_1 = require("./validator.js");
const canonical_js_1 = require("./canonical.js");
const signer_js_1 = require("./signer.js");
function hashSource(content) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(content);
    return hash.digest('hex');
}
function toCompiledCard(input, options, sourceHash) {
    const now = (options.now ?? new Date()).toISOString();
    return {
        metadata: {
            modelId: input.modelId,
            version: input.version,
            owner: input.owner,
            compiledAt: now,
            sourceHash,
        },
        description: input.description,
        metrics: input.metrics,
        intendedUse: input.intendedUse,
        dataLineage: input.dataLineage,
        risk: {
            ...input.risk,
            outOfScopePurposes: input.risk.outOfScopePurposes ?? [],
        },
        enforcement: {
            allowedPurposes: input.intendedUse.supportedPurposes,
            deniedPurposes: input.risk.outOfScopePurposes ?? [],
        },
    };
}
function compileModelCardFromFile(yamlPath, outputPath, options) {
    const raw = (0, node_fs_1.readFileSync)(yamlPath, 'utf8');
    const parsed = (0, yaml_1.parse)(raw);
    const validated = (0, validator_js_1.validateModelCard)(parsed);
    return compileModelCard(validated, raw, outputPath, options);
}
function compileModelCard(input, rawSource, outputPath, options) {
    const sourceHash = hashSource(rawSource);
    const compiled = toCompiledCard(input, options, sourceHash);
    const canonicalPayload = (0, canonical_js_1.canonicalize)({
        metadata: compiled.metadata,
        description: compiled.description,
        metrics: compiled.metrics,
        intendedUse: compiled.intendedUse,
        dataLineage: compiled.dataLineage,
        risk: compiled.risk,
        enforcement: compiled.enforcement,
    });
    const signature = (0, signer_js_1.signCanonicalPayload)(canonicalPayload, options.privateKeyPath, options.publicKeyPath);
    const card = {
        ...compiled,
        signature,
    };
    if (outputPath) {
        (0, node_fs_1.writeFileSync)(outputPath, JSON.stringify(card, null, 2), 'utf8');
    }
    return { card, canonicalPayload };
}
