"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverWorkspacePackages = discoverWorkspacePackages;
exports.buildDependencyGraph = buildDependencyGraph;
exports.detectCircularDependencies = detectCircularDependencies;
exports.enforceAcyclicDependencies = enforceAcyclicDependencies;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readJson(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}
function discoverWorkspacePackages(rootDir) {
    const packagesDir = path_1.default.join(rootDir, 'packages');
    const entries = fs_1.default.readdirSync(packagesDir, { withFileTypes: true });
    const packages = new Map();
    entries.forEach((entry) => {
        if (!entry.isDirectory())
            return;
        const packageJsonPath = path_1.default.join(packagesDir, entry.name, 'package.json');
        if (!fs_1.default.existsSync(packageJsonPath))
            return;
        const pkg = readJson(packageJsonPath);
        if (pkg?.name) {
            packages.set(pkg.name, path_1.default.join(packagesDir, entry.name));
        }
    });
    return packages;
}
function buildDependencyGraph(packageRoots) {
    const edges = [];
    const nodes = new Set(packageRoots.keys());
    packageRoots.forEach((pkgPath, pkgName) => {
        const pkgJsonPath = path_1.default.join(pkgPath, 'package.json');
        const pkg = readJson(pkgJsonPath);
        const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
        Object.keys(deps || {}).forEach((dep) => {
            if (packageRoots.has(dep)) {
                edges.push({ from: pkgName, to: dep });
            }
        });
    });
    return { nodes, edges };
}
function detectCircularDependencies(graph) {
    const visited = new Set();
    const stack = new Set();
    const cycles = [];
    function dfs(node, pathSoFar) {
        visited.add(node);
        stack.add(node);
        pathSoFar.push(node);
        graph.edges
            .filter((edge) => edge.from === node)
            .forEach((edge) => {
            if (!visited.has(edge.to)) {
                dfs(edge.to, pathSoFar.slice());
            }
            else if (stack.has(edge.to)) {
                const cycleStart = pathSoFar.indexOf(edge.to);
                const cycle = pathSoFar.slice(cycleStart);
                cycles.push([...cycle, edge.to]);
            }
        });
        stack.delete(node);
    }
    graph.nodes.forEach((node) => {
        if (!visited.has(node)) {
            dfs(node, []);
        }
    });
    return { hasCycles: cycles.length > 0, cycles };
}
function enforceAcyclicDependencies(rootDir) {
    const packages = discoverWorkspacePackages(rootDir);
    const graph = buildDependencyGraph(packages);
    const cycleReport = detectCircularDependencies(graph);
    return { compliant: !cycleReport.hasCycles, cycles: cycleReport.cycles };
}
