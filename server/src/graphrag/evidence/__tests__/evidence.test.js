"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const writer_1 = require("../writer");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
describe('EvidenceWriter', () => {
    const testDir = path_1.default.join(__dirname, 'test-output');
    beforeEach(() => {
        if (fs_1.default.existsSync(testDir)) {
            fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    afterEach(() => {
        if (fs_1.default.existsSync(testDir)) {
            fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    it('should create the base directory', () => {
        new writer_1.EvidenceWriter(testDir);
        expect(fs_1.default.existsSync(testDir)).toBe(true);
    });
    it('should write evidence files correctly', () => {
        const writer = new writer_1.EvidenceWriter(testDir);
        const evidenceId = 'EVD-test-MODEL-001';
        writer.writeEvidence(evidenceId, 'PUBLIC', 'Test Summary', { accuracy: 0.99 }, ['Note 1']);
        const evidencePath = path_1.default.join(testDir, evidenceId);
        expect(fs_1.default.existsSync(evidencePath)).toBe(true);
        expect(fs_1.default.existsSync(path_1.default.join(evidencePath, 'report.json'))).toBe(true);
        expect(fs_1.default.existsSync(path_1.default.join(evidencePath, 'metrics.json'))).toBe(true);
        expect(fs_1.default.existsSync(path_1.default.join(evidencePath, 'stamp.json'))).toBe(true);
        expect(fs_1.default.existsSync(path_1.default.join(testDir, 'index.json'))).toBe(true);
        const report = JSON.parse(fs_1.default.readFileSync(path_1.default.join(evidencePath, 'report.json'), 'utf-8'));
        expect(report.evidence_id).toBe(evidenceId);
        expect(report.summary).toBe('Test Summary');
        const stamp = JSON.parse(fs_1.default.readFileSync(path_1.default.join(evidencePath, 'stamp.json'), 'utf-8'));
        expect(stamp.generated_at).toBeDefined();
        const metrics = JSON.parse(fs_1.default.readFileSync(path_1.default.join(evidencePath, 'metrics.json'), 'utf-8'));
        expect(metrics.metrics.accuracy).toBe(0.99);
    });
    it('should be deterministic (except stamp)', () => {
        const writer = new writer_1.EvidenceWriter(testDir);
        const evidenceId = 'EVD-test-DETERM-001';
        writer.writeEvidence(evidenceId, 'INTERNAL', 'Summary', { val: 1 });
        const report1 = fs_1.default.readFileSync(path_1.default.join(testDir, evidenceId, 'report.json'), 'utf-8');
        const metrics1 = fs_1.default.readFileSync(path_1.default.join(testDir, evidenceId, 'metrics.json'), 'utf-8');
        // Rewrite same data
        writer.writeEvidence(evidenceId, 'INTERNAL', 'Summary', { val: 1 });
        const report2 = fs_1.default.readFileSync(path_1.default.join(testDir, evidenceId, 'report.json'), 'utf-8');
        const metrics2 = fs_1.default.readFileSync(path_1.default.join(testDir, evidenceId, 'metrics.json'), 'utf-8');
        expect(report1).toBe(report2);
        expect(metrics1).toBe(metrics2);
    });
    it('should update index correctly and sort by ID', () => {
        const writer = new writer_1.EvidenceWriter(testDir);
        writer.writeEvidence('EVD-B', 'PUBLIC', 'B', {});
        writer.writeEvidence('EVD-A', 'PUBLIC', 'A', {});
        const indexContent = fs_1.default.readFileSync(path_1.default.join(testDir, 'index.json'), 'utf-8');
        const index = JSON.parse(indexContent);
        expect(index.items).toHaveLength(2);
        expect(index.items[0].evidence_id).toBe('EVD-A');
        expect(index.items[1].evidence_id).toBe('EVD-B');
    });
});
