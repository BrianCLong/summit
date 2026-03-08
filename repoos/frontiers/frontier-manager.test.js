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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const frontier_manager_1 = require("./frontier-manager");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
(0, node_test_1.test)('FrontierManager processes patches and groups by concern', async (t) => {
    const testStateFile = path.join(__dirname, 'test-frontier-state.json');
    const testReportFile = path.join(__dirname, 'frontier-synthesis-report.json');
    // Clean up previous test runs if any
    if (fs.existsSync(testStateFile))
        fs.unlinkSync(testStateFile);
    if (fs.existsSync(testReportFile))
        fs.unlinkSync(testReportFile);
    // Initialize state file
    fs.writeFileSync(testStateFile, JSON.stringify({
        frontiers: {
            ci: { branch: 'frontier/ci', patches: [] },
            runtime: { branch: 'frontier/runtime', patches: [] },
            security: { branch: 'frontier/security', patches: [] }
        }
    }, null, 2));
    const manager = new frontier_manager_1.FrontierManager(testStateFile);
    const patches = [
        { id: 'p1', concern: 'ci', description: 'Fix test action', diff: 'diff1' },
        { id: 'p2', concern: 'ci', description: 'Update runner', diff: 'diff2' },
        { id: 'p3', concern: 'security', description: 'Bump deps', diff: 'diff3' }
    ];
    patches.forEach(p => manager.processPatch(p));
    manager.generateReport(testReportFile);
    // Verify State
    const stateData = JSON.parse(fs.readFileSync(testStateFile, 'utf8'));
    assert.strictEqual(stateData.frontiers.ci.patches.length, 2, 'CI concern should have 2 patches');
    assert.strictEqual(stateData.frontiers.security.patches.length, 1, 'Security concern should have 1 patch');
    assert.strictEqual(stateData.frontiers.runtime.patches.length, 0, 'Runtime concern should have 0 patches');
    // Verify Report
    assert.ok(fs.existsSync(testReportFile), 'Synthesis report should be generated');
    const reportData = JSON.parse(fs.readFileSync(testReportFile, 'utf8'));
    const ciSummary = reportData.summary.find((s) => s.concern === 'ci');
    assert.strictEqual(ciSummary.patchCount, 2, 'Report should reflect 2 CI patches');
    // Clean up
    if (fs.existsSync(testStateFile))
        fs.unlinkSync(testStateFile);
    if (fs.existsSync(testReportFile))
        fs.unlinkSync(testReportFile);
});
