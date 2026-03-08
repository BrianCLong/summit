"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const case_json_1 = __importDefault(require("./fixtures/case.json"));
const ingest_progress_json_1 = __importDefault(require("./fixtures/ingest-progress.json"));
const copilot_classification_json_1 = __importDefault(require("./fixtures/copilot-classification.json"));
const versioning_status_json_1 = __importDefault(require("./fixtures/versioning-status.json"));
const CaseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    status: zod_1.z.enum(['draft', 'open', 'approved', 'closed']),
    evidence: zod_1.z.array(zod_1.z.string()).nonempty(),
    createdAt: zod_1.z.string().datetime(),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _caseCompatibility = true;
const CaseResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    case: CaseSchema,
});
const IngestJobSchema = zod_1.z.object({
    id: zod_1.z.string(),
    connector: zod_1.z.string(),
    status: zod_1.z.enum(['queued', 'running', 'completed', 'failed']),
    progress: zod_1.z.number().min(0).max(100),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ingestCompatibility = true;
const SafetyClassificationSchema = zod_1.z.object({
    ok: zod_1.z.boolean().default(true),
    classification: zod_1.z.enum(['safe', 'unsafe']),
    reasons: zod_1.z.array(zod_1.z.string()).default([]),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safetyCompatibility = true;
const VersioningStatusSchema = zod_1.z.object({
    totalVersions: zod_1.z.number().int().nonnegative(),
    activeVersions: zod_1.z.number().int().nonnegative(),
    deprecatedVersions: zod_1.z.number().int().nonnegative(),
    currentDefault: zod_1.z.string(),
    latestVersion: zod_1.z.string(),
    supportedVersions: zod_1.z.array(zod_1.z.string()).nonempty(),
});
describe('SDK contract fixtures', () => {
    it('validates case payload matches the Case contract', () => {
        const parsed = CaseResponseSchema.parse(case_json_1.default);
        expect(parsed.case.status).toBe('open');
        expect(parsed.case.evidence).toContain('e1');
    });
    it('validates ingest progress payload', () => {
        const parsed = IngestJobSchema.parse(ingest_progress_json_1.default);
        expect(parsed.status).toBe('running');
        expect(parsed.progress).toBeGreaterThanOrEqual(0);
    });
    it('validates copilot safety classification payload', () => {
        const parsed = SafetyClassificationSchema.parse(copilot_classification_json_1.default);
        expect(parsed.classification).toBe('unsafe');
        expect(parsed.reasons.length).toBeGreaterThan(0);
    });
    it('validates versioning status payload', () => {
        const parsed = VersioningStatusSchema.parse(versioning_status_json_1.default);
        expect(parsed.supportedVersions).toContain(parsed.latestVersion);
        expect(parsed.totalVersions).toBeGreaterThan(parsed.deprecatedVersions);
    });
});
