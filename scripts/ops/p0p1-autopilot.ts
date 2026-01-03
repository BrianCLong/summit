#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ARGS ---
const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'live';
const fixturesDir = args.find(a => a.startsWith('--fixturesDir='))?.split('=')[1] || path.join(__dirname, 'fixtures');
const failOnP0 = args.includes('--failOnP0');

// --- TYPES ---
interface Failure {
    signature: string;
    cluster: string;
    package: string;
    context: string[];
    priority: 'P0' | 'P1';
}

interface AgentManifest {
    agent: string;
    workstream_id: string;
    branch: string;
    boundaries: {
        include_globs: string[];
        exclude_globs: string[];
    };
    objectives: string[];
    verification: {
        commands: string[];
    };
    evidence: {
        notes: string;
    };
    risks: {
        rollback_plan: string;
    };
}

// --- CLUSTERING RULES ---
function clusterFailure(line: string, context: string[]): { cluster: string, priority: 'P0' | 'P1' } | null {
    if (line.includes('ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL')) return { cluster: 'PNPM_RECURSIVE_FAIL', priority: 'P1' };
    if (line.includes('ERR_MODULE_NOT_FOUND')) return { cluster: 'MODULE_NOT_FOUND', priority: 'P0' };
    if (line.includes('Duplicate key') && line.includes('package.json')) return { cluster: 'DUPLICATE_JSON_KEY', priority: 'P1' };
    if (line.includes('ESLint:')) return { cluster: 'LINT_CONFIGURATION', priority: 'P1' };
    if (line.includes('tsc') && line.includes('error TS')) return { cluster: 'TYPESCRIPT_ERROR', priority: 'P1' };
    if (line.includes('ReferenceError') || line.includes('SyntaxError')) return { cluster: 'SYNTAX_ERROR', priority: 'P0' };
    if (line.includes('prom-client') && line.includes('register')) return { cluster: 'METRICS_REGISTRY', priority: 'P1' };
    if (line.includes('ECONNREFUSED')) return { cluster: 'NETWORK_CONNECTION', priority: 'P1' };
    if (line.includes('Jest') && line.includes('failed')) return { cluster: 'TEST_FAILURE', priority: 'P0' };

    // Default catch-all for errors that seem significant
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
        return { cluster: 'GENERIC_FAILURE', priority: 'P1' };
    }

    return null;
}

// --- ROUTING RULES ---
function routeToOwner(cluster: string, pkg: string): string {
    if (cluster === 'LINT_CONFIGURATION' || cluster === 'DUPLICATE_JSON_KEY' || cluster === 'PNPM_RECURSIVE_FAIL') return 'Codex';
    if (cluster === 'TYPESCRIPT_ERROR') return 'Codex';
    if (cluster === 'METRICS_REGISTRY' || cluster === 'NETWORK_CONNECTION') return 'Qwen';
    if (cluster === 'MODULE_NOT_FOUND' || cluster === 'SYNTAX_ERROR') return 'Claude'; // Critical runtime issues
    if (cluster === 'TEST_FAILURE') return 'Claude';

    // Default fallback based on package name or type
    if (pkg === 'server' || pkg.includes('service')) return 'Qwen';
    if (pkg.includes('scripts') || pkg.includes('docs')) return 'Jules';

    return 'Claude'; // Default for systemic issues
}

// --- PARSING LOGIC ---
function parseLogs(dir: string): Failure[] {
    const failures: Failure[] = [];
    const files = ['install.txt', 'lint.txt', 'typecheck.txt', 'build.txt', 'test.txt'];

    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        let currentPackage = 'unknown';

        lines.forEach((line, index) => {
            // Heuristic to detect package context
            const pkgMatch = line.match(/^([a-zA-Z0-9@\/-]+)\s+(lint|test|build|typecheck)[$:]/);
            if (pkgMatch) {
                currentPackage = pkgMatch[1];
            }

            const clusterResult = clusterFailure(line, lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3)));
            if (clusterResult) {
                failures.push({
                    signature: line.trim(),
                    cluster: clusterResult.cluster,
                    package: currentPackage,
                    context: lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 4)),
                    priority: clusterResult.priority
                });
            }
        });
    });

    return failures;
}

