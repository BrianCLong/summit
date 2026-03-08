"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePersianPost = normalizePersianPost;
function stableId(source, externalId) {
    return `CLAIM:${source}:${externalId}`;
}
function normalizePersianPost(raw) {
    return {
        id: stableId(raw.source, raw.externalId),
        stance: "neutral", // To be inferred
        emotionalTone: "neutral", // To be inferred
        text: raw.textNormalized,
        evidenceIds: [raw.evidenceId],
    };
}
