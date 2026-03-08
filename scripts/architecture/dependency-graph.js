"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paths = void 0;
exports.loadServiceContexts = loadServiceContexts;
exports.buildDependencyGraph = buildDependencyGraph;
exports.toDot = toDot;
exports.toMermaid = toMermaid;
exports.buildRiskTable = buildRiskTable;
exports.summarizeBlastRadius = summarizeBlastRadius;
exports.ensureArchitectureDir = ensureArchitectureDir;
exports.renderMermaidPng = renderMermaidPng;
exports.calculateComplexityDelta = calculateComplexityDelta;
exports.loadGraphFromFile = loadGraphFromFile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const js_yaml_1 = __importDefault(require("js-yaml"));
const glob_1 = require("glob");
const serviceDirNamesToSkip = new Set(['__pycache__', '__init__.py']);
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
function findRepoRoot(startDir) {
    let current = startDir;
    while (!node_fs_1.default.existsSync(node_path_1.default.join(current, 'package.json'))) {
        const parent = node_path_1.default.dirname(current);
        if (parent === current) {
            return startDir;
        }
        current = parent;
    }
    return current;
}
const repoRoot = findRepoRoot(node_path_1.default.resolve(__dirname));
const edgeId = (edge) => `${edge.from}__${edge.to}__${edge.source}`;
function readJsonFromString(content) {
    try {
        return JSON.parse(content);
    }
    catch (error) {
        return null;
    }
}
function loadServiceContexts() {
    const servicesPath = node_path_1.default.join(repoRoot, 'services');
    if (!node_fs_1.default.existsSync(servicesPath)) {
        return [];
    }
    const entries = node_fs_1.default.readdirSync(servicesPath, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory() && !serviceDirNamesToSkip.has(entry.name))
        .map((entry) => ({
        name: entry.name,
        path: node_path_1.default.join(servicesPath, entry.name),
    }));
}
function extractComposeEdges(services, nodes) {
    const composeFiles = (0, glob_1.globSync)(node_path_1.default.join(repoRoot, 'docker-compose*.yml'));
    const edges = [];
    composeFiles.forEach((composePath) => {
        const content = node_fs_1.default.readFileSync(composePath, 'utf8');
        const doc = js_yaml_1.default.load(content);
        if (!doc?.services) {
            return;
        }
        Object.entries(doc.services).forEach(([serviceName, config]) => {
            nodes.add(serviceName);
            const dependsOn = Array.isArray(config?.depends_on)
                ? config?.depends_on
                : typeof config?.depends_on === 'object'
                    ? Object.keys(config.depends_on)
                    : [];
            dependsOn.forEach((dependency) => {
                if (serviceName !== dependency) {
                    edges.push({
                        from: serviceName,
                        to: dependency,
                        source: 'docker-compose',
                        reason: node_path_1.default.basename(composePath),
                        weight: 1,
                    });
                }
            });
        });
    });
    services.forEach(({ name }) => nodes.add(name));
    return edges;
}
function findServiceMentions(content, serviceNames) {
    const mentions = new Set();
    serviceNames.forEach((service) => {
        const pattern = new RegExp(`\\b${service.replace(/[-/]/g, '[\\-/]')}\\b`, 'i');
        if (pattern.test(content)) {
            mentions.add(service);
        }
    });
    return [...mentions];
}
function extractEnvEdges(services, nodes) {
    const edges = [];
    const serviceNames = services.map((service) => service.name);
    services.forEach((service) => {
        const envFiles = (0, glob_1.globSync)(node_path_1.default.join(service.path, '.env*'));
        envFiles.forEach((envPath) => {
            const content = node_fs_1.default.readFileSync(envPath, 'utf8');
            const mentions = findServiceMentions(content, serviceNames);
            mentions
                .filter((mention) => mention !== service.name)
                .forEach((mention) => {
                edges.push({
                    from: service.name,
                    to: mention,
                    source: 'env',
                    reason: node_path_1.default.relative(repoRoot, envPath),
                    weight: 0.5,
                });
            });
        });
    });
    services.forEach(({ name }) => nodes.add(name));
    return edges;
}
function extractImportEdges(services, nodes) {
    const edges = [];
    const serviceNames = services.map((service) => service.name);
    const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'];
    services.forEach((service) => {
        const files = (0, glob_1.globSync)(node_path_1.default.join(service.path, '**', '*.{ts,tsx,js,jsx,mjs,cjs,py}'), {
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.turbo/**', '**/.next/**', '**/__pycache__/**'],
        });
        files.forEach((filePath) => {
            const ext = node_path_1.default.extname(filePath);
            if (!fileExtensions.includes(ext)) {
                return;
            }
            const content = node_fs_1.default.readFileSync(filePath, 'utf8');
            const importRegex = /from\s+['"]([^'"]+)['"]|require\(([^)]+)\)/g;
            let match;
            const matchedServices = new Set();
            while ((match = importRegex.exec(content)) !== null) {
                const target = match[1] ?? match[2];
                if (!target) {
                    continue;
                }
                serviceNames.forEach((name) => {
                    if (name === service.name) {
                        return;
                    }
                    if (target.includes(`services/${name}`) || target.includes(`${name}/`)) {
                        matchedServices.add(name);
                    }
                });
            }
            const rawMentions = findServiceMentions(content, serviceNames);
            rawMentions
                .filter((mention) => mention !== service.name)
                .forEach((mention) => matchedServices.add(mention));
            matchedServices.forEach((mention) => {
                edges.push({
                    from: service.name,
                    to: mention,
                    source: 'imports',
                    reason: node_path_1.default.relative(repoRoot, filePath),
                    weight: 1,
                });
            });
        });
    });
    services.forEach(({ name }) => nodes.add(name));
    return edges;
}
function extractWorkflowEdges(nodes, services) {
    const workflowFiles = (0, glob_1.globSync)(node_path_1.default.join(repoRoot, '.github', 'workflows', '*.yml'));
    const serviceNames = services.map((service) => service.name);
    const edges = [];
    workflowFiles.forEach((workflowPath) => {
        const content = node_fs_1.default.readFileSync(workflowPath, 'utf8');
        const mentions = findServiceMentions(content, serviceNames);
        if (mentions.length < 2) {
            return;
        }
        mentions.forEach((from) => {
            mentions.forEach((to) => {
                if (from !== to) {
                    edges.push({
                        from,
                        to,
                        source: 'ci-workflow',
                        reason: node_path_1.default.relative(repoRoot, workflowPath),
                        weight: 0.75,
                    });
                }
            });
        });
    });
    services.forEach(({ name }) => nodes.add(name));
    return edges;
}
function extractPipelineEdges(nodes, services) {
    const serviceNames = services.map((service) => service.name);
    const pipelines = (0, glob_1.globSync)(node_path_1.default.join(repoRoot, '**', '*pipeline*.{yml,yaml,json}'), {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.turbo/**', '**/.next/**', '**/venv/**'],
    });
    const edges = [];
    pipelines.forEach((pipelinePath) => {
        const content = node_fs_1.default.readFileSync(pipelinePath, 'utf8');
        const mentions = findServiceMentions(content, serviceNames);
        let structured = null;
        try {
            structured = pipelinePath.endsWith('.json') ? readJsonFromString(content) : js_yaml_1.default.load(content);
        }
        catch (error) {
            const docs = js_yaml_1.default.loadAll(content);
            structured = docs[0] ?? null;
            console.warn(`YAML parse issue in ${pipelinePath}: ${error.message}`);
        }
        const stageMentions = new Set(mentions);
        if (structured && typeof structured === 'object') {
            const structuredString = JSON.stringify(structured);
            findServiceMentions(structuredString, serviceNames).forEach((mention) => stageMentions.add(mention));
        }
        const mentionedServices = [...stageMentions];
        if (mentionedServices.length < 2) {
            return;
        }
        mentionedServices.forEach((from) => {
            mentionedServices.forEach((to) => {
                if (from !== to) {
                    edges.push({
                        from,
                        to,
                        source: 'llm-pipeline',
                        reason: node_path_1.default.relative(repoRoot, pipelinePath),
                        weight: 0.9,
                    });
                }
            });
        });
    });
    services.forEach(({ name }) => nodes.add(name));
    return edges;
}
function buildDependencyGraph() {
    const nodes = new Set();
    const services = loadServiceContexts();
    const sources = [
        extractComposeEdges(services, nodes),
        extractEnvEdges(services, nodes),
        extractImportEdges(services, nodes),
        extractWorkflowEdges(nodes, services),
        extractPipelineEdges(nodes, services),
    ];
    const deduped = new Map();
    sources.flat().forEach((edge) => {
        const id = edgeId(edge);
        if (!deduped.has(id)) {
            deduped.set(id, edge);
        }
    });
    const edges = [...deduped.values()];
    const complexity = edges.reduce((total, edge) => total + edge.weight, 0);
    return { nodes: [...nodes].sort(), edges, complexity };
}
function toDot(graph) {
    const lines = ['digraph dependencies {', '  rankdir=LR;'];
    graph.edges.forEach((edge) => {
        const label = `${edge.source}: ${edge.reason}`.replace(/"/g, '\\"');
        lines.push(`  "${edge.from}" -> "${edge.to}" [label="${label}", weight=${edge.weight.toFixed(2)}];`);
    });
    lines.push('}');
    return lines.join('\n');
}
function toMermaid(graph) {
    const lines = ['graph TD'];
    graph.edges.forEach((edge) => {
        const label = `${edge.source}`;
        lines.push(`  ${edge.from.replace(/[-\s]/g, '_')} -->|${label}| ${edge.to.replace(/[-\s]/g, '_')}`);
    });
    return lines.join('\n');
}
function buildRiskTable(graph) {
    const inboundCount = new Map();
    const outboundCount = new Map();
    const criticalDeps = new Map();
    graph.nodes.forEach((node) => {
        inboundCount.set(node, 0);
        outboundCount.set(node, 0);
        criticalDeps.set(node, new Set());
    });
    graph.edges.forEach((edge) => {
        outboundCount.set(edge.from, (outboundCount.get(edge.from) ?? 0) + 1);
        inboundCount.set(edge.to, (inboundCount.get(edge.to) ?? 0) + 1);
        if (edge.weight >= 1) {
            criticalDeps.get(edge.from)?.add(edge.to);
        }
    });
    const table = graph.nodes.map((service) => {
        const inbound = inboundCount.get(service) ?? 0;
        const outbound = outboundCount.get(service) ?? 0;
        const riskScore = inbound * 2 + outbound + (criticalDeps.get(service)?.size ?? 0);
        const dependencies = [...(criticalDeps.get(service) ?? [])].sort();
        return { service, inbound, outbound, riskScore, criticalDependencies: dependencies };
    });
    return table.sort((a, b) => b.riskScore - a.riskScore || b.inbound - a.inbound);
}
function summarizeBlastRadius(graph, failedService) {
    const adjacency = new Map();
    graph.edges.forEach((edge) => {
        const dependents = adjacency.get(edge.to) ?? new Set();
        dependents.add(edge.from);
        adjacency.set(edge.to, dependents);
    });
    const visited = new Set();
    const queue = [];
    queue.push({ service: failedService, distance: 0 });
    visited.add(failedService);
    const degraded = [];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }
        const dependents = adjacency.get(current.service);
        dependents?.forEach((dependent) => {
            if (!visited.has(dependent)) {
                visited.add(dependent);
                const distance = current.distance + 1;
                degraded.push({ service: dependent, distance });
                queue.push({ service: dependent, distance });
            }
        });
    }
    const cascadeRisk = degraded.reduce((score, item) => score + Math.max(1, 3 - item.distance), 0);
    return {
        degraded: degraded.sort((a, b) => a.distance - b.distance || a.service.localeCompare(b.service)),
        cascadeRisk,
    };
}
function ensureArchitectureDir() {
    const outputDir = node_path_1.default.join(repoRoot, 'docs', 'architecture');
    if (!node_fs_1.default.existsSync(outputDir)) {
        node_fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    return outputDir;
}
async function renderMermaidPng(diagram, outputPath) {
    const encoded = Buffer.from(diagram).toString('base64');
    const url = `https://mermaid.ink/img/${encoded}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to render diagram via mermaid.ink: ${response.status} ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await node_fs_1.default.promises.writeFile(outputPath, buffer);
    }
    catch (error) {
        const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgobqt/8AAAAASUVORK5CYII=', 'base64');
        await node_fs_1.default.promises.writeFile(outputPath, placeholder);
        console.warn(`Mermaid render failed (${error.message}). Wrote placeholder PNG to ${outputPath}.`);
    }
}
function calculateComplexityDelta(current, baseline) {
    const baselineValue = baseline?.complexity ?? 0;
    return {
        current: current.complexity,
        baseline: baselineValue,
        delta: current.complexity - baselineValue,
    };
}
function loadGraphFromFile(jsonPath) {
    if (!node_fs_1.default.existsSync(jsonPath)) {
        return null;
    }
    const content = node_fs_1.default.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(content);
    return parsed;
}
exports.paths = {
    repoRoot,
    outputDir: node_path_1.default.join(repoRoot, 'docs', 'architecture'),
    dependencyGraphJson: node_path_1.default.join(repoRoot, 'docs', 'architecture', 'dependency-graph.json'),
    dependencyGraphDot: node_path_1.default.join(repoRoot, 'docs', 'architecture', 'dependency-graph.dot'),
    dependencyGraphPng: node_path_1.default.join(repoRoot, 'docs', 'architecture', 'dependency-graph.png'),
    blastRadiusPng: node_path_1.default.join(repoRoot, 'docs', 'architecture', 'blast-radius.png'),
    dependencyRiskTable: node_path_1.default.join(repoRoot, 'docs', 'architecture', 'dependency-risk-table.md'),
};
