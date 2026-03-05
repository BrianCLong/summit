import fs from "node:fs";
import path from "node:path";

const ROUTE_PATTERN = /(page|layout|route)\.(tsx|ts|jsx|js)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next"]);

export interface PracticeViolation {
  file: string;
  ruleId: "RBP-002" | "RBP-003";
  message: string;
}

export interface PracticeResult {
  violations: PracticeViolation[];
  summary: {
    totalFiles: number;
    eligibleRoutes: number;
    streamingEligibleRoutes: number;
    streamingCoveredRoutes: number;
    violations: number;
  };
}

function walk(root: string): string[] {
  const files: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(fullPath);
      } else if (ROUTE_PATTERN.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function relative(root: string, file: string): string {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function hasCacheDirective(source: string): boolean {
  return (
    /export\s+const\s+(revalidate|fetchCache|dynamic)\s*=/.test(source) ||
    /fetch\([^)]*cache\s*:\s*['"](?:force-cache|no-store)['"]/s.test(source) ||
    /fetch\([^)]*next\s*:\s*\{[^}]*revalidate\s*:/s.test(source)
  );
}

function isStreamingEligible(source: string): boolean {
  return (
    /export\s+default\s+async\s+function/.test(source) || /async\s+function\s+[A-Z]/.test(source)
  );
}

function hasStreamingBoundary(filePath: string, source: string): boolean {
  if (/<Suspense[\s>]/.test(source)) {
    return true;
  }
  const loadingTsx = path.join(path.dirname(filePath), "loading.tsx");
  const loadingJsx = path.join(path.dirname(filePath), "loading.jsx");
  return fs.existsSync(loadingTsx) || fs.existsSync(loadingJsx);
}

export function validateReactPractices(projectRoot: string): PracticeResult {
  const root = path.resolve(projectRoot);
  const routeFiles = walk(root);
  const violations: PracticeViolation[] = [];
  let streamingEligibleRoutes = 0;
  let streamingCoveredRoutes = 0;

  for (const file of routeFiles) {
    const source = fs.readFileSync(file, "utf8");
    const rel = relative(root, file);

    if (!hasCacheDirective(source)) {
      violations.push({
        file: rel,
        ruleId: "RBP-002",
        message: "Route does not declare cache strategy.",
      });
    }

    if (isStreamingEligible(source)) {
      streamingEligibleRoutes += 1;
      if (hasStreamingBoundary(file, source)) {
        streamingCoveredRoutes += 1;
      } else {
        violations.push({
          file: rel,
          ruleId: "RBP-003",
          message: "Async route does not declare a streaming boundary.",
        });
      }
    }
  }

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.ruleId.localeCompare(b.ruleId));

  return {
    violations,
    summary: {
      totalFiles: routeFiles.length,
      eligibleRoutes: routeFiles.length,
      streamingEligibleRoutes,
      streamingCoveredRoutes,
      violations: violations.length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = process.argv[2] ?? process.cwd();
  const result = validateReactPractices(projectRoot);
  if (result.violations.length > 0) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}
