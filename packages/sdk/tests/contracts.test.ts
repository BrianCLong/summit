import { z } from "zod";
import caseFixture from "./fixtures/case.json";
import ingestProgressFixture from "./fixtures/ingest-progress.json";
import copilotClassificationFixture from "./fixtures/copilot-classification.json";
import versioningStatusFixture from "./fixtures/versioning-status.json";
import { Case, IngestJob, SafetyClassification } from "../generated";

const CaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["draft", "open", "approved", "closed"]),
  evidence: z.array(z.string()).nonempty(),
  createdAt: z.string().datetime(),
});
type CaseShape = z.infer<typeof CaseSchema>;
type CaseCompatibility = CaseShape extends Case ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _caseCompatibility: CaseCompatibility = true;

const CaseResponseSchema = z.object({
  ok: z.literal(true),
  case: CaseSchema,
});

const IngestJobSchema = z.object({
  id: z.string(),
  connector: z.string(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  progress: z.number().min(0).max(100),
});
type IngestJobShape = z.infer<typeof IngestJobSchema>;
type IngestCompatibility = IngestJobShape extends IngestJob ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ingestCompatibility: IngestCompatibility = true;

const SafetyClassificationSchema = z.object({
  ok: z.boolean().default(true),
  classification: z.enum(["safe", "unsafe"]),
  reasons: z.array(z.string()).default([]),
});
type SafetyShape = z.infer<typeof SafetyClassificationSchema>;
type SafetyCompatibility = SafetyShape extends SafetyClassification ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safetyCompatibility: SafetyCompatibility = true;

const VersioningStatusSchema = z.object({
  totalVersions: z.number().int().nonnegative(),
  activeVersions: z.number().int().nonnegative(),
  deprecatedVersions: z.number().int().nonnegative(),
  currentDefault: z.string(),
  latestVersion: z.string(),
  supportedVersions: z.array(z.string()).nonempty(),
});

describe("SDK contract fixtures", () => {
  it("validates case payload matches the Case contract", () => {
    const parsed = CaseResponseSchema.parse(caseFixture);
    expect(parsed.case.status).toBe("open");
    expect(parsed.case.evidence).toContain("e1");
  });

  it("validates ingest progress payload", () => {
    const parsed = IngestJobSchema.parse(ingestProgressFixture);
    expect(parsed.status).toBe("running");
    expect(parsed.progress).toBeGreaterThanOrEqual(0);
  });

  it("validates copilot safety classification payload", () => {
    const parsed = SafetyClassificationSchema.parse(copilotClassificationFixture);
    expect(parsed.classification).toBe("unsafe");
    expect(parsed.reasons.length).toBeGreaterThan(0);
  });

  it("validates versioning status payload", () => {
    const parsed = VersioningStatusSchema.parse(versioningStatusFixture);
    expect(parsed.supportedVersions).toContain(parsed.latestVersion);
    expect(parsed.totalVersions).toBeGreaterThan(parsed.deprecatedVersions);
  });
});
