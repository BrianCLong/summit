"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketForResidency = bucketForResidency;
function bucketForResidency(residency) {
    const map = safeParse(process.env.CAS_BUCKETS_JSON) || {};
    const def = process.env.CAS_BUCKET_DEFAULT || Object.values(map)[0];
    if (!residency)
        return def;
    return map[residency.toUpperCase()] || def;
}
function safeParse(s) {
    try {
        return s ? JSON.parse(s) : undefined;
    }
    catch {
        return undefined;
    }
}
