#!/usr/bin/env npx tsx
/// <reference types="node" />
/**
 * Graph Query Correctness Oracle Runner
 *
 * This script executes graph query scenarios against IntelGraph and validates
 * the responses against expected results defined in oracle-scenarios.json.
 *
 * Usage:
 *   npx tsx scripts/testing/run-graph-oracle.ts [options]
 *
 * Options:
 *   --api-url <url>      GraphQL API URL (default: http://localhost:4000/graphql)
 *   --scenario <id>      Run specific scenario only
 *   --category <name>    Run scenarios from specific category
 *   --verbose            Enable verbose output
 *   --report-dir <dir>   Output directory for reports (default: reports)
 *   --skip-setup         Skip loading golden dataset
 *   --timeout <ms>       Query timeout in ms (default: 10000)
 *
 * @module scripts/testing/run-graph-oracle
 */

import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// TYPES
// =============================================================================

interface ValidationRule {
  type:
    | "exact"
    | "contains"
    | "set"
    | "ordered"
    | "null"
    | "notNull"
    | "gte"
    | "lte"
    | "allMatch"
    | "descending";
  field: string;
  value?: unknown;
  values?: unknown[];
}

interface PerformanceThresholds {
  maxLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
}

interface OracleScenario {
  id: string;
  category: string;
  name: string;
  description: string;
  enabled: boolean;
  query: {
    type: "graphql" | "rest";
    operation: string;
    document: string;
    variables: Record<string, unknown>;
  };
  expected: {
    validation: ValidationRule[];
    noError?: boolean;
    performance?: PerformanceThresholds;
  };
}

interface OracleScenariosFile {
  version: string;
  description: string;
  goldenDatasetRef: string;
  scenarios: OracleScenario[];
  entityReferences: Record<string, { index: number; type: string; name: string }>;
  performanceBaselines: Record<string, PerformanceThresholds>;
}

interface GoldenDataset {
  investigation: {
    name: string;
    description: string;
    type: string;
  };
  entities: Array<{
    type: string;
    name: string;
    properties: Record<string, unknown>;
  }>;
  relationships: Array<{
    type: string;
    from: number;
    to: number;
    properties: Record<string, unknown>;
  }>;
}

interface ScenarioResult {
  id: string;
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "SKIP" | "ERROR";
  latencyMs: number;
  validationResults: Array<{
    rule: ValidationRule;
    passed: boolean;
    message: string;
    actual?: unknown;
    expected?: unknown;
  }>;
  error?: string;
  response?: unknown;
}

interface OracleReport {
  timestamp: string;
  apiUrl: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    successRate: number;
  };
  resultsByCategory: Record<string, ScenarioResult[]>;
  performanceSummary: Record<
    string,
    {
      avgMs: number;
      p95Ms: number;
      p99Ms: number;
      maxMs: number;
    }
  >;
  failures: ScenarioResult[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  apiUrl: process.env.GRAPHQL_API_URL || "http://localhost:4000/graphql",
  scenariosPath: "testdata/intelgraph/oracle-scenarios.json",
  goldenDatasetPath: "data/golden-path/demo-investigation.json",
  reportDir: "reports",
  timeout: 10000,
  verbose: false,
  skipSetup: false,
  scenario: null as string | null,
  category: null as string | null,
};

// =============================================================================
// UTILITIES
// =============================================================================

