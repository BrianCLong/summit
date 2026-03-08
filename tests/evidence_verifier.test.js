"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const verify_evidence_1 = require("../evidence/verifier/verify_evidence");
describe("Evidence Verifier Integration", () => {
    const testDir = 'evidence/runs/test-run-123';
    beforeAll(() => {
        if (!fs_1.default.existsSync(testDir)) {
            fs_1.default.mkdirSync(testDir, { recursive: true });
        }
    });
    afterAll(() => {
        if (fs_1.default.existsSync(testDir)) {
            fs_1.default.rmSync(testDir, { recursive: true });
        }
    });
    test("should pass for valid evidence", () => {
        const report = {
            run_id: 'test',
            mode: 'swarm',
            summary: 'ok',
            evidence_ids: ['EVD-TEST-001']
        };
        const metrics = {
            run_id: 'test',
            metrics: {
                agentsSpawned: 1,
                stepsExecuted: 1,
                toolCalls: 1,
                wallMs: 100
            }
        };
        const stamp = {
            run_id: 'test',
            generated_at: '2025-01-01T00:00:00Z'
        };
        fs_1.default.writeFileSync(path_1.default.join(testDir, 'report.json'), JSON.stringify(report));
        fs_1.default.writeFileSync(path_1.default.join(testDir, 'metrics.json'), JSON.stringify(metrics));
        fs_1.default.writeFileSync(path_1.default.join(testDir, 'stamp.json'), JSON.stringify(stamp));
        const result = (0, verify_evidence_1.verifyEvidenceDir)(testDir);
        expect(result.ok).toBe(true);
    });
    test("should fail if timestamp is in report", () => {
        const report = {
            run_id: 'test',
            mode: 'swarm',
            summary: 'ok',
            evidence_ids: ['EVD-TEST-001'],
            time: '2025-01-01T00:00:00Z'
        };
        fs_1.default.writeFileSync(path_1.default.join(testDir, 'report.json'), JSON.stringify(report));
        const result = (0, verify_evidence_1.verifyEvidenceDir)(testDir);
        expect(result.ok).toBe(false);
        expect(result.errors).toContain("Timestamp-like field found in report.json. Timestamps are only allowed in stamp.json.");
    });
    test("should fail if file is missing", () => {
        fs_1.default.unlinkSync(path_1.default.join(testDir, 'metrics.json'));
        const result = (0, verify_evidence_1.verifyEvidenceDir)(testDir);
        expect(result.ok).toBe(false);
        expect(result.errors).toContain("Missing required file: metrics.json");
    });
});
