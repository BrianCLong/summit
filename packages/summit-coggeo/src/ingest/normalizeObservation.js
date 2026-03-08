"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeObservation = normalizeObservation;
function normalizeObservation(input) {
    return {
        ...input,
        content: input.content.trim(),
        source: input.source.trim().toLowerCase(),
    };
}
