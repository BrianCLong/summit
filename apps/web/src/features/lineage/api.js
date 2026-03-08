"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLineageGraph = fetchLineageGraph;
async function fetchLineageGraph(entityId) {
    const response = await fetch(`/api/lineage/${entityId}`);
    if (!response.ok) {
        throw new Error(`Unable to fetch lineage for ${entityId}`);
    }
    const payload = (await response.json());
    return payload;
}
