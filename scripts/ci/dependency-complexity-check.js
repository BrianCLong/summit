"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const dependency_graph_js_1 = require("../architecture/dependency-graph.js");
const threshold = Number(process.env.DEPENDENCY_COMPLEXITY_THRESHOLD ?? '5');
function loadBaselineGraph() {
    const relativePath = node_path_1.default.relative(dependency_graph_js_1.paths.repoRoot, dependency_graph_js_1.paths.dependencyGraphJson);
    try {
        const content = (0, node_child_process_1.execSync)(`git show origin/main:${relativePath}`, {
            cwd: dependency_graph_js_1.paths.repoRoot,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).toString();
        return JSON.parse(content);
    }
    catch (error) {
        return (0, dependency_graph_js_1.loadGraphFromFile)(dependency_graph_js_1.paths.dependencyGraphJson);
    }
}
function ensureCurrentGraph() {
    if (node_fs_1.default.existsSync(dependency_graph_js_1.paths.dependencyGraphJson)) {
        return;
    }
    (0, dependency_graph_js_1.ensureArchitectureDir)();
    const graph = (0, dependency_graph_js_1.buildDependencyGraph)();
    node_fs_1.default.writeFileSync(dependency_graph_js_1.paths.dependencyGraphJson, `${JSON.stringify(graph, null, 2)}\n`);
}
function main() {
    ensureCurrentGraph();
    const currentGraph = (0, dependency_graph_js_1.loadGraphFromFile)(dependency_graph_js_1.paths.dependencyGraphJson) ?? (0, dependency_graph_js_1.buildDependencyGraph)();
    const baselineGraph = loadBaselineGraph() ?? undefined;
    const delta = (0, dependency_graph_js_1.calculateComplexityDelta)(currentGraph, baselineGraph);
    const summary = `Current: ${delta.current.toFixed(2)}, Baseline: ${delta.baseline.toFixed(2)}, Delta: ${delta.delta.toFixed(2)}`;
    console.log(summary);
    if (delta.delta > threshold) {
        console.error(`Dependency complexity increased by ${delta.delta.toFixed(2)} (> ${threshold}). Architecture review required.`);
        process.exit(1);
    }
    console.log('Dependency complexity within threshold.');
}
main();
