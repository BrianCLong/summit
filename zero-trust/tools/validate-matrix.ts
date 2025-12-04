#!/usr/bin/env npx tsx
/**
 * Communication Matrix Validator
 * Validates the zero-trust communication matrix against service registry
 * and generates connectivity reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Types
interface Service {
  name: string;
  namespace: string;
  serviceAccount: string;
  spiffeId: string;
  ports: Port[];
  tier: string;
}

interface Port {
  name: string;
  port: number;
  protocol: string;
}

interface CommunicationRule {
  name: string;
  source: {
    service?: string;
    services?: string[];
    namespace: string;
    type?: string;
  };
  destination: {
    service?: string;
    services?: string[];
    namespace: string;
    type?: string;
  };
  allow: {
    ports?: number[];
    methods?: string[];
    paths?: string[];
  };
}

interface ServiceRegistry {
  categories: Record<
    string,
    {
      services: Service[];
    }
  >;
}

interface CommunicationMatrix {
  rules: CommunicationRule[];
  defaultPolicy: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalServices: number;
    totalRules: number;
    coveredServices: number;
    uncoveredServices: string[];
  };
}

// Load YAML files
function loadYaml<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.parse(content);

    // Handle ConfigMap data field
    if (parsed.data) {
      const dataKey = Object.keys(parsed.data).find(
        (k) => k.endsWith('.yaml') || k.endsWith('.yml'),
      );
      if (dataKey) {
        return yaml.parse(parsed.data[dataKey]);
      }
    }

    return parsed;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

// Extract all services from registry
function extractServices(registry: ServiceRegistry): Service[] {
  const services: Service[] = [];

  for (const category of Object.values(registry.categories)) {
    if (category.services) {
      services.push(...category.services);
    }
  }

  return services;
}

// Get services covered by a rule
function getServicesCoveredByRule(
  rule: CommunicationRule,
  services: Service[],
): { sources: string[]; destinations: string[] } {
  const sources: string[] = [];
  const destinations: string[] = [];

  // Match sources
  if (rule.source.service) {
    sources.push(rule.source.service);
  } else if (rule.source.services) {
    sources.push(...rule.source.services);
  } else if (rule.source.type === 'all-services') {
    services
      .filter((s) => s.namespace === rule.source.namespace)
      .forEach((s) => sources.push(s.serviceAccount));
  }

  // Match destinations
  if (rule.destination.service) {
    destinations.push(rule.destination.service);
  } else if (rule.destination.services) {
    destinations.push(...rule.destination.services);
  } else if (rule.destination.type === 'all-services') {
    services
      .filter((s) => s.namespace === rule.destination.namespace)
      .forEach((s) => destinations.push(s.serviceAccount));
  }

  return { sources, destinations };
}

// Validate communication matrix
function validateMatrix(
  registry: ServiceRegistry,
  matrix: CommunicationMatrix,
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalServices: 0,
      totalRules: 0,
      coveredServices: 0,
      uncoveredServices: [],
    },
  };

  const services = extractServices(registry);
  result.stats.totalServices = services.length;
  result.stats.totalRules = matrix.rules.length;

  // Track which services are covered
  const coveredAsSource = new Set<string>();
  const coveredAsDestination = new Set<string>();

  // Validate default policy
  if (matrix.defaultPolicy !== 'DENY') {
    result.errors.push(
      `Default policy must be DENY, found: ${matrix.defaultPolicy}`,
    );
    result.valid = false;
  }

  // Validate each rule
  for (const rule of matrix.rules) {
    // Check rule has a name
    if (!rule.name) {
      result.errors.push('Rule missing name');
      result.valid = false;
      continue;
    }

    // Check source and destination exist
    if (!rule.source || !rule.destination) {
      result.errors.push(`Rule ${rule.name}: missing source or destination`);
      result.valid = false;
      continue;
    }

    // Track coverage
    const coverage = getServicesCoveredByRule(rule, services);
    coverage.sources.forEach((s) => coveredAsSource.add(s));
    coverage.destinations.forEach((s) => coveredAsDestination.add(s));

    // Validate referenced services exist
    const sourceSvc = rule.source.service || rule.source.services;
    const destSvc = rule.destination.service || rule.destination.services;

    if (sourceSvc) {
      const sourceList = Array.isArray(sourceSvc) ? sourceSvc : [sourceSvc];
      for (const svc of sourceList) {
        const exists = services.some((s) => s.serviceAccount === svc);
        if (!exists && rule.source.type !== 'external') {
          result.warnings.push(
            `Rule ${rule.name}: source service '${svc}' not found in registry`,
          );
        }
      }
    }

    if (destSvc) {
      const destList = Array.isArray(destSvc) ? destSvc : [destSvc];
      for (const svc of destList) {
        const exists = services.some((s) => s.serviceAccount === svc);
        if (!exists && rule.destination.type !== 'external') {
          result.warnings.push(
            `Rule ${rule.name}: destination service '${svc}' not found in registry`,
          );
        }
      }
    }
  }

  // Check for uncovered services
  const allServiceAccounts = services.map((s) => s.serviceAccount);
  const uncoveredServices = allServiceAccounts.filter(
    (sa) => !coveredAsSource.has(sa) && !coveredAsDestination.has(sa),
  );

  result.stats.coveredServices =
    allServiceAccounts.length - uncoveredServices.length;
  result.stats.uncoveredServices = uncoveredServices;

  if (uncoveredServices.length > 0) {
    result.warnings.push(
      `${uncoveredServices.length} services not covered by any communication rule`,
    );
  }

  return result;
}

// Generate connectivity report
function generateConnectivityReport(
  services: Service[],
  matrix: CommunicationMatrix,
): string {
  const lines: string[] = [];

  lines.push('# Service Connectivity Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total Services: ${services.length}`);
  lines.push(`- Total Rules: ${matrix.rules.length}`);
  lines.push(`- Default Policy: ${matrix.defaultPolicy}`);
  lines.push('');
  lines.push('## Communication Rules');
  lines.push('');
  lines.push(
    '| Source | Destination | Methods | Paths |',
  );
  lines.push(
    '|--------|-------------|---------|-------|',
  );

  for (const rule of matrix.rules) {
    const source =
      rule.source.service || rule.source.services?.join(', ') || rule.source.type || 'unknown';
    const dest =
      rule.destination.service ||
      rule.destination.services?.join(', ') ||
      rule.destination.type ||
      'unknown';
    const methods = rule.allow.methods?.join(', ') || '*';
    const paths = rule.allow.paths?.join(', ') || '*';

    lines.push(`| ${source} | ${dest} | ${methods} | ${paths} |`);
  }

  lines.push('');
  lines.push('## Services by Namespace');
  lines.push('');

  const byNamespace = new Map<string, Service[]>();
  for (const svc of services) {
    const ns = svc.namespace;
    if (!byNamespace.has(ns)) {
      byNamespace.set(ns, []);
    }
    byNamespace.get(ns)!.push(svc);
  }

  for (const [ns, svcs] of byNamespace) {
    lines.push(`### ${ns}`);
    lines.push('');
    for (const svc of svcs) {
      lines.push(`- **${svc.name}** (${svc.serviceAccount})`);
      lines.push(`  - SPIFFE ID: \`${svc.spiffeId}\``);
      lines.push(`  - Tier: ${svc.tier}`);
      lines.push(
        `  - Ports: ${svc.ports.map((p) => `${p.port}/${p.protocol}`).join(', ')}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Main
async function main(): Promise<void> {
  const rootDir = path.resolve(__dirname, '..');
  const registryPath = path.join(rootDir, 'config', 'service-registry.yaml');
  const matrixPath = path.join(rootDir, 'config', 'communication-matrix.yaml');

  console.log('Zero-Trust Communication Matrix Validator');
  console.log('=========================================');
  console.log('');

  // Load files
  const registry = loadYaml<ServiceRegistry>(registryPath);
  const matrix = loadYaml<CommunicationMatrix>(matrixPath);

  if (!registry) {
    console.error('Failed to load service registry');
    process.exit(1);
  }

  if (!matrix) {
    console.error('Failed to load communication matrix');
    process.exit(1);
  }

  // Validate
  console.log('Validating communication matrix...');
  console.log('');

  const result = validateMatrix(registry, matrix);

  // Output results
  console.log('Validation Results:');
  console.log(`  Valid: ${result.valid ? '✓' : '✗'}`);
  console.log(`  Total Services: ${result.stats.totalServices}`);
  console.log(`  Total Rules: ${result.stats.totalRules}`);
  console.log(`  Covered Services: ${result.stats.coveredServices}`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach((e) => console.log(`  ✗ ${e}`));
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
    console.log('');
  }

  if (result.stats.uncoveredServices.length > 0) {
    console.log('Uncovered Services:');
    result.stats.uncoveredServices.forEach((s) => console.log(`  - ${s}`));
    console.log('');
  }

  // Generate report if requested
  if (process.argv.includes('--report')) {
    const services = extractServices(registry);
    const report = generateConnectivityReport(services, matrix);
    const reportPath = path.join(rootDir, 'CONNECTIVITY_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Report generated: ${reportPath}`);
  }

  process.exit(result.valid ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
