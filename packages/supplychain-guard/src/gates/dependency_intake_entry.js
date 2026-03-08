"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const runner_js_1 = require("../runner.js");
const dependency_intake_js_1 = require("./dependency_intake.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
async function main() {
    await (0, runner_js_1.runGate)('dependency-intake', async () => {
        // Load rules
        // The structure is src/gates/entry.ts, rules are in src/rules/denylist.json
        // So ../rules/denylist.json from here
        const rulesPath = path_1.default.join(__dirname, '../rules/denylist.json');
        let rules = { packages: [], patterns: [] };
        if (fs_1.default.existsSync(rulesPath)) {
            rules = JSON.parse(fs_1.default.readFileSync(rulesPath, 'utf-8'));
        }
        else {
            console.warn(`Denylist rules not found at ${rulesPath}, using empty rules.`);
        }
        // Scan
        console.log('Scanning repo for package.json files...');
        const deps = (0, dependency_intake_js_1.scanRepoDependencies)(process.cwd());
        if (process.env.TEST_FAIL_INTAKE_GATE) {
            deps.push({ name: 'malicious-payload', version: '6.6.6', sourceFile: 'test-injection' });
        }
        console.log(`Found ${deps.length} dependencies to check.`);
        // Evaluate
        const findingsObjects = (0, dependency_intake_js_1.evaluateDependencyIntake)(deps, rules);
        const findings = findingsObjects.map(f => `${f.severity.toUpperCase()}: ${f.reason} found in ${f.dep.name}@${f.dep.version} (${f.dep.sourceFile})`);
        return { ok: findings.length === 0, findings };
    });
}
main();
