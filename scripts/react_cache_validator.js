"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReactPractices = validateReactPractices;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ROUTE_PATTERN = /(page|layout|route)\.(tsx|ts|jsx|js)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next"]);
function walk(root) {
    const files = [];
    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const fullPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name))
                    stack.push(fullPath);
            }
            else if (ROUTE_PATTERN.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }
    return files.sort((a, b) => a.localeCompare(b));
}
function relative(root, file) {
    return node_path_1.default.relative(root, file).replaceAll(node_path_1.default.sep, "/");
}
function hasCacheDirective(source) {
    return (/export\s+const\s+(revalidate|fetchCache|dynamic)\s*=/.test(source) ||
        /fetch\([^)]*cache\s*:\s*['"](?:force-cache|no-store)['"]/s.test(source) ||
        /fetch\([^)]*next\s*:\s*\{[^}]*revalidate\s*:/s.test(source));
}
function isStreamingEligible(source) {
    return (/export\s+default\s+async\s+function/.test(source) || /async\s+function\s+[A-Z]/.test(source));
}
function hasStreamingBoundary(filePath, source) {
    if (/<Suspense[\s>]/.test(source)) {
        return true;
    }
    const loadingTsx = node_path_1.default.join(node_path_1.default.dirname(filePath), "loading.tsx");
    const loadingJsx = node_path_1.default.join(node_path_1.default.dirname(filePath), "loading.jsx");
    return node_fs_1.default.existsSync(loadingTsx) || node_fs_1.default.existsSync(loadingJsx);
}
function validateReactPractices(projectRoot) {
    const root = node_path_1.default.resolve(projectRoot);
    const routeFiles = walk(root);
    const violations = [];
    let streamingEligibleRoutes = 0;
    let streamingCoveredRoutes = 0;
    for (const file of routeFiles) {
        const source = node_fs_1.default.readFileSync(file, "utf8");
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
            }
            else {
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
