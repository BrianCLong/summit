"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCogGeoArtifacts = writeCogGeoArtifacts;
async function writeCogGeoArtifacts(writeSet) {
    if (writeSet.writes.length === 0) {
        throw new Error("CogGeo write set must include at least one write.");
    }
}
