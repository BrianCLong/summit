"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBoundary = analyzeBoundary;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next"]);
function walkFiles(root) {
    const results = [];
    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const fullPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) {
                    stack.push(fullPath);
                }
                continue;
            }
            if (SOURCE_EXTENSIONS.includes(node_path_1.default.extname(entry.name))) {
                results.push(fullPath);
            }
        }
    }
    return results.sort((a, b) => a.localeCompare(b));
}
function normalizeForReport(projectRoot, filePath) {
    return node_path_1.default.relative(projectRoot, filePath).replaceAll(node_path_1.default.sep, "/");
}
function isClientModule(source) {
    const compact = source.trimStart();
    return compact.startsWith("'use client'") || compact.startsWith('"use client"');
}
function parseImportSpecifiers(source) {
    const imports = new Set();
    const patterns = [
        /import\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g,
        /export\s+[^'";]*from\s+['"]([^'"]+)['"]/g,
        /import\(['"]([^'"]+)['"]\)/g,
        /require\(['"]([^'"]+)['"]\)/g,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const specifier = match[1];
            if (specifier)
                imports.add(specifier);
        }
    }
    return [...imports].sort((a, b) => a.localeCompare(b));
}
function resolveImport(fromFile, specifier) {
    if (!specifier.startsWith(".")) {
        return null;
    }
    const base = node_path_1.default.resolve(node_path_1.default.dirname(fromFile), specifier);
    const candidates = [
        base,
        ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
        ...SOURCE_EXTENSIONS.map((ext) => node_path_1.default.join(base, `index${ext}`)),
    ];
    for (const candidate of candidates) {
        if (node_fs_1.default.existsSync(candidate) && node_fs_1.default.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    return null;
}
function analyzeBoundary(projectRoot) {
    const root = node_path_1.default.resolve(projectRoot);
    const files = walkFiles(root);
    const clientFiles = new Set();
    const importGraph = new Map();
    for (const file of files) {
        const source = node_fs_1.default.readFileSync(file, "utf8");
        if (isClientModule(source)) {
            clientFiles.add(file);
        }
        importGraph.set(file, parseImportSpecifiers(source));
    }
    const violations = [];
    for (const file of files) {
        if (clientFiles.has(file))
            continue;
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
    violations.sort((a, b) => a.file.localeCompare(b.file) ||
        a.importPath.localeCompare(b.importPath) ||
        a.ruleId.localeCompare(b.ruleId));
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
