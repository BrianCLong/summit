"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilityCommand = void 0;
const commander_1 = require("commander");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const scanner_1 = require("../capability/scanner");
const graph_1 = require("../capability/graph");
const registry_1 = require("../capability/registry");
const risk_1 = require("../capability/risk");
const report_1 = require("../capability/report");
const yaml_1 = __importDefault(require("yaml"));
const validator_1 = require("../capability/validator");
const DEFAULT_REGISTRY_DIR = node_path_1.default.join('capability-fabric', 'registry');
const DEFAULT_ARTIFACT_DIR = node_path_1.default.join('capability-fabric', 'artifacts');
exports.capabilityCommand = new commander_1.Command('cap')
    .description('Capability Fabric commands');
exports.capabilityCommand
    .command('scan')
    .description('Discover APIs and generate capability artifacts')
    .option('--strict', 'Fail on missing registry entries or validation errors', false)
    .option('--registry <path>', 'Registry directory', DEFAULT_REGISTRY_DIR)
    .option('--artifacts <path>', 'Artifacts output directory', DEFAULT_ARTIFACT_DIR)
    .action((options) => {
    const repoRoot = (0, scanner_1.resolveRepoRoot)(process.cwd());
    const registryDir = node_path_1.default.join(repoRoot, options.registry);
    const artifactsDir = node_path_1.default.join(repoRoot, options.artifacts);
    (0, scanner_1.ensureDirectory)(artifactsDir);
    const inventory = (0, scanner_1.scanInventory)(repoRoot);
    (0, scanner_1.writeJson)(node_path_1.default.join(artifactsDir, 'api-inventory.json'), inventory);
    const registry = (0, registry_1.loadCapabilityRegistry)(registryDir);
    const compiled = (0, registry_1.compileRegistry)(registry);
    (0, scanner_1.writeJson)(node_path_1.default.join(artifactsDir, 'capability-registry.json'), compiled);
    const validation = (0, registry_1.validateRegistry)(registry, repoRoot);
    const schemaErrors = (0, validator_1.validateAgainstSchema)(registry, (0, validator_1.resolveSchemaPath)(repoRoot));
    const graph = (0, graph_1.buildCapabilityGraph)(registry, inventory);
    (0, scanner_1.writeJson)(node_path_1.default.join(artifactsDir, 'capability-graph.json'), graph);
    const risks = (0, risk_1.scoreCapabilities)(registry, graph.edges);
    (0, scanner_1.writeJson)(node_path_1.default.join(artifactsDir, 'capability-risk.json'), risks);
    (0, report_1.writeRiskReport)(node_path_1.default.join(artifactsDir, 'capability-risk-report.md'), registry, risks, null);
    (0, report_1.writeDashboard)(node_path_1.default.join(artifactsDir, 'capability-dashboard.md'), risks);
    const missingRegistry = inventory.filter((entry) => entry.type === 'openapi' && !entry.capability_id);
    if (options.strict && (validation.errors.length || missingRegistry.length)) {
        if (validation.errors.length) {
            console.error('Registry validation errors:\n', validation.errors.join('\n'));
        }
        if (schemaErrors.length) {
            console.error('Registry schema errors:\n', schemaErrors.join('\n'));
        }
        if (missingRegistry.length) {
            console.error('Unregistered APIs detected:\n', missingRegistry.map((entry) => `- ${entry.id}`).join('\n'));
        }
        process.exit(1);
    }
    if (validation.errors.length) {
        console.warn('Registry validation errors detected.');
    }
    if (schemaErrors.length) {
        console.warn('Registry schema errors detected.');
    }
    if (validation.warnings.length) {
        console.warn('Registry validation warnings detected.');
    }
});
exports.capabilityCommand
    .command('validate')
    .description('Validate capability registry and references')
    .option('--registry <path>', 'Registry directory', DEFAULT_REGISTRY_DIR)
    .action((options) => {
    const repoRoot = (0, scanner_1.resolveRepoRoot)(process.cwd());
    const registryDir = node_path_1.default.join(repoRoot, options.registry);
    const registry = (0, registry_1.loadCapabilityRegistry)(registryDir);
    const validation = (0, registry_1.validateRegistry)(registry, repoRoot);
    const schemaErrors = (0, validator_1.validateAgainstSchema)(registry, (0, validator_1.resolveSchemaPath)(repoRoot));
    if (validation.errors.length || schemaErrors.length) {
        console.error('Registry validation errors:\n', validation.errors.join('\n'));
        if (schemaErrors.length) {
            console.error('Registry schema errors:\n', schemaErrors.join('\n'));
        }
        process.exit(1);
    }
    if (validation.warnings.length) {
        console.warn('Registry validation warnings:\n', validation.warnings.join('\n'));
    }
    console.log('Capability registry validation complete.');
});
exports.capabilityCommand
    .command('report')
    .description('Generate risk report and diff against previous artifacts')
    .option('--registry <path>', 'Registry directory', DEFAULT_REGISTRY_DIR)
    .option('--artifacts <path>', 'Artifacts output directory', DEFAULT_ARTIFACT_DIR)
    .option('--previous <path>', 'Previous registry artifact', node_path_1.default.join(DEFAULT_ARTIFACT_DIR, 'capability-registry.json'))
    .option('--previous-graph <path>', 'Previous graph artifact', node_path_1.default.join(DEFAULT_ARTIFACT_DIR, 'capability-graph.json'))
    .option('--strict', 'Fail on high risk or missing metadata', false)
    .action((options) => {
    const repoRoot = (0, scanner_1.resolveRepoRoot)(process.cwd());
    const registryDir = node_path_1.default.join(repoRoot, options.registry);
    const artifactsDir = node_path_1.default.join(repoRoot, options.artifacts);
    const previousPath = node_path_1.default.join(repoRoot, options.previous);
    const previousGraphPath = node_path_1.default.join(repoRoot, options.previousGraph);
    const registry = (0, registry_1.loadCapabilityRegistry)(registryDir);
    const inventory = (0, scanner_1.scanInventory)(repoRoot);
    const graph = (0, graph_1.buildCapabilityGraph)(registry, inventory);
    const risks = (0, risk_1.scoreCapabilities)(registry, graph.edges);
    const previous = node_fs_1.default.existsSync(previousPath)
        ? JSON.parse(node_fs_1.default.readFileSync(previousPath, 'utf8'))
        : null;
    const previousGraph = node_fs_1.default.existsSync(previousGraphPath)
        ? JSON.parse(node_fs_1.default.readFileSync(previousGraphPath, 'utf8'))
        : null;
    const diff = (0, risk_1.diffRisk)(previous?.capabilities ? previous : null, registry, graph.edges, previousGraph?.edges ?? null);
    (0, report_1.writeRiskReport)(node_path_1.default.join(artifactsDir, 'capability-risk-report.md'), registry, risks, diff);
    (0, report_1.writeDashboard)(node_path_1.default.join(artifactsDir, 'capability-dashboard.md'), risks);
    (0, scanner_1.writeJson)(node_path_1.default.join(artifactsDir, 'capability-diff.json'), diff);
    const highRisk = risks.filter((risk) => risk.score >= 12);
    if (options.strict && highRisk.length) {
        console.error('High risk capabilities require review:\n', highRisk.map((risk) => `- ${risk.capability_id}`).join('\n'));
        process.exit(1);
    }
});
exports.capabilityCommand
    .command('register')
    .description('Generate a stub capability spec from an OpenAPI file')
    .requiredOption('--openapi <path>', 'OpenAPI file to register')
    .requiredOption('--capability-id <id>', 'Capability identifier')
    .option('--output <path>', 'Output registry file', node_path_1.default.join(DEFAULT_REGISTRY_DIR, 'stub.yaml'))
    .action((options) => {
    const repoRoot = (0, scanner_1.resolveRepoRoot)(process.cwd());
    const openapiPath = node_path_1.default.join(repoRoot, options.openapi);
    const outputPath = node_path_1.default.join(repoRoot, options.output);
    const raw = node_fs_1.default.readFileSync(openapiPath, 'utf8');
    const parsed = openapiPath.endsWith('.json') ? JSON.parse(raw) : yaml_1.default.parse(raw);
    const spec = {
        version: 1,
        capabilities: [
            {
                capability_id: options.capabilityId,
                name: parsed.info?.title ?? options.capabilityId,
                description: parsed.info?.description ?? 'TODO: describe capability.',
                business_domain: 'orchestration',
                owner_team: 'TODO',
                oncall: 'TODO',
                repo: 'server',
                service: 'TODO',
                data_classification: 'internal',
                allowed_identities: ['TODO'],
                authn: { method: 'session_token' },
                authz: { mode: 'scopes', required_scopes: ['TODO'] },
                schemas: {
                    input_schema_ref: 'capability-fabric/schemas/TODO.input.schema.json',
                    output_schema_ref: 'capability-fabric/schemas/TODO.output.schema.json',
                },
                operations: ['read'],
                risk_controls: {
                    rate_limit: { max_per_minute: 60 },
                    approvals_required: false,
                    redaction_fields: [],
                    allowlist_fields: [],
                },
                dependency_edges: [],
                policy_refs: ['policies/capability-fabric/TODO.rego'],
                matchers: [
                    {
                        type: 'http_endpoint',
                        method: 'GET',
                        path: parsed.paths ? Object.keys(parsed.paths)[0] : '/TODO',
                    },
                ],
            },
        ],
    };
    (0, scanner_1.ensureDirectory)(node_path_1.default.dirname(outputPath));
    node_fs_1.default.writeFileSync(outputPath, `${yaml_1.default.stringify(spec)}\n`, 'utf8');
    console.log(`Stub capability written to ${outputPath}`);
});
