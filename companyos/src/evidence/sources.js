"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSloSnapshot = readSloSnapshot;
exports.readUnitCosts = readUnitCosts;
async function readSloSnapshot(service) {
    // TODO replace with metrics scrape; stubbed
    return { service, p95Ms: 320, p99Ms: 800, errorRate: 0.01, window: '15m' };
}
async function readUnitCosts() {
    // TODO compute from usage + billing; stubbed
    return { graphqlPerMillionUsd: 1.8, ingestPerThousandUsd: 0.08 };
}
