"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBucket = pickBucket;
function pickBucket(override) {
    if (override)
        return override;
    const map = safeParse(process.env.CAS_BUCKETS_JSON) || {};
    const def = process.env.CAS_BUCKET_DEFAULT || Object.values(map)[0];
    const res = (process.env.SITE_RESIDENCY || '').toUpperCase();
    return res && map[res] ? map[res] : def;
}
function safeParse(s) {
    try {
        return s ? JSON.parse(s) : undefined;
    }
    catch {
        return undefined;
    }
}
