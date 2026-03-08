#!/usr/bin/env node
"use strict";
/**
 * Enhanced Provenance Verifier with Detailed Reporting
 * Validates manifests, transform chains, and generates comprehensive verification reports
 */
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
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const index_js_1 = require("../index.js");
function readManifest(bundleDir) {
    const manifestPath = (0, node_path_1.join)(bundleDir, 'manifest.json');
    if (!(0, node_fs_1.existsSync)(manifestPath)) {
        throw new Error(`manifest.json not found in ${bundleDir}`);
    }
    return JSON.parse((0, node_fs_1.readFileSync)(manifestPath, 'utf8'));
}
function readSignature(bundleDir) {
    const signaturePath = (0, node_path_1.join)(bundleDir, 'manifest.sig');
    if (!(0, node_fs_1.existsSync)(signaturePath)) {
        return null;
    }
    return JSON.parse((0, node_fs_1.readFileSync)(signaturePath, 'utf8'));
}
function loadArtifacts(bundleDir) {
    const artifacts = {};
    const artifactsDir = (0, node_path_1.join)(bundleDir, 'artifacts');
    if (!(0, node_fs_1.existsSync)(artifactsDir)) {
        return artifacts;
    }
    const files = (0, node_fs_1.readdirSync)(artifactsDir);
    for (const file of files) {
        const filePath = (0, node_path_1.join)(artifactsDir, file);
        if ((0, node_fs_1.statSync)(filePath).isFile()) {
            const content = (0, node_fs_1.readFileSync)(filePath);
            artifacts[file] = content;
        }
    }
    return artifacts;
}
function computeHash(data) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(data);
    return hash.digest('hex');
}
function verifyDetailed(bundleDir, publicKeyFile) {
    const issues = [];
    const stepResults = [];
    let manifest;
    let signature = null;
    let publicKey;
    // Read manifest
    try {
        manifest = readManifest(bundleDir);
    }
    catch (error) {
        return {
            valid: false,
            timestamp: new Date().toISOString(),
            bundlePath: bundleDir,
            manifestValid: false,
            signatureValid: false,
            chainValid: false,
            checksumValid: false,
            issues: [
                {
                    severity: 'error',
                    category: 'manifest',
                    message: error instanceof Error ? error.message : 'Failed to read manifest',
                },
            ],
            stepResults: [],
            summary: {
                totalSteps: 0,
                validSteps: 0,
                failedSteps: 0,
                missingArtifacts: 0,
            },
        };
    }
    // Read signature if available
    signature = readSignature(bundleDir);
    if (!signature) {
        issues.push({
            severity: 'warning',
            category: 'signature',
            message: 'No signature file found (manifest.sig)',
        });
    }
    // Read public key if provided
    if (publicKeyFile) {
        try {
            publicKey = (0, node_fs_1.readFileSync)(publicKeyFile);
        }
        catch (error) {
            issues.push({
                severity: 'error',
                category: 'signature',
                message: `Failed to read public key: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
    // Verify signature
    let signatureValid = false;
    if (signature && publicKey) {
        try {
            signatureValid = (0, index_js_1.verifyManifestSignature)(manifest, signature, publicKey);
            if (!signatureValid) {
                issues.push({
                    severity: 'error',
                    category: 'signature',
                    message: 'Signature verification failed – manifest may be tampered',
                });
            }
        }
        catch (error) {
            issues.push({
                severity: 'error',
                category: 'signature',
                message: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
    else if (signature && !publicKey) {
        issues.push({
            severity: 'warning',
            category: 'signature',
            message: 'Signature present but no public key provided for verification',
        });
    }
    // Load artifacts
    const artifacts = loadArtifacts(bundleDir);
    // Verify each step
    let validSteps = 0;
    let failedSteps = 0;
    let missingArtifacts = 0;
    for (const step of manifest.steps) {
        const stepIssues = [];
        let stepValid = true;
        let artifactPresent = false;
        let inputHashValid = false;
        let outputHashValid = false;
        // Check if artifact exists
        const artifact = artifacts[step.id];
        if (artifact) {
            artifactPresent = true;
            // Verify output hash
            const actualHash = computeHash(artifact);
            outputHashValid = actualHash === step.outputHash;
            if (!outputHashValid) {
                stepValid = false;
                stepIssues.push(`Output hash mismatch: expected ${step.outputHash}, got ${actualHash}`);
                issues.push({
                    severity: 'error',
                    category: 'checksum',
                    message: `Step ${step.id}: Output hash mismatch`,
                    stepId: step.id,
                });
            }
        }
        else {
            artifactPresent = false;
            stepValid = false;
            missingArtifacts++;
            stepIssues.push('Artifact file not found in bundle');
            issues.push({
                severity: 'error',
                category: 'artifact',
                message: `Step ${step.id}: Artifact not found`,
                stepId: step.id,
            });
        }
        // Verify chain continuity (output of previous step should match input of current)
        const stepIndex = manifest.steps.indexOf(step);
        if (stepIndex > 0) {
            const previousStep = manifest.steps[stepIndex - 1];
            inputHashValid = previousStep.outputHash === step.inputHash;
            if (!inputHashValid) {
                stepValid = false;
                stepIssues.push(`Input hash does not match previous step output: expected ${previousStep.outputHash}, got ${step.inputHash}`);
                issues.push({
                    severity: 'error',
                    category: 'chain',
                    message: `Step ${step.id}: Chain break detected`,
                    stepId: step.id,
                });
            }
        }
        else {
            // First step, input hash is the source
            inputHashValid = true;
        }
        if (stepValid) {
            validSteps++;
        }
        else {
            failedSteps++;
        }
        stepResults.push({
            stepId: step.id,
            stepType: step.type,
            valid: stepValid,
            inputHashValid,
            outputHashValid,
            artifactPresent,
            issues: stepIssues,
        });
    }
    // Overall verification using library function
    const chainValid = (0, index_js_1.verifyManifest)(manifest, artifacts);
    const allValid = manifest.steps.length > 0 &&
        chainValid &&
        failedSteps === 0 &&
        (!signature || signatureValid);
    return {
        valid: allValid,
        timestamp: new Date().toISOString(),
        bundlePath: bundleDir,
        manifestValid: true,
        signatureValid: signature ? signatureValid : true, // If no signature, consider it valid
        chainValid,
        checksumValid: failedSteps === 0,
        issues,
        stepResults,
        summary: {
            totalSteps: manifest.steps.length,
            validSteps,
            failedSteps,
            missingArtifacts,
        },
    };
}
function printReport(report) {
    console.log('\n========================================');
    console.log('  Provenance Verification Report');
    console.log('========================================\n');
    console.log(`Bundle: ${report.bundlePath}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Overall Status: ${report.valid ? '✅ VALID' : '❌ INVALID'}\n`);
    console.log('Component Status:');
    console.log(`  Manifest: ${report.manifestValid ? '✅' : '❌'}`);
    console.log(`  Signature: ${report.signatureValid ? '✅' : '⚠️'}`);
    console.log(`  Chain: ${report.chainValid ? '✅' : '❌'}`);
    console.log(`  Checksums: ${report.checksumValid ? '✅' : '❌'}\n`);
    console.log('Summary:');
    console.log(`  Total Steps: ${report.summary.totalSteps}`);
    console.log(`  Valid Steps: ${report.summary.validSteps}`);
    console.log(`  Failed Steps: ${report.summary.failedSteps}`);
    console.log(`  Missing Artifacts: ${report.summary.missingArtifacts}\n`);
    if (report.issues.length > 0) {
        console.log('Issues:');
        for (const issue of report.issues) {
            const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`  ${icon} [${issue.category.toUpperCase()}] ${issue.message}`);
        }
        console.log();
    }
    if (report.stepResults.length > 0) {
        console.log('Step-by-Step Results:');
        for (const step of report.stepResults) {
            const icon = step.valid ? '✅' : '❌';
            console.log(`\n  ${icon} Step: ${step.stepId}`);
            console.log(`     Type: ${step.stepType}`);
            console.log(`     Artifact Present: ${step.artifactPresent ? '✅' : '❌'}`);
            console.log(`     Input Hash Valid: ${step.inputHashValid ? '✅' : '❌'}`);
            console.log(`     Output Hash Valid: ${step.outputHashValid ? '✅' : '❌'}`);
            if (step.issues.length > 0) {
                console.log(`     Issues:`);
                for (const issue of step.issues) {
                    console.log(`       - ${issue}`);
                }
            }
        }
    }
    console.log('\n========================================\n');
}
function usage() {
    console.error('Usage: prov-verify-detailed <bundle-dir> [<public-key-file>]');
    console.error('\nOptions:');
    console.error('  bundle-dir        Path to provenance bundle directory');
    console.error('  public-key-file   (Optional) Public key for signature verification');
    console.error('\nExample:');
    console.error('  prov-verify-detailed ./bundle ./public-key.pem');
    process.exit(1);
}
async function main() {
    const [bundleDir, publicKeyFile] = process.argv.slice(2);
    if (!bundleDir) {
        usage();
    }
    try {
        const report = verifyDetailed(bundleDir, publicKeyFile);
        printReport(report);
        // Write JSON report
        const jsonReportPath = (0, node_path_1.join)(bundleDir, 'verification-report.json');
        try {
            const { writeFile } = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
            await writeFile(jsonReportPath, JSON.stringify(report, null, 2));
            console.log(`📄 Detailed report saved to: ${jsonReportPath}\n`);
        }
        catch (error) {
            console.warn(`⚠️  Could not save report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        process.exit(report.valid ? 0 : 2);
    }
    catch (error) {
        console.error('❌ Verification failed:', error instanceof Error ? error.message : error);
        process.exit(2);
    }
}
main();
