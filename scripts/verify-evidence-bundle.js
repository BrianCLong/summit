#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEvidenceBundle = verifyEvidenceBundle;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const url_1 = require("url");
// --- Schema Definitions ---
const EvidenceBundleMetaSchema = zod_1.z.object({
    version: zod_1.z.string(),
    release: zod_1.z.string(),
    product: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(), // Validate ISO string
    environment: zod_1.z.string(),
});
const ReleaseMetadataSchema = zod_1.z.object({
    git_commit: zod_1.z.string(),
    build_pipeline: zod_1.z.string(),
    build_timestamp: zod_1.z.string(),
    approver: zod_1.z.string(),
}).passthrough(); // Allow extra fields but validate known ones
const CiQualityGateSchema = zod_1.z.object({
    name: zod_1.z.string(),
    status: zod_1.z.string(),
    evidence: zod_1.z.string(),
});
const AcceptancePackSchema = zod_1.z.object({
    epic: zod_1.z.string(),
    descriptor: zod_1.z.string(),
});
const LoadTestsSchema = zod_1.z.object({
    tool: zod_1.z.string(),
    script: zod_1.z.string(),
    duration: zod_1.z.string().optional(),
    virtual_users: zod_1.z.number().optional(),
    thresholds: zod_1.z.record(zod_1.z.any()).optional(),
});
const ChaosScenarioSchema = zod_1.z.object({
    name: zod_1.z.string(),
    runbook: zod_1.z.string(),
    success_criteria: zod_1.z.array(zod_1.z.string()).optional(),
});
const SbomSchema = zod_1.z.object({
    path: zod_1.z.string(),
    format: zod_1.z.string(),
    generated_with: zod_1.z.string(),
});
const EvidenceBundleManifestSchema = zod_1.z.object({
    evidence_bundle: EvidenceBundleMetaSchema,
    release_metadata: ReleaseMetadataSchema,
    ci_quality_gates: zod_1.z.array(CiQualityGateSchema).optional(),
    acceptance_packs: zod_1.z.array(AcceptancePackSchema).optional(),
    load_tests: LoadTestsSchema.optional(),
    chaos_scenarios: zod_1.z.array(ChaosScenarioSchema).optional(),
    sbom: SbomSchema.optional(),
});
// --- Verifier Logic ---
function verifySchema(data) {
    const result = EvidenceBundleManifestSchema.safeParse(data);
    if (!result.success) {
        return {
            success: false,
            messages: result.error.errors.map(e => `Schema Error: ${e.path.join('.')} - ${e.message}`),
        };
    }
    return { success: true, messages: ['Schema validation passed.'] };
}
function verifyReferencedFiles(data, baseDir) {
    const messages = [];
    let success = true;
    const checkFile = (relativePath, context) => {
        // Paths are resolved relative to baseDir (which is usually process.cwd())
        const fullPath = path_1.default.resolve(baseDir, relativePath);
        if (!fs_1.default.existsSync(fullPath)) {
            success = false;
            messages.push(`File missing: ${relativePath} (referenced in ${context})`);
        }
    };
    if (data.ci_quality_gates) {
        data.ci_quality_gates.forEach((gate, index) => {
            checkFile(gate.evidence, `ci_quality_gates[${index}].evidence`);
        });
    }
    if (data.acceptance_packs) {
        data.acceptance_packs.forEach((pack, index) => {
            checkFile(pack.descriptor, `acceptance_packs[${index}].descriptor`);
        });
    }
    if (data.load_tests?.script) {
        checkFile(data.load_tests.script, 'load_tests.script');
    }
    if (data.chaos_scenarios) {
        data.chaos_scenarios.forEach((scenario, index) => {
            checkFile(scenario.runbook, `chaos_scenarios[${index}].runbook`);
        });
    }
    if (data.sbom?.path) {
        checkFile(data.sbom.path, 'sbom.path');
    }
    if (success) {
        messages.push('All referenced files exist.');
    }
    return { success, messages };
}
// Check for template placeholders or redacted strings
function verifyRedactionMarkers(data) {
    const messages = [];
    let success = true;
    // We assume that release_metadata fields MUST be templatized in the source manifest
    // Pattern: {{ .Release.Field }}
    const templatePattern = /^\{\{\s*\.Release\..+\s*\}\}$/;
    const fieldsToCheck = ['git_commit', 'build_pipeline', 'build_timestamp', 'approver'];
    if (data.release_metadata) {
        for (const field of fieldsToCheck) {
            if (data.release_metadata[field]) {
                const value = data.release_metadata[field];
                // Allow strict template pattern OR explicit "REDACTED" marker (anywhere in string)
                if (!templatePattern.test(value) && !value.includes('REDACTED')) {
                    success = false;
                    messages.push(`Redaction Marker Missing: release_metadata.${field} should be a template placeholder or redacted. Found: "${value}"`);
                }
            }
        }
    }
    if (success) {
        messages.push('Redaction markers verified.');
    }
    return { success, messages };
}
/**
 * Verifies the evidence bundle manifest.
 * @param manifestPath Path to the manifest file.
 * @param options Options object.
 * @returns A promise resolving to a ValidationReport.
 */
async function verifyEvidenceBundle(manifestPath) {
    const fullPath = path_1.default.resolve(process.cwd(), manifestPath);
    if (!fs_1.default.existsSync(fullPath)) {
        return {
            success: false,
            messages: [`Manifest not found at: ${fullPath}`],
        };
    }
    let rawData;
    try {
        rawData = fs_1.default.readFileSync(fullPath, 'utf-8');
    }
    catch (e) {
        return {
            success: false,
            messages: [`Error reading file: ${e.message}`],
        };
    }
    let data;
    try {
        data = JSON.parse(rawData);
    }
    catch (e) {
        return {
            success: false,
            messages: [`Invalid JSON: ${e.message}`],
        };
    }
    const allMessages = [];
    let allSuccess = true;
    // 1. Schema Validation
    const schemaResult = verifySchema(data);
    allMessages.push(...schemaResult.messages);
    if (!schemaResult.success)
        allSuccess = false;
    // 2. Referenced Schemas/Files Existence
    // We explicitly use process.cwd() as the base for verification
    const filesResult = verifyReferencedFiles(data, process.cwd());
    allMessages.push(...filesResult.messages);
    if (!filesResult.success)
        allSuccess = false;
    // 3. Redaction Markers
    const redactionResult = verifyRedactionMarkers(data);
    allMessages.push(...redactionResult.messages);
    if (!redactionResult.success)
        allSuccess = false;
    return {
        success: allSuccess,
        messages: allMessages,
    };
}
// Run if called directly
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
if (process.argv[1] === __filename) {
    const manifestPath = process.argv[2];
    if (!manifestPath) {
        console.error('Usage: verify-evidence-bundle.ts <path-to-manifest>');
        process.exit(1);
    }
    verifyEvidenceBundle(manifestPath).then(report => {
        report.messages.forEach(msg => console.log(msg));
        if (report.success) {
            console.log('SUCCESS: Evidence bundle manifest verified.');
            process.exit(0);
        }
        else {
            console.error('FAILED: Verification failed.');
            process.exit(1);
        }
    });
}
