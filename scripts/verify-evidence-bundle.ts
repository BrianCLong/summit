#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Manual Validation Logic ---

function validateType(value: any, type: string, pathStr: string, messages: string[]) {
  if (type === 'array') {
    if (!Array.isArray(value)) {
      messages.push(`Field '${pathStr}' must be an array.`);
      return false;
    }
  } else if (typeof value !== type) {
    messages.push(`Field '${pathStr}' must be of type ${type}. Got ${typeof value}.`);
    return false;
  }
  return true;
}

function validateRequired(obj: any, field: string, pathStr: string, messages: string[]) {
  if (obj === undefined || obj === null || obj[field] === undefined) {
    messages.push(`Missing required field: '${pathStr}.${field}'`);
    return false;
  }
  return true;
}

function verifySchema(data: any): { success: boolean, messages: string[] } {
  const messages: string[] = [];
  let success = true;

  if (!data || typeof data !== 'object') {
    return { success: false, messages: ['Root must be an object.'] };
  }

  // evidence_bundle
  if (validateRequired(data, 'evidence_bundle', 'root', messages)) {
    const eb = data.evidence_bundle;
    validateRequired(eb, 'version', 'evidence_bundle', messages);
    validateRequired(eb, 'release', 'evidence_bundle', messages);
    validateRequired(eb, 'product', 'evidence_bundle', messages);
    validateRequired(eb, 'created_at', 'evidence_bundle', messages);
    validateRequired(eb, 'environment', 'evidence_bundle', messages);
  } else { success = false; }

  // release_metadata
  if (validateRequired(data, 'release_metadata', 'root', messages)) {
    const rm = data.release_metadata;
    validateRequired(rm, 'git_commit', 'release_metadata', messages);
    validateRequired(rm, 'build_pipeline', 'release_metadata', messages);
    validateRequired(rm, 'build_timestamp', 'release_metadata', messages);
    validateRequired(rm, 'approver', 'release_metadata', messages);
  } else { success = false; }

  // Optional arrays
  if (data.ci_quality_gates) validateType(data.ci_quality_gates, 'array', 'ci_quality_gates', messages);
  if (data.acceptance_packs) validateType(data.acceptance_packs, 'array', 'acceptance_packs', messages);
  if (data.chaos_scenarios) validateType(data.chaos_scenarios, 'array', 'chaos_scenarios', messages);

  return { success: messages.length === 0, messages };
}

function verifyReferencedFiles(data: any, baseDir: string): { success: boolean, messages: string[] } {
  const messages: string[] = [];
  let success = true;

  const checkFile = (relativePath: string, context: string) => {
    if (!relativePath) return;
    const fullPath = path.resolve(baseDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      success = false;
      messages.push(`File missing: ${relativePath} (referenced in ${context})`);
    }
  };

  if (Array.isArray(data.ci_quality_gates)) {
    data.ci_quality_gates.forEach((gate: any, index: number) => {
      if (gate && gate.evidence) checkFile(gate.evidence, `ci_quality_gates[${index}].evidence`);
    });
  }

  if (Array.isArray(data.acceptance_packs)) {
    data.acceptance_packs.forEach((pack: any, index: number) => {
      if (pack && pack.descriptor) checkFile(pack.descriptor, `acceptance_packs[${index}].descriptor`);
    });
  }

  if (data.load_tests && data.load_tests.script) {
    checkFile(data.load_tests.script, 'load_tests.script');
  }

  if (Array.isArray(data.chaos_scenarios)) {
    data.chaos_scenarios.forEach((scenario: any, index: number) => {
      if (scenario && scenario.runbook) checkFile(scenario.runbook, `chaos_scenarios[${index}].runbook`);
    });
  }

  if (data.sbom && data.sbom.path) {
    checkFile(data.sbom.path, 'sbom.path');
  }

  if (success) messages.push('All referenced files exist.');

  return { success, messages };
}

function verifyRedactionMarkers(data: any): { success: boolean, messages: string[] } {
  const messages: string[] = [];
  let success = true;

  const templatePattern = /^\{\{\s*\.Release\..+\s*\}\}$/;
  const fieldsToCheck = ['git_commit', 'build_pipeline', 'build_timestamp', 'approver'];

  if (data.release_metadata) {
    for (const field of fieldsToCheck) {
      if (data.release_metadata[field]) {
        const value = data.release_metadata[field];
        if (typeof value === 'string' && !templatePattern.test(value) && !value.includes('REDACTED')) {
           success = false;
           messages.push(`Redaction Marker Missing: release_metadata.${field} should be a template placeholder or redacted. Found: "${value}"`);
        }
      }
    }
  }

  if (success) messages.push('Redaction markers verified.');

  return { success, messages };
}

export async function verifyEvidenceBundle(manifestPath: string): Promise<{ success: boolean, messages: string[] }> {
  const fullPath = path.resolve(process.cwd(), manifestPath);

  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      messages: [`Manifest not found at: ${fullPath}`],
    };
  }

  let rawData;
  try {
    rawData = fs.readFileSync(fullPath, 'utf-8');
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

  const schemaResult = verifySchema(data);
  allMessages.push(...schemaResult.messages);
  if (!schemaResult.success) allSuccess = false;

  const filesResult = verifyReferencedFiles(data, process.cwd());
  allMessages.push(...filesResult.messages);
  if (!filesResult.success) allSuccess = false;

  const redactionResult = verifyRedactionMarkers(data);
  allMessages.push(...redactionResult.messages);
  if (!redactionResult.success) allSuccess = false;

  return {
    success: allSuccess,
    messages: allMessages,
  };
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const manifestPath = process.argv[2] || 'EVIDENCE_BUNDLE.manifest.json';

  if (!fs.existsSync(manifestPath)) {
    console.log(`No manifest found at ${manifestPath}, skipping verification.`);
    // Ops cadence usually expects this to pass if file is missing unless we are in strict mode.
    // However, if called explicitly, it might be expected to exist.
    // Given the 'freshness check' requirement, we might exit 1 if it's missing.
    // But for daily ops (warn mode), maybe 0?
    // Let's exit 1 if missing, workflow handles continue-on-error.
    process.exit(1);
  }

  verifyEvidenceBundle(manifestPath).then(report => {
    report.messages.forEach(msg => console.log(msg));
    if (report.success) {
      console.log('SUCCESS: Evidence bundle manifest verified.');
      process.exit(0);
    } else {
      console.error('FAILED: Verification failed.');
      process.exit(1);
    }
  });
}
