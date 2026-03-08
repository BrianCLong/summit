import fs from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next"]);

export interface BoundaryViolation {
  file: string;
  importPath: string;
  ruleId: "RBP-001";
  message: string;
}

export interface BoundaryAnalysisResult {
  violations: BoundaryViolation[];
  clientFiles: string[];
  scannedFiles: number;
}

function walkFiles(root: string): string[] {
  const results: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }
      if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function normalizeForReport(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}

function isClientModule(source: string): boolean {
  const compact = source.trimStart();
  return compact.startsWith("'use client'") || compact.startsWith('"use client"');
}

function parseImportSpecifiers(source: string): string[] {
  const imports = new Set<string>();
  const patterns = [
    /import\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+[^'";]*from\s+['"]([^'"]+)['"]/g,
    /import\(['"]([^'"]+)['"]\)/g,
    /require\(['"]([^'"]+)['"]\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier) imports.add(specifier);
    }
  }

  return [...imports].sort((a, b) => a.localeCompare(b));
}

function resolveImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export function analyzeBoundary(projectRoot: string): BoundaryAnalysisResult {
  const root = path.resolve(projectRoot);
  const files = walkFiles(root);
  const clientFiles = new Set<string>();
  const importGraph = new Map<string, string[]>();

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (isClientModule(source)) {
      clientFiles.add(file);
    }
    importGraph.set(file, parseImportSpecifiers(source));
  }

  const violations: BoundaryViolation[] = [];
  for (const file of files) {
    if (clientFiles.has(file)) continue;

    const imports = importGraph.get(file) ?? [];
    for (const specifier of imports) {
      const resolved = resolveImport(file, specifier);
      if (resolved && clientFiles.has(resolved)) {
        violations.push({
          file: normalizeForReport(root, file),
          importPath: normalizeForReport(root, resolved),
          ruleId: "RBP-001",
          message: "Server context imports a client-only module.",
        });
      }
    }
  }

  violations.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.importPath.localeCompare(b.importPath) ||
      a.ruleId.localeCompare(b.ruleId)
  );

  return {
    violations,
    clientFiles: [...clientFiles]
      .map((f) => normalizeForReport(root, f))
      .sort((a, b) => a.localeCompare(b)),
    scannedFiles: files.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = process.argv[2] ?? process.cwd();
  const result = analyzeBoundary(projectRoot);
  if (result.violations.length > 0) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}
