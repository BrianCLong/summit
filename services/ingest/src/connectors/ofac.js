"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOFAC = loadOFAC;
exports.toCanonical = toCanonical;
// services/ingest/src/connectors/ofac.ts
async function loadOFAC() {
    return [{ name: "ACME LTD", country: "IR" }];
}
function toCanonical(rec) {
    return {
        entity: "Org",
        name: rec.name,
        labels: ["sanctioned"],
        license: ["OFAC"],
        retentionDays: 3650
    };
}
