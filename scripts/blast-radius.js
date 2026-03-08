"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dependency_graph_js_1 = require("./architecture/dependency-graph.js");
function renderBlastRadiusMermaid(failedService, degraded) {
    const lines = ['graph TD'];
    lines.push(`  ${failedService.replace(/[-\s]/g, '_')}([${failedService} failure])`);
    degraded.forEach((entry) => {
        const nodeId = entry.service.replace(/[-\s]/g, '_');
        lines.push(`  ${failedService.replace(/[-\s]/g, '_')} -->|+${entry.distance} hop(s)| ${nodeId}`);
    });
    return lines.join('\n');
}
async function main() {
    const service = process.argv[2];
    if (!service) {
        console.error('Usage: node --loader ts-node/esm scripts/blast-radius.ts <service-name>');
        process.exit(1);
    }
    const graph = (0, dependency_graph_js_1.buildDependencyGraph)();
    if (!graph.nodes.includes(service)) {
        console.error(`Service ${service} not found in dependency graph.`);
        process.exit(1);
    }
    const summary = (0, dependency_graph_js_1.summarizeBlastRadius)(graph, service);
    (0, dependency_graph_js_1.ensureArchitectureDir)();
    const mermaid = renderBlastRadiusMermaid(service, summary.degraded);
    await (0, dependency_graph_js_1.renderMermaidPng)(mermaid, dependency_graph_js_1.paths.blastRadiusPng);
    const degradedPreview = summary.degraded.slice(0, 20);
    const previewLine = degradedPreview
        .map((entry) => `${entry.service} (hops=${entry.distance})`)
        .join(', ');
    const report = [
        `Blast radius for ${service}`,
        `Degraded services (${summary.degraded.length}): ${previewLine || 'none'}`,
        summary.degraded.length > degradedPreview.length ? `…and ${summary.degraded.length - degradedPreview.length} more` : '',
        `Cascade risk score: ${summary.cascadeRisk.toFixed(2)}`,
        `Visualization: ${node_path_1.default.relative(process.cwd(), dependency_graph_js_1.paths.blastRadiusPng)}`,
    ].filter(Boolean);
    node_fs_1.default.writeFileSync(node_path_1.default.join(dependency_graph_js_1.paths.outputDir, 'blast-radius-report.txt'), `${report.join('\n')}\n`);
    console.log(report.join('\n'));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
