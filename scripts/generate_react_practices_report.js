"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const react_boundary_analyzer_ts_1 = require("./react_boundary_analyzer.ts");
const react_cache_validator_ts_1 = require("./react_cache_validator.ts");
const RULES_VERSION = "1.0.0";
const REPORT_DIR = node_path_1.default.join("reports", "react-best-practices");
function ensureDir(dir) {
    node_fs_1.default.mkdirSync(dir, { recursive: true });
}
function getCommit() {
    return (0, node_child_process_1.execSync)("git rev-parse HEAD", { encoding: "utf8" }).trim();
}
function writeJson(filePath, value) {
    node_fs_1.default.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function main() {
    const root = node_path_1.default.resolve(process.argv[2] ?? process.cwd());
    const boundary = (0, react_boundary_analyzer_ts_1.analyzeBoundary)(root);
    const practices = (0, react_cache_validator_ts_1.validateReactPractices)(root);
    const report = {
        violations: [...boundary.violations, ...practices.violations].sort((a, b) => {
            const fileCmp = a.file.localeCompare(b.file);
            if (fileCmp !== 0)
                return fileCmp;
            const ruleCmp = a.ruleId.localeCompare(b.ruleId);
            if (ruleCmp !== 0)
                return ruleCmp;
            return ("importPath" in a ? a.importPath : "").localeCompare(("importPath" in b ? b.importPath : ""));
        }),
        summary: {
            scannedFiles: boundary.scannedFiles,
            routeFiles: practices.summary.totalFiles,
            boundaryViolations: boundary.violations.length,
            cacheViolations: practices.violations.filter((v) => v.ruleId === "RBP-002").length,
            streamingViolations: practices.violations.filter((v) => v.ruleId === "RBP-003").length,
            totalViolations: boundary.violations.length + practices.violations.length,
        },
    };
    const streamingCoveragePercent = practices.summary.streamingEligibleRoutes === 0
        ? 100
        : Number(((practices.summary.streamingCoveredRoutes / practices.summary.streamingEligibleRoutes) *
            100).toFixed(2));
    const metrics = {
        boundaryViolations: boundary.violations.length,
        cacheViolations: practices.violations.filter((v) => v.ruleId === "RBP-002").length,
        streamingCoveragePercent,
    };
    const stamp = {
        commit: getCommit(),
        rulesVersion: RULES_VERSION,
    };
    const reportDir = node_path_1.default.join(root, REPORT_DIR);
    ensureDir(reportDir);
    writeJson(node_path_1.default.join(reportDir, "report.json"), report);
    writeJson(node_path_1.default.join(reportDir, "metrics.json"), metrics);
    writeJson(node_path_1.default.join(reportDir, "stamp.json"), stamp);
    const hasViolations = report.summary.totalViolations > 0;
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return hasViolations ? 1 : 0;
}
process.exitCode = main();
