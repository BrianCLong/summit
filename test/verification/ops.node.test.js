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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const assert_1 = __importDefault(require("assert"));
const node_test_1 = require("node:test");
const execPromise = util_1.default.promisify(child_process_1.exec);
// Paths
const ROOT_DIR = process.cwd();
const DOCS_DIR = path_1.default.join(ROOT_DIR, 'docs', 'ops');
const RUNBOOKS_DIR = path_1.default.join(DOCS_DIR, 'runbooks');
const SCRIPTS_DIR = path_1.default.join(ROOT_DIR, 'scripts');
(0, node_test_1.test)('Operational Excellence Verification', async (t) => {
    await t.test('1. SLIs and Alerts Defined', () => {
        const sliFile = path_1.default.join(DOCS_DIR, 'SLI_SLO_ALERTS.md');
        assert_1.default.ok(fs_1.default.existsSync(sliFile), 'SLI_SLO_ALERTS.md should exist');
        const content = fs_1.default.readFileSync(sliFile, 'utf-8');
        assert_1.default.ok(content.includes('SLO'), 'Should define SLOs');
        assert_1.default.ok(content.includes('SEV-1'), 'Should define Severity levels');
    });
    await t.test('2. Runbooks Exist for Critical Areas', () => {
        const requiredRunbooks = [
            'INCIDENT_API.md',
            'INCIDENT_AGENT.md',
            'INCIDENT_COST.md',
            'INCIDENT_SECURITY.md',
            'INCIDENT_DATA_INTEGRITY.md'
        ];
        requiredRunbooks.forEach(book => {
            const bookPath = path_1.default.join(RUNBOOKS_DIR, book);
            assert_1.default.ok(fs_1.default.existsSync(bookPath), `Runbook ${book} should exist`);
            const content = fs_1.default.readFileSync(bookPath, 'utf-8');
            assert_1.default.ok(content.includes('Symptoms'), `${book} should have Symptoms section`);
            assert_1.default.ok(content.includes('Mitigation'), `${book} should have Mitigation section`);
        });
    });
    await t.test('3. Change Freeze Mechanics', async () => {
        // Enable Freeze
        await execPromise(`${path_1.default.join(SCRIPTS_DIR, 'enable-freeze.sh')} "Test Freeze"`);
        assert_1.default.ok(fs_1.default.existsSync('CHANGE_FREEZE_ACTIVE'), 'Freeze lockfile should be created');
        // Check Freeze (Should fail/exit 1)
        try {
            await execPromise(`${path_1.default.join(SCRIPTS_DIR, 'check-freeze.sh')}`);
            assert_1.default.fail('check-freeze should exit 1 when frozen');
        }
        catch (e) {
            assert_1.default.strictEqual(e.code, 1, 'Exit code should be 1');
        }
        // Disable Freeze
        await execPromise(`${path_1.default.join(SCRIPTS_DIR, 'disable-freeze.sh')}`);
        assert_1.default.ok(!fs_1.default.existsSync('CHANGE_FREEZE_ACTIVE'), 'Freeze lockfile should be removed');
    });
    await t.test('4. Incident Evidence Capture', async () => {
        const captureScript = path_1.default.join(SCRIPTS_DIR, 'capture-incident-evidence.ts');
        // Using tsx or similar to run typescript script if needed, or compile first.
        // For this test, we assume we can run it via node loader or it's compiled.
        // Since we wrote it as TS, we need to run it with a loader or transpile.
        // However, the verify suite itself is TS.
        // We will simulate the IncidentManager directly to avoid spawning complex subprocesses with TS loaders
        // inside this test environment if not configured.
        // But better to check the script existence at least.
        assert_1.default.ok(fs_1.default.existsSync(captureScript), 'capture-incident-evidence.ts should exist');
        const { IncidentManager } = await Promise.resolve().then(() => __importStar(require('../../server/src/ops/incident/incident-manager.js')));
        const mgr = IncidentManager.getInstance();
        const snapPath = await mgr.captureSnapshot({
            incidentId: 'TEST-VERIFY',
            severity: 'SEV-4',
            description: 'Test Verification',
            triggeredBy: 'Test Runner'
        });
        assert_1.default.ok(fs_1.default.existsSync(snapPath), 'Snapshot directory should be created');
        assert_1.default.ok(fs_1.default.existsSync(path_1.default.join(snapPath, 'metadata.json')), 'metadata.json should exist');
        // Cleanup
        fs_1.default.rmSync(snapPath, { recursive: true, force: true });
        // Also clean up the incidents dir if empty? No, keep it.
    });
});
