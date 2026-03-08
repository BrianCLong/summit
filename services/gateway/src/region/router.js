"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickHub = pickHub;
function safeParse(s) {
    try {
        return s ? JSON.parse(s) : undefined;
    }
    catch {
        return undefined;
    }
}
const PEERS = safeParse(process.env.REGION_PEERS_JSON) || {};
function pickHub(req) {
    const home = (req.prefer ||
        req.residency ||
        process.env.REGION_ID ||
        'US');
    return { home, url: PEERS[home] || process.env.HUB_URL };
}
