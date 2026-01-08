#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { z } from "zod";
import { fileURLToPath } from "url";

// --- Schema Definitions ---

const EvidenceBundleMetaSchema = z.object({
  version: z.string(),
  release: z.string(),
  product: z.string(),
  created_at: z.string().datetime(), // Validate ISO string
  environment: z.string(),
});

const ReleaseMetadataSchema = z
  .object({
    git_commit: z.string(),
    build_pipeline: z.string(),
    build_timestamp: z.string(),
    approver: z.string(),
  })
  .passthrough(); // Allow extra fields but validate known ones

const CiQualityGateSchema = z.object({
  name: z.string(),
  status: z.string(),
  evidence: z.string(),
});

const AcceptancePackSchema = z.object({
  epic: z.string(),
  descriptor: z.string(),
});

const LoadTestsSchema = z.object({
  tool: z.string(),
  script: z.string(),
  duration: z.string().optional(),
  virtual_users: z.number().optional(),
  thresholds: z.record(z.any()).optional(),
});

const ChaosScenarioSchema = z.object({
  name: z.string(),
  runbook: z.string(),
  success_criteria: z.array(z.string()).optional(),
});

const SbomSchema = z.object({
  path: z.string(),
  format: z.string(),
  generated_with: z.string(),
});

const EvidenceBundleManifestSchema = z.object({
  evidence_bundle: EvidenceBundleMetaSchema,
  release_metadata: ReleaseMetadataSchema,
  ci_quality_gates: z.array(CiQualityGateSchema).optional(),
  acceptance_packs: z.array(AcceptancePackSchema).optional(),
  load_tests: LoadTestsSchema.optional(),
  chaos_scenarios: z.array(ChaosScenarioSchema).optional(),
  sbom: SbomSchema.optional(),
});

export type ValidationReport = {
  success: boolean;
  messages: string[];
};

// --- Verifier Logic ---

function verifySchema(data: any): ValidationReport {
  const result = EvidenceBundleManifestSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      messages: result.error.errors.map((e) => `Schema Error: ${e.path.join(".")} - ${e.message}`),
    };
  }
  return { success: true, messages: ["Schema validation passed."] };
}

function verifyReferencedFiles(data: any, baseDir: string): ValidationReport {
  const messages: string[] = [];
  let success = true;

  const checkFile = (relativePath: string, context: string) => {
    // Paths are resolved relative to baseDir (which is usually process.cwd())
    const fullPath = path.resolve(baseDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      success = false;
      messages.push(`File missing: ${relativePath} (referenced in ${context})`);
    }
  };

  if (data.ci_quality_gates) {
    data.ci_quality_gates.forEach((gate: any, index: number) => {
      checkFile(gate.evidence, `ci_quality_gates[${index}].evidence`);
    });
  }

  if (data.acceptance_packs) {
    data.acceptance_packs.forEach((pack: any, index: number) => {
      checkFile(pack.descriptor, `acceptance_packs[${index}].descriptor`);
    });
  }

  if (data.load_tests?.script) {
    checkFile(data.load_tests.script, "load_tests.script");
  }

  if (data.chaos_scenarios) {
    data.chaos_scenarios.forEach((scenario: any, index: number) => {
      checkFile(scenario.runbook, `chaos_scenarios[${index}].runbook`);
    });
  }

  if (data.sbom?.path) {
    checkFile(data.sbom.path, "sbom.path");
  }

  if (success) {
    messages.push("All referenced files exist.");
  }

  return { success, messages };
}

// Check for template placeholders or redacted strings
function verifyRedactionMarkers(data: any): ValidationReport {
  const messages: string[] = [];
  let success = true;

  // We assume that release_metadata fields MUST be templatized in the source manifest
  // Pattern: {{ .Release.Field }}
  const templatePattern = /^\{\{\s*\.Release\..+\s*\}\}$/;

  const fieldsToCheck = ["git_commit", "build_pipeline", "build_timestamp", "approver"];

  if (data.release_metadata) {
    for (const field of fieldsToCheck) {
      if (data.release_metadata[field]) {
        const value = data.release_metadata[field];
        // Allow strict template pattern OR explicit "REDACTED" marker (anywhere in string)
        if (!templatePattern.test(value) && !value.includes("REDACTED")) {
          success = false;
          messages.push(
            `Redaction Marker Missing: release_metadata.${field} should be a template placeholder or redacted. Found: "${value}"`
          );
        }
      }
    }
  }

  if (success) {
    messages.push("Redaction markers verified.");
  }

  return { success, messages };
}

/**
 * Verifies the evidence bundle manifest.
 * @param manifestPath Path to the manifest file.
 * @param options Options object.
 * @returns A promise resolving to a ValidationReport.
 */
export async function verifyEvidenceBundle(manifestPath: string): Promise<ValidationReport> {
  const fullPath = path.resolve(process.cwd(), manifestPath);

  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      messages: [`Manifest not found at: ${fullPath}`],
    };
  }

  let rawData;
  try {
    rawData = fs.readFileSync(fullPath, "utf-8");
  } catch (e) {
    return {
      success: false,
      messages: [`Error reading file: ${(e as Error).message}`],
    };
  }

  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    return {
      success: false,
      messages: [`Invalid JSON: ${(e as Error).message}`],
    };
  }

  const allMessages: string[] = [];
  let allSuccess = true;

  // 1. Schema Validation
  const schemaResult = verifySchema(data);
  allMessages.push(...schemaResult.messages);
  if (!schemaResult.success) allSuccess = false;

  // 2. Referenced Schemas/Files Existence
  // We explicitly use process.cwd() as the base for verification
  const filesResult = verifyReferencedFiles(data, process.cwd());
  allMessages.push(...filesResult.messages);
  if (!filesResult.success) allSuccess = false;

  // 3. Redaction Markers
  const redactionResult = verifyRedactionMarkers(data);
  allMessages.push(...redactionResult.messages);
  if (!redactionResult.success) allSuccess = false;

  return {
    success: allSuccess,
    messages: allMessages,
  };
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: verify-evidence-bundle.ts <path-to-manifest>");
    process.exit(1);
  }

  verifyEvidenceBundle(manifestPath).then((report) => {
    report.messages.forEach((msg) => console.log(msg));
    if (report.success) {
      console.log("SUCCESS: Evidence bundle manifest verified.");
      process.exit(0);
    } else {
      console.error("FAILED: Verification failed.");
      process.exit(1);
    }
  });
}
