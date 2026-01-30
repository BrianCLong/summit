import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import {
  ensureDirectory,
  resolveRepoRoot,
  scanInventory,
  writeJson,
} from '../capability/scanner';
import { buildCapabilityGraph } from '../capability/graph';
import { loadCapabilityRegistry, compileRegistry, validateRegistry } from '../capability/registry';
import { diffRisk, scoreCapabilities } from '../capability/risk';
import { writeDashboard, writeRiskReport } from '../capability/report';
import yaml from 'yaml';
import { resolveSchemaPath, validateAgainstSchema } from '../capability/validator';

const DEFAULT_REGISTRY_DIR = path.join('capability-fabric', 'registry');
const DEFAULT_ARTIFACT_DIR = path.join('capability-fabric', 'artifacts');

export const capabilityCommand = new Command('cap')
  .description('Capability Fabric commands');

capabilityCommand
  .command('scan')
  .description('Discover APIs and generate capability artifacts')
  .option('--strict', 'Fail on missing registry entries or validation errors', false)
  .option('--registry <path>', 'Registry directory', DEFAULT_REGISTRY_DIR)
  .option('--artifacts <path>', 'Artifacts output directory', DEFAULT_ARTIFACT_DIR)
  .action((options) => {
    const repoRoot = resolveRepoRoot(process.cwd());
    const registryDir = path.join(repoRoot, options.registry);
    const artifactsDir = path.join(repoRoot, options.artifacts);

    ensureDirectory(artifactsDir);

    const inventory = scanInventory(repoRoot);
    writeJson(path.join(artifactsDir, 'api-inventory.json'), inventory);

    const registry = loadCapabilityRegistry(registryDir);
    const compiled = compileRegistry(registry);
    writeJson(path.join(artifactsDir, 'capability-registry.json'), compiled);

    const validation = validateRegistry(registry, repoRoot);
    const schemaErrors = validateAgainstSchema(
      registry,
      resolveSchemaPath(repoRoot),
    );

    const graph = buildCapabilityGraph(registry, inventory);
    writeJson(path.join(artifactsDir, 'capability-graph.json'), graph);

    const risks = scoreCapabilities(registry, graph.edges);
    writeJson(path.join(artifactsDir, 'capability-risk.json'), risks);
    writeRiskReport(
      path.join(artifactsDir, 'capability-risk-report.md'),
      registry,
      risks,
      null,
    );
    writeDashboard(path.join(artifactsDir, 'capability-dashboard.md'), risks);

    const missingRegistry = inventory.filter(
      (entry) => entry.type === 'openapi' && !entry.capability_id,
    );

    if (options.strict && (validation.errors.length || missingRegistry.length)) {
      if (validation.errors.length) {
        console.error('Registry validation errors:\n', validation.errors.join('\n'));
      }
      if (schemaErrors.length) {
        console.error('Registry schema errors:\n', schemaErrors.join('\n'));
      }
      if (missingRegistry.length) {
        console.error(
          'Unregistered APIs detected:\n',
          missingRegistry.map((entry) => `- ${entry.id}`).join('\n'),
        );
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

capabilityCommand
  .command('validate')
  .description('Validate capability registry and references')
  .option('--registry <path>', 'Registry directory', DEFAULT_REGISTRY_DIR)
  .action((options) => {
    const repoRoot = resolveRepoRoot(process.cwd());
    const registryDir = path.join(repoRoot, options.registry);
    const registry = loadCapabilityRegistry(registryDir);
    const validation = validateRegistry(registry, repoRoot);
    const schemaErrors = validateAgainstSchema(
      registry,
      resolveSchemaPath(repoRoot),
    );

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

capabilityCommand
  .command('report')
  .description('Generate risk report and diff against previous artifacts')
  .option('--registry <path>', 'Registry directory', DEFAULT_REGISTRY_DIR)
  .option('--artifacts <path>', 'Artifacts output directory', DEFAULT_ARTIFACT_DIR)
  .option('--previous <path>', 'Previous registry artifact', path.join(DEFAULT_ARTIFACT_DIR, 'capability-registry.json'))
  .option('--previous-graph <path>', 'Previous graph artifact', path.join(DEFAULT_ARTIFACT_DIR, 'capability-graph.json'))
  .option('--strict', 'Fail on high risk or missing metadata', false)
  .action((options) => {
    const repoRoot = resolveRepoRoot(process.cwd());
    const registryDir = path.join(repoRoot, options.registry);
    const artifactsDir = path.join(repoRoot, options.artifacts);
    const previousPath = path.join(repoRoot, options.previous);
    const previousGraphPath = path.join(repoRoot, options.previousGraph);

    const registry = loadCapabilityRegistry(registryDir);
    const inventory = scanInventory(repoRoot);
    const graph = buildCapabilityGraph(registry, inventory);

    const risks = scoreCapabilities(registry, graph.edges);
    const previous = fs.existsSync(previousPath)
      ? (JSON.parse(fs.readFileSync(previousPath, 'utf8')) as any)
      : null;

    const previousGraph = fs.existsSync(previousGraphPath)
      ? (JSON.parse(fs.readFileSync(previousGraphPath, 'utf8')) as any)
      : null;

    const diff = diffRisk(
      previous?.capabilities ? previous : null,
      registry,
      graph.edges,
      previousGraph?.edges ?? null,
    );

    writeRiskReport(
      path.join(artifactsDir, 'capability-risk-report.md'),
      registry,
      risks,
      diff,
    );
    writeDashboard(path.join(artifactsDir, 'capability-dashboard.md'), risks);
    writeJson(path.join(artifactsDir, 'capability-diff.json'), diff);

    const highRisk = risks.filter((risk) => risk.score >= 12);
    if (options.strict && highRisk.length) {
      console.error(
        'High risk capabilities require review:\n',
        highRisk.map((risk) => `- ${risk.capability_id}`).join('\n'),
      );
      process.exit(1);
    }
  });

capabilityCommand
  .command('register')
  .description('Generate a stub capability spec from an OpenAPI file')
  .requiredOption('--openapi <path>', 'OpenAPI file to register')
  .requiredOption('--capability-id <id>', 'Capability identifier')
  .option('--output <path>', 'Output registry file', path.join(DEFAULT_REGISTRY_DIR, 'stub.yaml'))
  .action((options) => {
    const repoRoot = resolveRepoRoot(process.cwd());
    const openapiPath = path.join(repoRoot, options.openapi);
    const outputPath = path.join(repoRoot, options.output);

    const raw = fs.readFileSync(openapiPath, 'utf8');
    const parsed = openapiPath.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw);

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

    ensureDirectory(path.dirname(outputPath));
    fs.writeFileSync(outputPath, `${yaml.stringify(spec)}\n`, 'utf8');
    console.log(`Stub capability written to ${outputPath}`);
  });
