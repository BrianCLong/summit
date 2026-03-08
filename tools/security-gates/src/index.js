"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const config_js_1 = require("./config.js");
const workflowGate_js_1 = require("./workflowGate.js");
const imageGate_js_1 = require("./imageGate.js");
const secretScan_js_1 = require("./secretScan.js");
const policyGate_js_1 = require("./policyGate.js");
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
async function run() {
    const configPath = process.argv[2] || 'security/pilot/gate-config.json';
    const repoRoot = node_path_1.default.resolve(__dirname, '..', '..');
    const config = (0, config_js_1.loadConfig)(node_path_1.default.resolve(repoRoot, configPath));
    const [workflow, image, secrets, policy] = await Promise.all([
        (0, workflowGate_js_1.enforceWorkflowGate)(repoRoot, config.workflowGate),
        (0, imageGate_js_1.enforceImageGate)(repoRoot, config.imageGate),
        (0, secretScan_js_1.scanForSecrets)(repoRoot, config.secretScan),
        (0, policyGate_js_1.enforcePolicyGate)(repoRoot, config.policyGate)
    ]);
    const results = [workflow, image, secrets, policy];
    const failures = results.filter((result) => !result.ok);
    results.forEach((result) => {
        console.log(`\n[${result.gate.toUpperCase()}] ${result.ok ? 'PASS' : 'FAIL'}`);
        result.details.forEach((detail) => console.log(` - ${detail}`));
    });
    if (failures.length) {
        process.exitCode = 1;
    }
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
