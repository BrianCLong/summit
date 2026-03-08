"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDependencyIntake = evaluateDependencyIntake;
exports.scanRepoDependencies = scanRepoDependencies;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function evaluateDependencyIntake(deps, denylist) {
    const findings = [];
    const denySet = new Set(denylist.packages);
    for (const d of deps) {
        // Check strict denylist
        if (denySet.has(d.name)) {
            findings.push({ dep: d, reason: `denylisted-package: ${d.name}`, severity: 'high' });
        }
        // Check patterns
        for (const p of denylist.patterns) {
            if (d.name.includes(p)) {
                findings.push({ dep: d, reason: `suspicious-pattern: ${p}`, severity: 'high' });
            }
        }
        // Heuristics
        // Suspicious name length
        if (d.name.length > 60) {
            findings.push({ dep: d, reason: 'suspicious-name-length', severity: 'low' });
        }
    }
    return findings;
}
function scanRepoDependencies(rootDir = '.') {
    const deps = [];
    function walk(dir) {
        if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist') || dir.includes('artifacts'))
            return;
        try {
            const files = fs_1.default.readdirSync(dir);
            for (const f of files) {
                const fullPath = path_1.default.join(dir, f);
                // Symlink loop protection
                const lstat = fs_1.default.lstatSync(fullPath);
                if (lstat.isSymbolicLink())
                    continue;
                if (lstat.isDirectory()) {
                    walk(fullPath);
                }
                else if (f === 'package.json') {
                    try {
                        const content = JSON.parse(fs_1.default.readFileSync(fullPath, 'utf-8'));
                        const allDeps = {
                            ...content.dependencies,
                            ...content.devDependencies,
                            ...content.peerDependencies
                        };
                        for (const [name, version] of Object.entries(allDeps)) {
                            deps.push({
                                name,
                                version: version,
                                sourceFile: fullPath
                            });
                        }
                    }
                    catch (e) {
                        // ignore invalid json
                    }
                }
            }
        }
        catch (e) {
            // ignore access errors
        }
    }
    walk(rootDir);
    return deps;
}
