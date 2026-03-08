#!/usr/bin/env npx ts-node
"use strict";
/**
 * Living System Map Generator
 *
 * Generates a visual system map from:
 * - Docker Compose files (services)
 * - pnpm workspace packages
 * - Package dependencies
 * - CI workflow definitions
 *
 * Output formats:
 * - system-map.json (structured data)
 * - system-map.dot (Graphviz DOT format)
 *
 * Usage:
 *   npx ts-node scripts/architecture/generate-system-map.ts
 *   pnpm system-map:generate
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
// ESM compatibility
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
// Configuration
const ROOT_DIR = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs/architecture');
const COMPOSE_FILES = ['docker-compose.dev.yml', 'docker-compose.ai.yml'];
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
/**
 * Parse YAML-like content (simple parser for compose/workspace files)
 */
function parseSimpleYaml(content) {
    const result = {};
    const lines = content.split('\n');
    const stack = [
        { indent: -1, obj: result },
    ];
    for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '')
            continue;
        const match = line.match(/^(\s*)([^:\s]+):\s*(.*)$/);
        if (!match)
            continue;
        const indent = match[1].length;
        const key = match[2];
        let value = match[3].trim();
        // Pop stack until we find parent
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        const parent = stack[stack.length - 1].obj;
        if (value === '' || value.startsWith("'") || value.startsWith('"')) {
            // Nested object or string value
            if (value) {
                value = value.replace(/^['"]|['"]$/g, '');
                parent[key] = value;
            }
            else {
                parent[key] = {};
                stack.push({ indent, obj: parent[key], key });
            }
        }
        else if (value.startsWith('[')) {
            // Array value
            try {
                parent[key] = JSON.parse(value.replace(/'/g, '"'));
            }
            catch {
                parent[key] = value;
            }
        }
        else if (value.startsWith('-')) {
            // List item
            if (!Array.isArray(parent[key])) {
                parent[key] = [];
            }
            parent[key].push(value.substring(1).trim());
        }
        else {
            parent[key] = value;
        }
    }
    return result;
}
/**
 * Parse Docker Compose file and extract services
 */
function parseDockerCompose(filepath) {
    const services = [];
    if (!fs.existsSync(filepath)) {
        console.log(`Skipping: ${filepath} (not found)`);
        return services;
    }
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    let currentService = null;
    let inServices = false;
    const serviceData = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Track services section
        if (trimmed === 'services:') {
            inServices = true;
            continue;
        }
        if (inServices) {
            // Check for volume/network sections (end of services)
            if (/^(volumes|networks):/.test(trimmed) && !line.startsWith(' ')) {
                inServices = false;
                continue;
            }
            // Check for service definition (exactly 2 spaces, then a word ending with colon)
            // Match lines like "  postgres:" or "  api:"
            if (/^  [a-zA-Z][\w-]*:\s*$/.test(line)) {
                currentService = trimmed.replace(':', '');
                serviceData[currentService] = { ports: [], depends_on: [] };
                continue;
            }
            if (currentService && line.startsWith('    ')) {
                // Parse service properties
                if (trimmed.startsWith('image:')) {
                    serviceData[currentService].image = trimmed.replace(/^image:\s*/, '');
                }
                else if (trimmed.startsWith('build:')) {
                    serviceData[currentService].build = trimmed.replace(/^build:\s*/, '');
                }
                else if (trimmed.startsWith("- '") && trimmed.includes(':')) {
                    // Port mapping like - '5432:5432'
                    const portMatch = trimmed.match(/- '(\d+):\d+'/);
                    if (portMatch) {
                        serviceData[currentService].ports.push(portMatch[1]);
                    }
                }
                else if (trimmed === 'depends_on:') {
                    // Read the next lines for dependencies
                    let j = i + 1;
                    while (j < lines.length) {
                        const depLine = lines[j];
                        const depTrimmed = depLine.trim();
                        // Check if still in depends_on section (more indented than depends_on:)
                        if (!depLine.startsWith('      '))
                            break;
                        // Match dependency names like "postgres:" or "- postgres"
                        const depMatch = depTrimmed.match(/^(\w[\w-]*):/);
                        if (depMatch) {
                            serviceData[currentService].depends_on.push(depMatch[1]);
                        }
                        j++;
                    }
                }
            }
        }
    }
    // Convert to Service objects
    for (const [name, data] of Object.entries(serviceData)) {
        const category = categorizeService(name, data.image || data.build || '');
        services.push({
            name,
            type: 'docker',
            category,
            port: data.ports.length > 0 ? parseInt(data.ports[0], 10) : undefined,
            dependencies: data.depends_on,
            dependents: [],
            metadata: {
                image: data.image,
                build: data.build,
                source: path.basename(filepath),
            },
        });
    }
    return services;
}
/**
 * Categorize a service based on name and image
 */
function categorizeService(name, imageOrBuild) {
    const lower = name.toLowerCase();
    const img = imageOrBuild.toLowerCase();
    if (lower.includes('postgres') || img.includes('postgres'))
        return 'database';
    if (lower.includes('neo4j') || img.includes('neo4j'))
        return 'database';
    if (lower.includes('redis') || img.includes('redis'))
        return 'cache';
    if (lower.includes('elasticsearch') || img.includes('elasticsearch'))
        return 'search';
    if (lower.includes('kafka') || img.includes('kafka'))
        return 'messaging';
    if (lower.includes('prometheus') || lower.includes('grafana') || lower.includes('jaeger'))
        return 'observability';
    if (lower.includes('loki') || lower.includes('alertmanager'))
        return 'observability';
    if (lower.includes('ai') || lower.includes('copilot') || lower.includes('ml'))
        return 'ai';
    if (lower.includes('api') || lower.includes('gateway'))
        return 'api';
    if (lower.includes('web') || lower.includes('client'))
        return 'frontend';
    if (lower.includes('websocket'))
        return 'realtime';
    return 'service';
}
/**
 * Parse pnpm workspace and find packages
 */
function parseWorkspacePackages() {
    const services = [];
    const workspaceFile = path.join(ROOT_DIR, WORKSPACE_FILE);
    if (!fs.existsSync(workspaceFile)) {
        console.log('No pnpm-workspace.yaml found');
        return services;
    }
    const content = fs.readFileSync(workspaceFile, 'utf-8');
    // Extract package patterns
    const patterns = [];
    const lines = content.split('\n');
    let inPackages = false;
    for (const line of lines) {
        if (line.trim() === 'packages:') {
            inPackages = true;
            continue;
        }
        if (inPackages && line.trim().startsWith('-')) {
            const pattern = line.trim().replace(/^-\s*['"]?|['"]?$/g, '');
            if (!pattern.startsWith('#')) {
                patterns.push(pattern);
            }
        }
        if (inPackages && !line.trim().startsWith('-') && line.trim() !== '') {
            inPackages = false;
        }
    }
    // Expand patterns and find packages
    for (const pattern of patterns) {
        const basePath = pattern.replace('/*', '').replace('/**', '');
        const fullPath = path.join(ROOT_DIR, basePath);
        if (!fs.existsSync(fullPath))
            continue;
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const pkgJsonPath = path.join(fullPath, entry.name, 'package.json');
            if (!fs.existsSync(pkgJsonPath))
                continue;
            try {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                const deps = [
                    ...Object.keys(pkgJson.dependencies || {}),
                    ...Object.keys(pkgJson.devDependencies || {}),
                ].filter((d) => d.startsWith('@intelgraph') || d.startsWith('@summit'));
                const category = categorizePackage(basePath, entry.name, pkgJson);
                services.push({
                    name: pkgJson.name || `${basePath}/${entry.name}`,
                    type: basePath === 'apps' ? 'app' : 'package',
                    category,
                    description: pkgJson.description,
                    dependencies: deps,
                    dependents: [],
                    metadata: {
                        path: `${basePath}/${entry.name}`,
                        version: pkgJson.version,
                    },
                });
            }
            catch {
                // Skip invalid package.json
            }
        }
    }
    return services;
}
/**
 * Categorize a package
 */
function categorizePackage(basePath, name, pkgJson) {
    const lower = name.toLowerCase();
    if (basePath === 'apps') {
        if (lower.includes('web') || lower.includes('client'))
            return 'frontend';
        if (lower.includes('api') || lower.includes('server'))
            return 'api';
        if (lower.includes('gateway'))
            return 'api';
        return 'app';
    }
    if (basePath === 'services') {
        if (lower.includes('graph') || lower.includes('neo4j'))
            return 'graph';
        if (lower.includes('ai') || lower.includes('copilot') || lower.includes('ml'))
            return 'ai';
        if (lower.includes('auth') || lower.includes('policy'))
            return 'security';
        return 'service';
    }
    if (basePath === 'packages') {
        if (lower.includes('ui') || lower.includes('component'))
            return 'ui';
        if (lower.includes('types') || lower.includes('schema'))
            return 'types';
        if (lower.includes('db') || lower.includes('data'))
            return 'data';
        return 'library';
    }
    return 'other';
}
/**
 * Parse CI workflows
 */
function parseWorkflows() {
    const services = [];
    const workflowDir = path.join(ROOT_DIR, '.github/workflows');
    if (!fs.existsSync(workflowDir)) {
        console.log('No .github/workflows directory found');
        return services;
    }
    const files = fs.readdirSync(workflowDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    for (const file of files) {
        const filepath = path.join(workflowDir, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        // Extract workflow name
        const nameMatch = content.match(/^name:\s*['"]?(.+?)['"]?\s*$/m);
        const name = nameMatch ? nameMatch[1] : file.replace(/\.(yml|yaml)$/, '');
        // Extract triggers
        const triggers = [];
        const onMatch = content.match(/^on:\s*$/m);
        if (onMatch) {
            const triggerMatches = content.match(/^\s{2}(push|pull_request|schedule|workflow_dispatch):/gm);
            if (triggerMatches) {
                triggers.push(...triggerMatches.map((t) => t.trim().replace(':', '')));
            }
        }
        services.push({
            name: `workflow:${file.replace(/\.(yml|yaml)$/, '')}`,
            type: 'workflow',
            category: 'ci',
            description: name,
            dependencies: [],
            dependents: [],
            metadata: {
                file,
                triggers,
            },
        });
    }
    return services;
}
/**
 * Generate DOT format for Graphviz
 */
function generateDotFormat(map) {
    const lines = [
        'digraph SystemMap {',
        '  rankdir=TB;',
        '  node [shape=box, style=filled];',
        '  graph [compound=true, splines=ortho];',
        '',
    ];
    // Define color scheme for categories
    const colors = {
        database: '#4A90D9',
        cache: '#7B68EE',
        search: '#48D1CC',
        messaging: '#FF6B6B',
        observability: '#FFA500',
        ai: '#9370DB',
        api: '#32CD32',
        frontend: '#FF69B4',
        realtime: '#20B2AA',
        service: '#778899',
        graph: '#4A90D9',
        security: '#DC143C',
        library: '#A9A9A9',
        types: '#D3D3D3',
        data: '#87CEEB',
        ui: '#FFB6C1',
        ci: '#F0E68C',
        app: '#98FB98',
        other: '#DCDCDC',
    };
    // Group services by category using subgraphs
    const byCategory = {};
    for (const service of Object.values(map.services)) {
        if (!byCategory[service.category]) {
            byCategory[service.category] = [];
        }
        byCategory[service.category].push(service);
    }
    // Create subgraphs for categories
    for (const [category, services] of Object.entries(byCategory)) {
        const color = colors[category] || colors.other;
        lines.push(`  subgraph cluster_${category} {`);
        lines.push(`    label="${category.toUpperCase()}";`);
        lines.push(`    style=filled;`);
        lines.push(`    fillcolor="${color}20";`);
        lines.push(`    color="${color}";`);
        lines.push('');
        for (const service of services) {
            const nodeId = service.name.replace(/[^a-zA-Z0-9]/g, '_');
            const label = service.name.replace(/^(workflow:|@intelgraph\/|@summit\/)/, '');
            const tooltip = service.description || service.name;
            lines.push(`    ${nodeId} [label="${label}", fillcolor="${color}", tooltip="${tooltip}"];`);
        }
        lines.push('  }');
        lines.push('');
    }
    // Add edges
    lines.push('  // Dependencies');
    for (const edge of map.edges) {
        const fromId = edge.from.replace(/[^a-zA-Z0-9]/g, '_');
        const toId = edge.to.replace(/[^a-zA-Z0-9]/g, '_');
        const style = edge.type === 'depends_on' ? 'solid' : edge.type === 'imports' ? 'dashed' : 'dotted';
        lines.push(`  ${fromId} -> ${toId} [style=${style}];`);
    }
    lines.push('}');
    return lines.join('\n');
}
/**
 * Main function
 */
async function main() {
    console.log('Generating Living System Map...\n');
    const allServices = [];
    const edges = [];
    // Parse Docker Compose files
    console.log('Parsing Docker Compose files...');
    for (const composeFile of COMPOSE_FILES) {
        const filepath = path.join(ROOT_DIR, composeFile);
        const services = parseDockerCompose(filepath);
        console.log(`  Found ${services.length} services in ${composeFile}`);
        allServices.push(...services);
    }
    // Parse workspace packages (limit to avoid overwhelming the graph)
    console.log('\nParsing workspace packages...');
    const packages = parseWorkspacePackages();
    console.log(`  Found ${packages.length} packages`);
    // Only include key packages to keep graph manageable
    const keyPackages = packages.filter((p) => {
        const path = p.metadata.path || '';
        return (path.startsWith('apps/') ||
            path.startsWith('services/') ||
            (path.startsWith('packages/') && (p.dependencies.length > 0 || p.name.includes('core'))));
    });
    console.log(`  Included ${keyPackages.length} key packages`);
    allServices.push(...keyPackages.slice(0, 50)); // Limit to avoid huge graphs
    // Parse CI workflows
    console.log('\nParsing CI workflows...');
    const workflows = parseWorkflows();
    console.log(`  Found ${workflows.length} workflows`);
    allServices.push(...workflows);
    // Build service map
    const servicesMap = {};
    for (const service of allServices) {
        servicesMap[service.name] = service;
    }
    // Build edges from dependencies
    for (const service of allServices) {
        for (const dep of service.dependencies) {
            if (servicesMap[dep]) {
                edges.push({
                    from: service.name,
                    to: dep,
                    type: service.type === 'docker' ? 'depends_on' : 'imports',
                });
                servicesMap[dep].dependents.push(service.name);
            }
        }
    }
    // Build category map
    const categories = {};
    for (const service of allServices) {
        if (!categories[service.category]) {
            categories[service.category] = [];
        }
        categories[service.category].push(service.name);
    }
    // Build stats
    const byCategory = {};
    for (const [cat, services] of Object.entries(categories)) {
        byCategory[cat] = services.length;
    }
    // Create SystemMap
    const systemMap = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        services: servicesMap,
        edges,
        categories,
        stats: {
            totalServices: allServices.length,
            totalEdges: edges.length,
            byCategory,
        },
    };
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    // Write JSON output
    const jsonPath = path.join(OUTPUT_DIR, 'system-map.json');
    fs.writeFileSync(jsonPath, JSON.stringify(systemMap, null, 2));
    console.log(`\nWritten: ${jsonPath}`);
    // Write DOT output
    const dotContent = generateDotFormat(systemMap);
    const dotPath = path.join(OUTPUT_DIR, 'system-map.dot');
    fs.writeFileSync(dotPath, dotContent);
    console.log(`Written: ${dotPath}`);
    // Print summary
    console.log(`
System Map Summary:
  Total Services: ${systemMap.stats.totalServices}
  Total Edges: ${systemMap.stats.totalEdges}

Categories:
${Object.entries(systemMap.stats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `  ${cat}: ${count}`)
        .join('\n')}

To render the graph:
  dot -Tpng docs/architecture/system-map.dot -o docs/architecture/system-map.png
  dot -Tsvg docs/architecture/system-map.dot -o docs/architecture/system-map.svg
`);
}
main().catch((err) => {
    console.error('Error generating system map:', err);
    process.exit(1);
});