function parseArgs(): typeof DEFAULT_CONFIG {
  const config = { ...DEFAULT_CONFIG };
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--api-url":
        config.apiUrl = args[++i];
        break;
      case "--scenario":
        config.scenario = args[++i];
        break;
      case "--category":
        config.category = args[++i];
        break;
      case "--verbose":
        config.verbose = true;
        break;
      case "--report-dir":
        config.reportDir = args[++i];
        break;
      case "--skip-setup":
        config.skipSetup = true;
        break;
      case "--timeout":
        config.timeout = parseInt(args[++i], 10);
        break;
      case "--help":
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
Graph Query Correctness Oracle Runner

Usage:
  npx tsx scripts/testing/run-graph-oracle.ts [options]

Options:
  --api-url <url>      GraphQL API URL (default: ${DEFAULT_CONFIG.apiUrl})
  --scenario <id>      Run specific scenario only
  --category <name>    Run scenarios from specific category
  --verbose            Enable verbose output
  --report-dir <dir>   Output directory for reports (default: ${DEFAULT_CONFIG.reportDir})
  --skip-setup         Skip loading golden dataset
  --timeout <ms>       Query timeout in ms (default: ${DEFAULT_CONFIG.timeout})
  --help               Show this help message

Examples:
  npx tsx scripts/testing/run-graph-oracle.ts
  npx tsx scripts/testing/run-graph-oracle.ts --scenario path-1.1
  npx tsx scripts/testing/run-graph-oracle.ts --category pathfinding --verbose
  `);
}

function log(message: string, verbose = false): void {
  if (!verbose || parseArgs().verbose) {
    console.log(message);
  }
}

function getValueAtPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array wildcards like "nodes[*].type"
    const arrayMatch = part.match(/^(\w+)\[(\*|\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];

      if (!Array.isArray(current)) {
        return undefined;
      }

      if (index === "*") {
        // Return array of values at this path
        const remaining = parts.slice(parts.indexOf(part) + 1).join(".");
        if (remaining) {
          return current.map((item) => getValueAtPath(item, remaining));
        }
        return current;
      } else {
        current = current[parseInt(index, 10)];
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

// =============================================================================
// VALIDATION ENGINE
// =============================================================================

function validateRule(
  rule: ValidationRule,
  response: unknown
): { passed: boolean; message: string; actual?: unknown; expected?: unknown } {
  const actual = getValueAtPath(response, rule.field);

  switch (rule.type) {
    case "exact":
      if (actual === rule.value) {
        return { passed: true, message: `${rule.field} equals ${JSON.stringify(rule.value)}` };
      }
      return {
        passed: false,
        message: `${rule.field} expected ${JSON.stringify(rule.value)}, got ${JSON.stringify(actual)}`,
        actual,
        expected: rule.value,
      };

    case "null":
      if (actual === null || actual === undefined) {
        return { passed: true, message: `${rule.field} is null/undefined` };
      }
      return {
        passed: false,
        message: `${rule.field} expected null, got ${JSON.stringify(actual)}`,
        actual,
        expected: null,
      };

    case "notNull":
      if (actual !== null && actual !== undefined) {
        return { passed: true, message: `${rule.field} is not null` };
      }
      return {
        passed: false,
        message: `${rule.field} expected non-null value`,
        actual,
        expected: "non-null",
      };

    case "gte":
      if (typeof actual === "number" && actual >= (rule.value as number)) {
        return { passed: true, message: `${rule.field} >= ${rule.value}` };
      }
      return {
        passed: false,
        message: `${rule.field} expected >= ${rule.value}, got ${actual}`,
        actual,
        expected: `>= ${rule.value}`,
      };

    case "lte":
      if (typeof actual === "number" && actual <= (rule.value as number)) {
        return { passed: true, message: `${rule.field} <= ${rule.value}` };
      }
      return {
        passed: false,
        message: `${rule.field} expected <= ${rule.value}, got ${actual}`,
        actual,
        expected: `<= ${rule.value}`,
      };

    case "contains":
      if (Array.isArray(actual) && rule.values) {
        const missing = rule.values.filter((v) => !actual.includes(v));
        if (missing.length === 0) {
          return { passed: true, message: `${rule.field} contains all required values` };
        }
        return {
          passed: false,
          message: `${rule.field} missing values: ${JSON.stringify(missing)}`,
          actual,
          expected: rule.values,
        };
      }
      return {
        passed: false,
        message: `${rule.field} is not an array or values not specified`,
        actual,
        expected: rule.values,
      };

    case "set":
      if (Array.isArray(actual) && rule.values) {
        const actualSet = new Set(actual);
        const expectedSet = new Set(rule.values);
        const matches =
          actualSet.size === expectedSet.size && [...actualSet].every((v) => expectedSet.has(v));
        if (matches) {
          return { passed: true, message: `${rule.field} matches expected set` };
        }
        return {
          passed: false,
          message: `${rule.field} set mismatch`,
          actual: [...actualSet],
          expected: [...expectedSet],
        };
      }
      return {
        passed: false,
        message: `${rule.field} is not an array`,
        actual,
        expected: rule.values,
      };

    case "ordered":
      if (Array.isArray(actual) && rule.values) {
        const matches = JSON.stringify(actual) === JSON.stringify(rule.values);
        if (matches) {
          return { passed: true, message: `${rule.field} matches expected order` };
        }
        return {
          passed: false,
          message: `${rule.field} order mismatch`,
          actual,
          expected: rule.values,
        };
      }
      return {
        passed: false,
        message: `${rule.field} is not an array`,
        actual,
        expected: rule.values,
      };

    case "allMatch":
      if (Array.isArray(actual)) {
        const allMatch = actual.every((v) => v === rule.value);
        if (allMatch) {
          return {
            passed: true,
            message: `${rule.field} all values match ${JSON.stringify(rule.value)}`,
          };
        }
        const nonMatching = actual.filter((v) => v !== rule.value);
        return {
          passed: false,
          message: `${rule.field} has non-matching values: ${JSON.stringify(nonMatching)}`,
          actual: nonMatching,
          expected: rule.value,
        };
      }
      return {
        passed: false,
        message: `${rule.field} is not an array`,
        actual,
        expected: rule.value,
      };

    case "descending":
      if (Array.isArray(actual)) {
        let isDescending = true;
        for (let i = 1; i < actual.length; i++) {
          if (actual[i] > actual[i - 1]) {
            isDescending = false;
            break;
          }
        }
        if (isDescending) {
          return { passed: true, message: `${rule.field} is in descending order` };
        }
        return {
          passed: false,
          message: `${rule.field} is not in descending order`,
          actual,
          expected: "descending order",
        };
      }
      return {
        passed: false,
        message: `${rule.field} is not an array`,
        actual,
        expected: "array in descending order",
      };

    default:
      return {
        passed: false,
        message: `Unknown validation type: ${rule.type}`,
      };
  }
}

// =============================================================================
// GRAPHQL CLIENT
// =============================================================================

async function executeGraphQL(
  apiUrl: string,
  document: string,
  variables: Record<string, unknown>,
  timeout: number
): Promise<{ data: unknown; errors?: unknown[]; latencyMs: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const startTime = Date.now();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: document,
        variables,
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startTime;
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return { ...result, latencyMs };
  } catch (error) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Query timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadScenarios(scenariosPath: string): OracleScenariosFile {
  const fullPath = path.resolve(process.cwd(), scenariosPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(content);
}

function loadGoldenDataset(datasetPath: string): GoldenDataset {
  const fullPath = path.resolve(process.cwd(), datasetPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(content);
}

async function setupGoldenData(
  apiUrl: string,
  dataset: GoldenDataset,
  timeout: number
): Promise<Map<string, string>> {
  const entityIdMap = new Map<string, string>();

  log("Loading golden dataset into graph...");

  // Create entities
  for (let i = 0; i < dataset.entities.length; i++) {
    const entity = dataset.entities[i];

    const mutation = `
      mutation UpsertEntity($input: EntityInput!) {
        upsertEntity(input: $input) {
          id
          label
          entityType
        }
      }
    `;

    const input = {
      entityType: entity.type,
      label: entity.name,
      properties: entity.properties,
      tenantId: "oracle-test",
      confidence: 1.0,
      source: "oracle-runner",
      createdBy: "oracle-runner",
      policyLabels: {
        origin: "oracle-test",
        sensitivity: "INTERNAL",
        clearance: "AUTHORIZED",
        legalBasis: "testing",
        needToKnow: [],
        purposeLimitation: ["testing"],
        retentionClass: "TRANSIENT",
      },
    };

    try {
      const result = await executeGraphQL(apiUrl, mutation, { input }, timeout);
      if (result.data && (result.data as { upsertEntity: { id: string } }).upsertEntity) {
        const id = (result.data as { upsertEntity: { id: string } }).upsertEntity.id;
        entityIdMap.set(`entity_${i}`, id);
        log(`  Created entity ${i}: ${entity.name} -> ${id}`, true);
      }
    } catch (error) {
      log(`  Warning: Failed to create entity ${entity.name}: ${error}`);
    }
  }

  // Create relationships
  for (const rel of dataset.relationships) {
    const fromId = entityIdMap.get(`entity_${rel.from}`);
    const toId = entityIdMap.get(`entity_${rel.to}`);

    if (!fromId || !toId) {
      log(`  Warning: Missing entity for relationship ${rel.type}`);
      continue;
    }

    const mutation = `
      mutation UpsertRelationship($input: RelationshipInput!) {
        upsertRelationship(input: $input) {
          id
          type
        }
      }
    `;

    const input = {
      type: rel.type,
      fromEntityId: fromId,
      toEntityId: toId,
      properties: rel.properties,
      tenantId: "oracle-test",
      confidence: 1.0,
      source: "oracle-runner",
      createdBy: "oracle-runner",
      policyLabels: {
        origin: "oracle-test",
        sensitivity: "INTERNAL",
        clearance: "AUTHORIZED",
        legalBasis: "testing",
        needToKnow: [],
        purposeLimitation: ["testing"],
        retentionClass: "TRANSIENT",
      },
    };

    try {
      await executeGraphQL(apiUrl, mutation, { input }, timeout);
      log(`  Created relationship: ${rel.type}`, true);
    } catch (error) {
      log(`  Warning: Failed to create relationship ${rel.type}: ${error}`);
    }
  }

  return entityIdMap;
}

// =============================================================================
// SCENARIO EXECUTION
// =============================================================================

function interpolateVariables(
  variables: Record<string, unknown>,
  entityIdMap: Map<string, string>,
  entityRefs: Record<string, { index: number; type: string; name: string }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
      const ref = value.slice(2, -2);
      const match = ref.match(/^entities\.(\w+)\.id$/);
      if (match) {
        const entityKey = match[1];
        const entityRef = entityRefs[entityKey];
        if (entityRef) {
          const mappedId = entityIdMap.get(`entity_${entityRef.index}`);
          result[key] = mappedId || value;
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    } else if (typeof value === "object" && value !== null) {
      result[key] = interpolateVariables(value as Record<string, unknown>, entityIdMap, entityRefs);
    } else {
      result[key] = value;
    }
  }

  return result;
}

async function runScenario(
  scenario: OracleScenario,
  config: typeof DEFAULT_CONFIG,
  entityIdMap: Map<string, string>,
  entityRefs: Record<string, { index: number; type: string; name: string }>
): Promise<ScenarioResult> {
  const result: ScenarioResult = {
    id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    status: "SKIP",
    latencyMs: 0,
    validationResults: [],
  };

  if (!scenario.enabled) {
    result.status = "SKIP";
    return result;
  }

  try {
    // Interpolate variables with entity IDs
    const variables = interpolateVariables(scenario.query.variables, entityIdMap, entityRefs);

    log(`  Running scenario ${scenario.id}: ${scenario.name}`, true);
    log(`    Query: ${scenario.query.operation}`, true);
    log(`    Variables: ${JSON.stringify(variables)}`, true);

    // Execute query
    const response = await executeGraphQL(
      config.apiUrl,
      scenario.query.document,
      variables,
      config.timeout
    );

    result.latencyMs = response.latencyMs;
    result.response = response.data;

    // Check for GraphQL errors
    if (response.errors && response.errors.length > 0 && !scenario.expected.noError) {
      result.status = "FAIL";
      result.error = `GraphQL errors: ${JSON.stringify(response.errors)}`;
      return result;
    }

    // Run validations
    let allPassed = true;
    for (const rule of scenario.expected.validation) {
      const validationResult = validateRule(rule, response.data);
      result.validationResults.push({
        rule,
        ...validationResult,
      });
      if (!validationResult.passed) {
        allPassed = false;
      }
    }

    // Check performance thresholds
    if (scenario.expected.performance?.maxLatencyMs) {
      if (result.latencyMs > scenario.expected.performance.maxLatencyMs) {
        result.validationResults.push({
          rule: {
            type: "lte",
            field: "latency",
            value: scenario.expected.performance.maxLatencyMs,
          },
          passed: false,
          message: `Latency ${result.latencyMs}ms exceeded max ${scenario.expected.performance.maxLatencyMs}ms`,
          actual: result.latencyMs,
          expected: scenario.expected.performance.maxLatencyMs,
        });
        allPassed = false;
      }
    }

    result.status = allPassed ? "PASS" : "FAIL";
  } catch (error) {
    result.status = "ERROR";
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateReport(results: ScenarioResult[], config: typeof DEFAULT_CONFIG): OracleReport {
  const report: OracleReport = {
    timestamp: new Date().toISOString(),
    apiUrl: config.apiUrl,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "PASS").length,
      failed: results.filter((r) => r.status === "FAIL").length,
      skipped: results.filter((r) => r.status === "SKIP").length,
      errors: results.filter((r) => r.status === "ERROR").length,
      successRate: 0,
    },
    resultsByCategory: {},
    performanceSummary: {},
    failures: results.filter((r) => r.status === "FAIL" || r.status === "ERROR"),
  };

  report.summary.successRate =
    report.summary.total > 0 ? Math.round((report.summary.passed / report.summary.total) * 100) : 0;

  // Group by category
  for (const result of results) {
    if (!report.resultsByCategory[result.category]) {
      report.resultsByCategory[result.category] = [];
    }
    report.resultsByCategory[result.category].push(result);
  }

  // Calculate performance summary by category
  for (const [category, categoryResults] of Object.entries(report.resultsByCategory)) {
    const latencies = categoryResults
      .filter((r) => r.status === "PASS" || r.status === "FAIL")
      .map((r) => r.latencyMs)
      .sort((a, b) => a - b);

    if (latencies.length > 0) {
      report.performanceSummary[category] = {
        avgMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
        p95Ms: latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1],
        p99Ms: latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1],
        maxMs: Math.max(...latencies),
      };
    }
  }

  return report;
}

function generateMarkdownReport(report: OracleReport): string {
  const lines: string[] = [
    "# Graph Query Oracle Report",
    "",
    `**Generated:** ${report.timestamp}`,
    `**API URL:** ${report.apiUrl}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Scenarios | ${report.summary.total} |`,
    `| Passed | ${report.summary.passed} |`,
    `| Failed | ${report.summary.failed} |`,
    `| Skipped | ${report.summary.skipped} |`,
    `| Errors | ${report.summary.errors} |`,
    `| Success Rate | ${report.summary.successRate}% |`,
    "",
  ];

  // Results by category
  lines.push("## Results by Category", "");

  for (const [category, results] of Object.entries(report.resultsByCategory)) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`, "");
    lines.push("| Scenario | Status | Latency (ms) | Details |");
    lines.push("|----------|--------|--------------|---------|");

    for (const result of results) {
      const status =
        result.status === "PASS"
          ? "✅ PASS"
          : result.status === "FAIL"
            ? "❌ FAIL"
            : result.status === "SKIP"
              ? "⏭️ SKIP"
              : "⚠️ ERROR";
      const details = result.error
        ? result.error.substring(0, 50)
        : result.validationResults.filter((v) => !v.passed).length > 0
          ? `${result.validationResults.filter((v) => !v.passed).length} validation(s) failed`
          : "-";
      lines.push(`| ${result.id}: ${result.name} | ${status} | ${result.latencyMs} | ${details} |`);
    }
    lines.push("");
  }

  // Failures detail
  if (report.failures.length > 0) {
    lines.push("## Failures", "");

    for (const failure of report.failures) {
      lines.push(`### ${failure.id}: ${failure.name}`, "");

      if (failure.error) {
        lines.push(`**Error:** ${failure.error}`, "");
      }

      const failedValidations = failure.validationResults.filter((v) => !v.passed);
      if (failedValidations.length > 0) {
        lines.push("**Failed Validations:**", "");
        for (const v of failedValidations) {
          lines.push(`- ${v.message}`);
          if (v.expected !== undefined) {
            lines.push(`  - Expected: \`${JSON.stringify(v.expected)}\``);
          }
          if (v.actual !== undefined) {
            lines.push(`  - Actual: \`${JSON.stringify(v.actual)}\``);
          }
        }
        lines.push("");
      }
    }
  }

  // Performance summary
  if (Object.keys(report.performanceSummary).length > 0) {
    lines.push("## Performance Summary", "");
    lines.push("| Category | Avg (ms) | P95 (ms) | P99 (ms) | Max (ms) |");
    lines.push("|----------|----------|----------|----------|----------|");

    for (const [category, perf] of Object.entries(report.performanceSummary)) {
      lines.push(`| ${category} | ${perf.avgMs} | ${perf.p95Ms} | ${perf.p99Ms} | ${perf.maxMs} |`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---", "");
  lines.push("*Generated by Graph Query Oracle Runner*");

  return lines.join("\n");
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const config = parseArgs();

  console.log("=".repeat(60));
  console.log("Graph Query Correctness Oracle");
  console.log("=".repeat(60));
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Scenarios: ${config.scenariosPath}`);
  console.log("");

  // Load scenarios
  let scenarios: OracleScenariosFile;
  try {
    scenarios = loadScenarios(config.scenariosPath);
    console.log(`Loaded ${scenarios.scenarios.length} scenarios from oracle definition`);
  } catch (error) {
    console.error(`Failed to load scenarios: ${error}`);
    process.exit(1);
  }

  // Load golden dataset
  let goldenDataset: GoldenDataset;
  try {
    goldenDataset = loadGoldenDataset(scenarios.goldenDatasetRef);
    console.log(`Loaded golden dataset: ${goldenDataset.investigation.name}`);
  } catch (error) {
    console.error(`Failed to load golden dataset: ${error}`);
    process.exit(1);
  }

  // Setup golden data if not skipped
  let entityIdMap = new Map<string, string>();
  if (!config.skipSetup) {
    try {
      entityIdMap = await setupGoldenData(config.apiUrl, goldenDataset, config.timeout);
      console.log(`Setup complete: ${entityIdMap.size} entities created`);
    } catch (error) {
      console.warn(`Warning: Failed to setup golden data: ${error}`);
      console.warn("Continuing with existing data...");
      // Create mock entity IDs for scenarios that reference them
      for (let i = 0; i < goldenDataset.entities.length; i++) {
        entityIdMap.set(`entity_${i}`, `mock-entity-${i}`);
      }
    }
  }

  // Filter scenarios
  let scenariosToRun = scenarios.scenarios;
  if (config.scenario) {
    scenariosToRun = scenariosToRun.filter((s) => s.id === config.scenario);
  }
  if (config.category) {
    scenariosToRun = scenariosToRun.filter((s) => s.category === config.category);
  }

  console.log(`\nRunning ${scenariosToRun.length} scenarios...`);
  console.log("-".repeat(60));

  // Run scenarios
  const results: ScenarioResult[] = [];
  for (const scenario of scenariosToRun) {
    const result = await runScenario(scenario, config, entityIdMap, scenarios.entityReferences);
    results.push(result);

    const statusIcon =
      result.status === "PASS"
        ? "✅"
        : result.status === "FAIL"
          ? "❌"
          : result.status === "SKIP"
            ? "⏭️"
            : "⚠️";
    console.log(`${statusIcon} ${result.id}: ${result.name} (${result.latencyMs}ms)`);

    if (config.verbose && result.validationResults.some((v) => !v.passed)) {
      for (const v of result.validationResults.filter((v) => !v.passed)) {
        console.log(`   - ${v.message}`);
      }
    }
  }

  console.log("-".repeat(60));

  // Generate report
  const report = generateReport(results, config);
  const markdownReport = generateMarkdownReport(report);

  // Save report
  const reportDir = path.resolve(process.cwd(), config.reportDir);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, "graph-oracle-report.md");
  fs.writeFileSync(reportPath, markdownReport);
  console.log(`\nReport saved to: ${reportPath}`);

  // Also save JSON report
  const jsonReportPath = path.join(reportDir, "graph-oracle-report.json");
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  console.log(`JSON report saved to: ${jsonReportPath}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Total: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Skipped: ${report.summary.skipped}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`Success Rate: ${report.summary.successRate}%`);

  // Exit with error code if any failures
  if (report.summary.failed > 0 || report.summary.errors > 0) {
    console.log("\n❌ Oracle validation FAILED");
    process.exit(1);
  }

  console.log("\n✅ Oracle validation PASSED");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
