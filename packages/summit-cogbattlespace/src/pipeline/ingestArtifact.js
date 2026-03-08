"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestArtifacts = ingestArtifacts;
const src_1 = require("../../summit-schemas/src");
async function ingestArtifacts(store, artifacts) {
    for (const artifact of artifacts) {
        const valid = src_1.validators.artifact(artifact);
        if (!valid) {
            const report = (0, src_1.toRejectionReport)(src_1.validators.artifact);
            throw new Error(`Artifact validation failed: ${JSON.stringify(report)}`);
        }
    }
    await store.putArtifacts(artifacts);
}