// --- GENERATION LOGIC ---
function generateManifests(failures: Failure[], agents: string[]): AgentManifest[] {
    const manifests: AgentManifest[] = [];
    const workstreamDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // First pass: Route failures and determine raw boundaries
    const agentAssignments: Record<string, { failures: Failure[], includeGlobs: string[], excludeGlobs: string[], objectives: string[] }> = {};

    agents.forEach(agent => {
        agentAssignments[agent] = { failures: [], includeGlobs: [], excludeGlobs: [], objectives: [] };
    });

    failures.forEach(f => {
        const owner = routeToOwner(f.cluster, f.package);
        if (agentAssignments[owner]) {
            agentAssignments[owner].failures.push(f);
        }
    });

    // Populate objectives and initial globs
    for (const agent of agents) {
        const data = agentAssignments[agent];
        const clusters = [...new Set(data.failures.map(f => f.cluster))];
        data.objectives.push(...clusters.map(c => `Resolve ${c} clusters`));

        if (agent === 'Claude') {
            data.includeGlobs = ['.github/workflows/**'];
            data.objectives.push('Diagnose systemic CI/test failures');
        } else if (agent === 'Codex') {
            data.includeGlobs = ['**/*.json', '**/*.ts'];
            data.excludeGlobs = ['server/src/config/**'];
            data.objectives.push('Fix lint configurations and TS errors across packages');
        } else if (agent === 'Qwen') {
            const affectedPackages = [...new Set(data.failures.map(f => f.package))].filter(p => p !== 'unknown');
            data.includeGlobs = affectedPackages.map(p => `${p}/**`);
            data.objectives.push('Fix specific package runtime issues (metrics, network)');
        } else if (agent === 'Jules') {
            data.includeGlobs = ['scripts/**', 'docs/**'];
            data.objectives.push('Maintain operational scripts and documentation');
        }
    }

    // Second Pass: Resolve overlaps (Specifically Codex vs Qwen)
    if (agentAssignments['Codex'] && agentAssignments['Qwen']) {
        const qwenIncludes = agentAssignments['Qwen'].includeGlobs;
        // Codex sweeps everything, so we must exclude Qwen's specific targets to prevent overlap
        agentAssignments['Codex'].excludeGlobs.push(...qwenIncludes);
    }

    // Build Manifests
    for (const agent of agents) {
        const data = agentAssignments[agent];

        // Always generate for Jules, otherwise only if there are objectives/failures
        if (data.objectives.length > 0 || agent === 'Jules') {
            manifests.push({
                agent,
                workstream_id: `ws-${agent.toLowerCase()}-${workstreamDate}-01`,
                branch: `autopilot/${agent.toLowerCase()}/ws-${agent.toLowerCase()}-${workstreamDate}-01`,
                boundaries: {
                    include_globs: [...new Set(data.includeGlobs)],
                    exclude_globs: [...new Set(data.excludeGlobs)]
                },
                objectives: [...new Set(data.objectives)],
                verification: {
                    commands: ['pnpm build', 'pnpm test']
                },
                evidence: {
                    notes: `Auto-generated workstream based on ${data.failures.length} detected failures.`
                },
                risks: {
                    rollback_plan: 'Revert changes and re-run p0p1-autopilot'
                }
            });
        }
    }

    return manifests;
}

function generatePrompt(manifest: AgentManifest, failures: Failure[]): string {
    const agentFailures = failures.filter(f => routeToOwner(f.cluster, f.package) === manifest.agent);
    const topFailures = agentFailures.slice(0, 5).map(f => `- [${f.priority}] ${f.signature} (in ${f.package})`).join('\n');

    return `
# Autopilot Prompt for ${manifest.agent}

**Workstream ID:** ${manifest.workstream_id}
**Objective:** ${manifest.objectives.join(', ')}

## Constraints
You must operate strictly within the following boundaries:
**Include:**
${manifest.boundaries.include_globs.map(g => `- ${g}`).join('\n')}

**Exclude:**
${manifest.boundaries.exclude_globs.map(g => `- ${g}`).join('\n')}

## Context & Evidence
The following failures have been assigned to you:
${topFailures}

(See full list in generated report)

## Instructions
1. Checkout branch \`${manifest.branch}\`.
2. Analyze the failures above.
3. Fix the issues within the boundaries.
4. Run verification commands:
${manifest.verification.commands.map(c => `   - \`${c}\``).join('\n')}
5. Update \`workstreams/${manifest.agent}/${manifest.workstream_id}.yml\` evidence section.
`.trim();
}

