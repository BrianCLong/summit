"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dependency_graph_js_1 = require("./architecture/dependency-graph.js");
function writeRiskTableMarkdown(tablePath, table) {
    const lines = ['| Service | Inbound | Outbound | Risk Score | Critical Dependencies |', '| --- | ---: | ---: | ---: | --- |'];
    table.forEach((row) => {
        lines.push(`| ${row.service} | ${row.inbound} | ${row.outbound} | ${row.riskScore} | ${row.criticalDependencies.join(', ') ||
            '—'} |`);
    });
    node_fs_1.default.writeFileSync(tablePath, `${lines.join('\n')}\n`);
}
async function main() {
    const graph = (0, dependency_graph_js_1.buildDependencyGraph)();
    (0, dependency_graph_js_1.ensureArchitectureDir)();
    const dot = (0, dependency_graph_js_1.toDot)(graph);
    const mermaid = (0, dependency_graph_js_1.toMermaid)(graph);
    const riskTable = (0, dependency_graph_js_1.buildRiskTable)(graph);
    node_fs_1.default.writeFileSync(dependency_graph_js_1.paths.dependencyGraphJson, `${JSON.stringify(graph, null, 2)}\n`);
    node_fs_1.default.writeFileSync(dependency_graph_js_1.paths.dependencyGraphDot, `${dot}\n`);
    writeRiskTableMarkdown(dependency_graph_js_1.paths.dependencyRiskTable, riskTable);
    await (0, dependency_graph_js_1.renderMermaidPng)(mermaid, dependency_graph_js_1.paths.dependencyGraphPng);
    console.log('Dependency graph generated');
    console.log(`Nodes: ${graph.nodes.length}`);
    console.log(`Edges: ${graph.edges.length}`);
    console.log(`Complexity: ${graph.complexity.toFixed(2)}`);
    console.log(`DOT: ${node_path_1.default.relative(process.cwd(), dependency_graph_js_1.paths.dependencyGraphDot)}`);
    console.log(`JSON: ${node_path_1.default.relative(process.cwd(), dependency_graph_js_1.paths.dependencyGraphJson)}`);
    console.log(`PNG: ${node_path_1.default.relative(process.cwd(), dependency_graph_js_1.paths.dependencyGraphPng)}`);
    console.log(`Risk table: ${node_path_1.default.relative(process.cwd(), dependency_graph_js_1.paths.dependencyRiskTable)}`);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
