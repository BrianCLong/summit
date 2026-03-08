"use strict";
// packages/intelgraph-server/src/provenance/lineageEmitter.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLineageGraph = createLineageGraph;
exports.computeIntegrity = computeIntegrity;
exports.writeLineageJson = writeLineageJson;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function createLineageGraph(params) {
    const { commit, attestation, sbom, artifacts, deployments } = params;
    const nodes = [
        commit,
        attestation,
        sbom,
        ...artifacts,
        ...deployments,
    ];
    const edges = [
        {
            id: `commit-attests-${attestation.id}`,
            from: commit.id,
            to: attestation.id,
            type: "attests",
        },
        {
            id: `commit-sbom-${sbom.id}`,
            from: commit.id,
            to: sbom.id,
            type: "contains",
        },
        ...artifacts.map((artifact) => ({
            id: `commit-produces-${artifact.id}`,
            from: commit.id,
            to: artifact.id,
            type: "produces",
        })),
        ...deployments.map((deployment) => ({
            id: `artifact-deploys-${deployment.id}`,
            from: commit.id,
            to: deployment.id,
            type: "deploys",
        })),
    ];
    return { nodes, edges };
}
function computeIntegrity(graph) {
    const hasFullProvenance = graph.nodes.length > 0 && graph.edges.length > 0;
    // For now, treat edges as valid if they reference existing nodes.
    const ids = new Set(graph.nodes.map((n) => n.id));
    const edgesValid = graph.edges.every((e) => ids.has(e.from) && ids.has(e.to));
    // You can extend this with more detailed acyclicity / reachability checks.
    const noGaps = hasFullProvenance && edgesValid;
    return {
        has_full_provenance: hasFullProvenance,
        edges_valid: edgesValid,
        no_gaps: noGaps,
    };
}
function writeLineageJson(graph, outputDir = process.cwd()) {
    const integrity = computeIntegrity(graph);
    const out = {
        graph,
        integrity,
    };
    const outPath = (0, node_path_1.join)(outputDir, "lineage.json");
    (0, node_fs_1.writeFileSync)(outPath, JSON.stringify({ lineage: integrity }, null, 2), "utf-8");
    return outPath;
}
