"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overlaps = overlaps;
exports.isConsistent = isConsistent;
exports.buildValidTimePredicate = buildValidTimePredicate;
function overlaps(a, b) {
    return a.validFrom < b.validTo && b.validFrom < a.validTo;
}
function isConsistent(existing, candidate) {
    return !existing.some((i) => overlaps(i, candidate));
}
function buildValidTimePredicate(instant) {
    const iso = instant.toISOString();
    return `valid_from <= datetime(\"${iso}\") AND valid_to > datetime(\"${iso}\")`;
}
