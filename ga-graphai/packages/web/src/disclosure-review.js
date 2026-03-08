"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LICENSE_OPTIONS = void 0;
exports.estimateBundleCost = estimateBundleCost;
exports.buildDisclosureReview = buildDisclosureReview;
exports.diffArtifacts = diffArtifacts;
exports.LICENSE_OPTIONS = [
    { id: 'CC-BY-4.0', name: 'Creative Commons BY 4.0' },
    { id: 'CC-BY-SA-4.0', name: 'Creative Commons BY-SA 4.0' },
    { id: 'PROPRIETARY', name: 'Proprietary / Restricted' },
];
function estimateBundleCost(totalBytes, options = {}) {
    const usdPerMb = options.usdPerMb ?? 0.02;
    const estimatedSizeMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const estimatedCostUsd = Number((estimatedSizeMb * usdPerMb).toFixed(2));
    return { estimatedSizeMb, estimatedCostUsd };
}
function buildDisclosureReview(manifest, totalBytes) {
    const artifacts = [
        ...manifest.documents.map((doc) => ({
            id: doc.id,
            path: doc.path,
            role: doc.role ?? 'document',
        })),
        ...(manifest.exhibits ?? []).map((exhibit) => ({
            id: exhibit.id,
            path: exhibit.path,
            role: exhibit.role ?? 'exhibit',
        })),
        ...(manifest.evidence ?? []).map((evidence) => ({
            id: evidence.id,
            path: evidence.path,
            role: evidence.role ?? 'evidence',
        })),
    ];
    const redactionFields = Array.from(new Set((manifest.disclosure?.redactions ?? []).map((redaction) => redaction.field)));
    const { estimatedSizeMb, estimatedCostUsd } = estimateBundleCost(totalBytes);
    return {
        licenseId: manifest.disclosure?.license?.id,
        audiencePolicyId: manifest.disclosure?.audience?.policyId,
        artifacts,
        redactionCount: manifest.disclosure?.redactions?.length ?? 0,
        redactedFields: redactionFields,
        estimatedSizeMb,
        estimatedCostUsd,
    };
}
function diffArtifacts(previous, current) {
    const previousIds = new Set(previous.map((artifact) => artifact.id));
    const currentIds = new Set(current.map((artifact) => artifact.id));
    return {
        added: current.filter((artifact) => !previousIds.has(artifact.id)),
        removed: previous.filter((artifact) => !currentIds.has(artifact.id)),
        unchanged: current.filter((artifact) => previousIds.has(artifact.id)),
    };
}