function generateReport(failures: Failure[], manifests: AgentManifest[]): string {
    const groupedByCluster = failures.reduce((acc, f) => {
        if (!acc[f.cluster]) acc[f.cluster] = [];
        acc[f.cluster].push(f);
        return acc;
    }, {} as Record<string, Failure[]>);

    return `
# P0/P1 Autopilot Report

**Date:** ${new Date().toISOString()}
**Total Failures:** ${failures.length}

## Operator Summary
- **P0 Failures:** ${failures.filter(f => f.priority === 'P0').length}
- **P1 Failures:** ${failures.filter(f => f.priority === 'P1').length}

## Generated Workstreams

${manifests.map(m => `
### ${m.agent}
- **ID:** ${m.workstream_id}
- **Objectives:** ${m.objectives.join(', ')}
- [Manifest](workstreams/${m.agent}/${m.workstream_id}.yml) | [Prompt](prompts/${m.agent}/${m.workstream_id}.md)
`).join('\n')}

## Failure Clusters

${Object.entries(groupedByCluster).map(([cluster, clusterFailures]) => `
### ${cluster} (${clusterFailures.length})
**Owner:** ${routeToOwner(cluster, clusterFailures[0].package)}
**Priority:** ${clusterFailures[0].priority}

**Sample Signatures:**
${clusterFailures.slice(0, 3).map(f => `- \`${f.signature}\` (${f.package})`).join('\n')}
`).join('\n')}

## Operator Commands
- **Regenerate:** \`pnpm ops:p0p1:autopilot:offline\`
- **Run Fixtures:** \`node scripts/ops/p0p1-autopilot.ts --mode=offline\`

## Next Actions for CI (Claude)
- Wire \`pnpm ops:p0p1:autopilot:offline\` into a non-blocking CI step to track drift.
`.trim();
}

function toYaml(obj: any, indent = 0): string {
  const spacing = ' '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${spacing}${key}:\n`;
      if (value.length === 0) {
        // empty array
      } else {
        value.forEach(item => {
           if (typeof item === 'object') {
             yaml += `${spacing}  -\n${toYaml(item, indent + 4)}`;
           } else {
             yaml += `${spacing}  - "${item}"\n`;
           }
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      yaml += `${spacing}${key}:\n${toYaml(value, indent + 2)}`;
    } else {
      // Simple value
      const strVal = String(value);
      const needsQuote = strVal.includes(':') || strVal.includes('#');
      yaml += `${spacing}${key}: ${needsQuote ? `"${strVal}"` : strVal}\n`;
    }
  }
  return yaml;
}

// --- MAIN EXECUTION ---
async function main() {
    console.log(`Running P0/P1 Autopilot in ${mode} mode...`);

    // 1. Parse Logs
    let failures: Failure[] = [];
    if (mode === 'offline') {
        failures = parseLogs(path.join(fixturesDir, 'parity-output'));
    } else {
        // Live mode not fully implemented yet, falling back to offline logic or empty
        console.warn('Live mode currently strictly requires existing logs or similar logic. Using offline fixtures if available.');
         failures = parseLogs(path.join(fixturesDir, 'parity-output'));
    }

    console.log(`Found ${failures.length} failures.`);

    // 2. Route & Generate
    const agents = ['Claude', 'Codex', 'Qwen', 'Jules'];
    const manifests = generateManifests(failures, agents);

    for (const manifest of manifests) {
        // Write Manifest
        const manifestPath = path.join('workstreams', manifest.agent, `${manifest.workstream_id}.yml`);
        fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

        // Write YAML manually since we can't use a library
        fs.writeFileSync(manifestPath, toYaml(manifest));

        // Write Prompt
        const promptPath = path.join('prompts', manifest.agent, `${manifest.workstream_id}.md`);
        fs.mkdirSync(path.dirname(promptPath), { recursive: true });
        fs.writeFileSync(promptPath, generatePrompt(manifest, failures));
    }

    // 3. Write Report
    const reportPath = 'docs/ops/P0P1_AUTOPILOT.md';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, generateReport(failures, manifests));

    console.log(`Report generated at ${reportPath}`);

    // 4. Check P0
    if (failOnP0 && failures.some(f => f.priority === 'P0')) {
        console.error('P0 Failures detected!');
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
