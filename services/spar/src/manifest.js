"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayManifest = replayManifest;
const utils_1 = require("./utils");
function replayManifest(manifest, signer) {
    const canonicalPayload = {
        promptTemplate: manifest.promptTemplate,
        inputs: manifest.inputs,
        toolTraces: manifest.toolTraces,
        output: manifest.output,
        metadata: manifest.metadata,
        policyTags: manifest.policyTags,
    };
    const canonical = (0, utils_1.stableStringify)(canonicalPayload);
    const hash = (0, utils_1.computeHash)(canonical);
    if (hash !== manifest.hash) {
        throw new Error('Manifest hash mismatch');
    }
    if (signer && !signer.verify(manifest.hash, manifest.signature)) {
        throw new Error('Manifest signature mismatch');
    }
    return {
        canonical,
        hash,
        manifest,
    };
}
