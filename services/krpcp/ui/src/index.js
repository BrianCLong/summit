"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPlan = renderPlan;
const node_fs_1 = require("node:fs");
const node_url_1 = require("node:url");
const path = __importStar(require("node:path"));
function renderPlan(plan, receipt, options = {}) {
    const lines = [];
    lines.push(`KRPCP rotation plan fingerprint ${plan.fingerprint}`);
    lines.push('');
    lines.push('Steps:');
    for (const step of plan.steps) {
        const result = receipt.stepResults.find((entry) => entry.stepIndex === step.index);
        const status = result ? result.status : 'pending';
        const header = `  [${step.index.toString().padStart(2, '0')}] ${step.kind.toUpperCase()} ${step.keyId ?? ''}`.trimEnd();
        lines.push(`${header} :: ${step.description} -> ${status}`);
        if (step.affectedAssets && step.affectedAssets.length > 0) {
            lines.push(`      assets: ${step.affectedAssets.join(', ')}`);
        }
        if (options.includeDependencyHints && step.dependencyHints && step.dependencyHints.length > 0) {
            lines.push(`      dependencies: ${step.dependencyHints.join(', ')}`);
        }
    }
    lines.push('');
    lines.push('Coverage proof:');
    for (const asset of receipt.coverage.assets) {
        lines.push(`  - ${asset.assetId} :: ${asset.status} (keys: ${asset.keys.join(', ')})`);
    }
    return lines.join('\n');
}
function loadJson(targetPath) {
    const data = (0, node_fs_1.readFileSync)(targetPath, 'utf-8');
    return JSON.parse(data);
}
function main() {
    const [, , planPath = 'plan.json', receiptPath = 'receipt.json'] = process.argv;
    const plan = loadJson(planPath);
    const receipt = loadJson(receiptPath);
    const output = renderPlan(plan, receipt, { includeDependencyHints: true });
    process.stdout.write(`${output}\n`);
}
const entrypoint = (0, node_url_1.fileURLToPath)(import.meta.url);
if (path.resolve(process.argv[1] ?? '') === entrypoint) {
    main();
}
