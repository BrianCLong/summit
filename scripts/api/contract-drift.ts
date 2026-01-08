import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import * as ts from "typescript";

interface DriftRoute {
  method: string;
  path: string;
  sourceFile: string;
}

interface DriftReport {
  services: ServiceReport[];
  hasDrift: boolean;
}

interface DiffResult<T> {
  inSpec: T[];
  inCode: T[];
  missingInSpec: T[];
  missingInCode: T[];
}

interface ServiceReport {
  name: string;
  root: string;
  specPath: string;
  reportPath: string;
  markdownPath: string;
  routes: {
    inSpec: DriftRoute[];
    inCode: DriftRoute[];
    missingInSpec: DriftRoute[];
    missingInCode: DriftRoute[];
  };
  schemas: {
    inSpec: string[];
    inCode: string[];
    missingInCode: string[];
    missingInSpec: string[];
  };
  validators: {
    missingValidators: DriftRoute[];
  };
}

function serviceHasDrift(service: ServiceReport): boolean {
  return (
    service.routes.missingInSpec.length > 0 ||
    service.routes.missingInCode.length > 0 ||
    service.schemas.missingInCode.length > 0 ||
    service.schemas.missingInSpec.length > 0 ||
    service.validators.missingValidators.length > 0
  );
}

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".turbo",
  "dist",
  "build",
  "venv",
  ".venv",
]);

const DEFAULT_REPORT_DIR = path.join("reports", "contract-drift");

function gatherCodeFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...gatherCodeFiles(fullPath));
      continue;
    }
    if (/\.(ts|js|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const key = raw.replace(/^--/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadSpec(specPath: string): any {
  const raw = fs.readFileSync(specPath, "utf8");
  if (specPath.endsWith(".json")) {
    return JSON.parse(raw);
  }
  return yaml.load(raw);
}

function saveSpec(specPath: string, spec: any): void {
  const content = specPath.endsWith(".json")
    ? JSON.stringify(spec, null, 2)
    : yaml.dump(spec, { noRefs: true, lineWidth: 120 });
  fs.writeFileSync(specPath, content);
}

function walkForOpenApi(startDir: string, limitDepth = 6): string[] {
  const results: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: startDir, depth: 0 }];
  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    if (depth > limitDepth) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        queue.push({ dir: fullPath, depth: depth + 1 });
        continue;
      }
      if (/openapi\.(yaml|yml|json)$/i.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function normalisePath(prefix: string, child: string): string {
  const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const tail = child.startsWith("/") ? child : `/${child}`;
  return `${base}${tail}`.replace(/\/+/g, "/");
}

function resolveImport(currentFile: string, importPath: string): string | null {
  const base = importPath.startsWith(".")
    ? path.resolve(path.dirname(currentFile), importPath)
    : null;
  if (!base) return null;
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function collectExports(filePath: string, source: string): Set<string> {
  const names = new Set<string>();
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.ESNext, true);
  const visit = (node: ts.Node): void => {
    if (
      (ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      names.add(node.name.text);
    }
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      node.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          names.add(decl.name.text);
        }
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

function collectRoutes(
  filePath: string,
  routerPrefixes: Map<string, Set<string>>,
  validatorHints: Set<string>
): DriftRoute[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.ESNext, true);
  const imports = new Map<string, string>();

  sf.forEachChild((node) => {
    if (
      !ts.isImportDeclaration(node) ||
      !node.importClause?.name ||
      !ts.isStringLiteral(node.moduleSpecifier)
    )
      return;
    imports.set(node.importClause.name.text, node.moduleSpecifier.text);
  });

  const filePrefixes = routerPrefixes.get(filePath) ?? new Set<string>([""]);
  const routes: DriftRoute[] = [];

  const visit = (node: ts.Node): void => {
    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }
    if (!ts.isPropertyAccessExpression(node.expression)) {
      ts.forEachChild(node, visit);
      return;
    }

    const method = node.expression.name.text.toLowerCase();
    const callee = node.expression.expression;

    if (method === "use") {
      const [pathArg, routerArg] = node.arguments;
      if (pathArg && ts.isStringLiteralLike(pathArg) && routerArg && ts.isIdentifier(routerArg)) {
        const specifier = imports.get(routerArg.text);
        const resolved = specifier ? resolveImport(filePath, specifier) : null;
        if (resolved) {
          const prefixes = routerPrefixes.get(resolved) ?? new Set<string>();
          prefixes.add(pathArg.text);
          routerPrefixes.set(resolved, prefixes);
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    if (HTTP_METHODS.has(method)) {
      const [pathArg] = node.arguments;
      if (pathArg && ts.isStringLiteralLike(pathArg)) {
        for (const prefix of filePrefixes) {
          routes.push({
            method,
            path: normalisePath(prefix, pathArg.text),
            sourceFile: filePath,
          });
        }
      }
      if (
        source.includes("safeParse") ||
        source.includes("validate") ||
        source.includes("parse(")
      ) {
        validatorHints.add(filePath);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return routes;
}

function collectCodeSchemas(files: string[]): Set<string> {
  const results = new Set<string>();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    collectExports(file, source).forEach((name) => results.add(name));
  }
  return results;
}

function collectOpenApiRoutes(spec: any, specPath: string): DriftRoute[] {
  if (!spec.paths) return [];
  const routes: DriftRoute[] = [];
  for (const [routePath, methods] of Object.entries<any>(spec.paths)) {
    if (typeof methods !== "object" || Array.isArray(methods)) continue;
    for (const [method, operation] of Object.entries<any>(methods)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      routes.push({
        method: method.toLowerCase(),
        path: routePath,
        sourceFile: specPath,
      });
    }
  }
  return routes;
}

function collectOpenApiSchemas(spec: any): Set<string> {
  const names = new Set<string>();
  const schemaObj = spec.components?.schemas;
  if (!schemaObj || typeof schemaObj !== "object") return names;
  Object.keys(schemaObj).forEach((name) => names.add(name));
  return names;
}

function computeDiff<T>(codeItems: T[], specItems: T[], hash: (item: T) => string): DiffResult<T> {
  const codeMap = new Map<string, T>();
  const specMap = new Map<string, T>();
  codeItems.forEach((item) => codeMap.set(hash(item), item));
  specItems.forEach((item) => specMap.set(hash(item), item));

  const missingInSpec: T[] = [];
  const missingInCode: T[] = [];

  for (const [key, item] of codeMap.entries()) {
    if (!specMap.has(key)) missingInSpec.push(item);
  }
  for (const [key, item] of specMap.entries()) {
    if (!codeMap.has(key)) missingInCode.push(item);
  }

  return {
    inSpec: specItems,
    inCode: codeItems,
    missingInSpec,
    missingInCode,
  };
}

function writeMarkdown(report: DriftReport, outputPath: string): void {
  const lines: string[] = ["# API Contract Drift Report", ""];
  report.services.forEach((service) => {
    lines.push(`## ${service.name}`);
    lines.push("");
    lines.push(`Spec: ${service.specPath}`);
    lines.push("");
    lines.push("### Route Drift");
    if (service.routes.missingInSpec.length === 0 && service.routes.missingInCode.length === 0) {
      lines.push("- Routes are in sync.");
    } else {
      if (service.routes.missingInSpec.length > 0) {
        lines.push("- Missing in spec:");
        service.routes.missingInSpec.forEach((r) =>
          lines.push(`  - ${r.method.toUpperCase()} ${r.path} (${r.sourceFile})`)
        );
      }
      if (service.routes.missingInCode.length > 0) {
        lines.push("- Missing in code:");
        service.routes.missingInCode.forEach((r) =>
          lines.push(`  - ${r.method.toUpperCase()} ${r.path} (${r.sourceFile})`)
        );
      }
    }
    lines.push("");
    lines.push("### Schema Drift");
    if (service.schemas.missingInSpec.length === 0 && service.schemas.missingInCode.length === 0) {
      lines.push("- Schemas are in sync.");
    } else {
      if (service.schemas.missingInSpec.length > 0) {
        lines.push("- Missing in spec schemas:");
        service.schemas.missingInSpec.forEach((s) => lines.push(`  - ${s}`));
      }
      if (service.schemas.missingInCode.length > 0) {
        lines.push("- Missing in code schemas:");
        service.schemas.missingInCode.forEach((s) => lines.push(`  - ${s}`));
      }
    }
    lines.push("");
    lines.push("### Validation coverage");
    if (service.validators.missingValidators.length === 0) {
      lines.push("- Validators detected for all routes.");
    } else {
      lines.push("- Routes without validator hints:");
      service.validators.missingValidators.forEach((r) =>
        lines.push(`  - ${r.method.toUpperCase()} ${r.path} (${r.sourceFile})`)
      );
    }
    lines.push("");
  });
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
}

function writeJson(report: DriftReport, outputPath: string): void {
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function buildServiceReport(specPath: string, rootDir: string, autofix: boolean): ServiceReport {
  const spec = loadSpec(specPath);
  const serviceName = path.basename(path.dirname(specPath));
  const srcDir = path.join(path.dirname(specPath), "src");
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source directory not found for ${serviceName}: ${srcDir}`);
  }
  const codeFiles = gatherCodeFiles(srcDir);
  const routerPrefixes = new Map<string, Set<string>>();
  const validatorHints = new Set<string>();
  codeFiles.forEach((file) => {
    collectRoutes(file, routerPrefixes, validatorHints);
  });

  const routeMap = new Map<string, DriftRoute>();
  codeFiles.forEach((file) => {
    const routes = collectRoutes(file, routerPrefixes, validatorHints);
    routes.forEach((route) => {
      routeMap.set(`${route.method}:${route.path}:${route.sourceFile}`, route);
    });
  });
  const codeRoutes = Array.from(routeMap.values());

  const specRoutes = collectOpenApiRoutes(spec, specPath);
  const routeDiff = computeDiff(codeRoutes, specRoutes, (r) => `${r.method}:${r.path}`);

  const codeSchemas = collectCodeSchemas(codeFiles);
  const specSchemas = collectOpenApiSchemas(spec);
  const schemaDiff = computeDiff(Array.from(codeSchemas), Array.from(specSchemas), (s) => s);

  const missingValidators = routeDiff.inCode.filter(
    (route) => !validatorHints.has(route.sourceFile)
  );

  if (autofix) {
    applyAutofix(spec, specPath, routeDiff, schemaDiff, srcDir);
  }

  const reportPath = path.join(DEFAULT_REPORT_DIR, `${serviceName}-report.json`);
  const markdownPath = path.join(DEFAULT_REPORT_DIR, `${serviceName}-report.md`);

  return {
    name: serviceName,
    root: rootDir,
    specPath,
    reportPath,
    markdownPath,
    routes: routeDiff,
    schemas: schemaDiff,
    validators: { missingValidators },
  };
}

function applyAutofix(
  spec: any,
  specPath: string,
  routeDiff: DiffResult<DriftRoute>,
  schemaDiff: DiffResult<string>,
  srcDir: string
): void {
  let updated = false;
  if (!spec.components) spec.components = {};
  if (!spec.components.schemas) spec.components.schemas = {};
  if (!spec.paths) spec.paths = {};

  if (!spec.components.schemas.AnyValue) {
    spec.components.schemas.AnyValue = { type: "object", additionalProperties: true };
    updated = true;
  }

  for (const missing of routeDiff.missingInSpec) {
    if (!spec.paths[missing.path]) spec.paths[missing.path] = {};
    if (!spec.paths[missing.path][missing.method]) {
      spec.paths[missing.path][missing.method] = {
        summary: `Autogenerated for ${missing.method.toUpperCase()} ${missing.path}`,
        responses: {
          200: {
            description: "Auto-added placeholder response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnyValue" },
              },
            },
          },
        },
      };
      updated = true;
    }
  }

  if (schemaDiff.missingInCode.length > 0) {
    const stubPath = path.join(srcDir, "openapi-schemas.generated.ts");
    const lines = [
      "import { z } from 'zod';",
      "",
      "/* Auto-generated to mirror OpenAPI schemas */",
    ];
    schemaDiff.missingInCode.forEach((schemaName) => {
      lines.push(`export const ${schemaName}Schema = z.any();`);
      lines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`);
      lines.push("");
    });
    fs.writeFileSync(stubPath, `${lines.join("\n")}\n`);
    updated = true;
  }

  if (updated) {
    saveSpec(specPath, spec);
  }
}

function buildDriftReport(options: {
  service?: string;
  report?: string;
  markdown?: string;
  autofix: boolean;
}): DriftReport {
  const searchRoot = options.service ? path.resolve(options.service) : path.resolve(".");
  const openapiFiles = walkForOpenApi(searchRoot);
  if (openapiFiles.length === 0) {
    throw new Error("No OpenAPI specs found");
  }

  const services: ServiceReport[] = [];
  openapiFiles.forEach((specPath) => {
    const srcDir = path.join(path.dirname(specPath), "src");
    if (!fs.existsSync(srcDir)) {
      console.warn(`Skipping ${specPath} because ${srcDir} is missing.`);
      return;
    }
    const report = buildServiceReport(specPath, path.dirname(specPath), options.autofix);
    services.push(report);
    const drifted = serviceHasDrift(report);
    writeJson({ services: [report], hasDrift: drifted }, report.reportPath);
    writeMarkdown({ services: [report], hasDrift: drifted }, report.markdownPath);
  });

  if (services.length === 0) {
    throw new Error("No OpenAPI specs with matching source directories were found.");
  }

  const hasDrift = services.some((svc) => serviceHasDrift(svc));
  const reportPath = options.report ?? path.join(DEFAULT_REPORT_DIR, "contract-drift-report.json");
  const markdownPath =
    options.markdown ?? path.join(DEFAULT_REPORT_DIR, "contract-drift-report.md");
  const aggregate: DriftReport = { services, hasDrift };
  writeJson(aggregate, reportPath);
  writeMarkdown(aggregate, markdownPath);
  return aggregate;
}

function printHelp(): void {
  console.log(
    `Usage: node --loader ts-node/esm scripts/api/contract-drift.ts [options]\n\n` +
      `Options:\n` +
      `  --service <path>   Limit scan to a specific service directory\n` +
      `  --report <path>    Write aggregate JSON report to path (default: ${DEFAULT_REPORT_DIR}/contract-drift-report.json)\n` +
      `  --markdown <path>  Write aggregate Markdown report (default: ${DEFAULT_REPORT_DIR}/contract-drift-report.md)\n` +
      `  --autofix          Apply autofix to specs/types (adds missing routes, generates stubs)\n` +
      `  --no-fail          Do not exit with non-zero status when drift is detected\n` +
      `  --help             Show this help\n`
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  const autofix = Boolean(args.autofix);
  const failOnDrift = args["no-fail"] ? false : true;
  const report = buildDriftReport({
    service: typeof args.service === "string" ? args.service : undefined,
    report: typeof args.report === "string" ? args.report : undefined,
    markdown: typeof args.markdown === "string" ? args.markdown : undefined,
    autofix,
  });

  if (report.hasDrift && failOnDrift) {
    console.error("API contract drift detected. See reports for details.");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
