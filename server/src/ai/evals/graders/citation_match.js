"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citationMatch = citationMatch;
function citationMatch(actualCitations, expectedChunkIds) {
    if (actualCitations.length === 0 && expectedChunkIds.length === 0)
        return 1.0;
    if (actualCitations.length === 0)
        return 0.0;
    const matchCount = actualCitations.filter(c => expectedChunkIds.includes(c)).length;
    return matchCount / actualCitations.length; // Ratio of valid citations to total citations
}
