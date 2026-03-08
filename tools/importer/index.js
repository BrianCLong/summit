#!/usr/bin/env ts-node
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
const commander_1 = require("commander");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const tar = __importStar(require("tar"));
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('import-tool', '24.3.0');
class ImportVerifier {
    workDir;
    bundleName;
    constructor(bundlePath) {
        this.bundleName = (0, path_1.basename)(bundlePath, '.tar.gz');
        this.workDir = `/tmp/import-${this.bundleName}-${Date.now()}`;
    }
    async verifyAndExtract(options) {
        return tracer.startActiveSpan('import.verify_extract', async (span) => {
            const result = {
                valid: true,
                errors: [],
                warnings: [],
            };
            span.setAttributes({
                bundle_path: options.bundlePath,
                verify_signature: options.verifySignature,
                validate_provenance: options.validateProvenance,
                dry_run: options.dryRun,
            });
            try {
                console.log(`🔍 Verifying export bundle: ${options.bundlePath}`);
                // Create working directory
                await (0, promises_1.mkdir)(this.workDir, { recursive: true });
                // Extract bundle
                await this.extractBundle(options.bundlePath);
                // Load and validate manifest
                const manifestValidation = await this.validateManifest();
                result.manifest = manifestValidation.manifest;
                result.errors.push(...manifestValidation.errors);
                result.warnings.push(...manifestValidation.warnings);
                if (!manifestValidation.valid) {
                    result.valid = false;
                    return result;
                }
                // Verify file integrity
                const integrityValidation = await this.verifyFileIntegrity(result.manifest);
                result.errors.push(...integrityValidation.errors);
                result.warnings.push(...integrityValidation.warnings);
                if (!integrityValidation.valid) {
                    result.valid = false;
                }
                // Verify signature if requested
                if (options.verifySignature && options.cosignPubKey) {
                    result.signature = await this.verifySignature(options.bundlePath, options.cosignPubKey);
                    if (!result.signature.valid) {
                        result.valid = false;
                        result.errors.push(...result.signature.errors);
                    }
                }
                // Validate provenance chain
                if (options.validateProvenance) {
                    result.provenance = await this.validateProvenance(result.manifest);
                    if (!result.provenance.valid) {
                        result.valid = false;
                        result.errors.push(...result.provenance.errors);
                    }
                }
                // Validate attestation
                result.attestation = await this.validateAttestation(options.bundlePath, result.manifest);
                if (!result.attestation.valid) {
                    result.warnings.push(...result.attestation.errors);
                }
                // Check expiration
                if (!options.allowExpired) {
                    const expirationCheck = this.checkExpiration(result.manifest);
                    if (!expirationCheck.valid) {
                        result.valid = false;
                        result.errors.push(expirationCheck.error);
                    }
                }
                // Extract to output directory if validation passes and not dry run
                if (result.valid && !options.dryRun) {
                    await this.extractToOutput(options.outputDir, result.manifest);
                }
                span.setAttributes({
                    validation_result: result.valid,
                    errors_count: result.errors.length,
                    warnings_count: result.warnings.length,
                });
                return result;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                result.valid = false;
                result.errors.push(`Import verification failed: ${error.message}`);
                return result;
            }
            finally {
                span.end();
            }
        });
    }
    async extractBundle(bundlePath) {
        return tracer.startActiveSpan('import.extract_bundle', async (span) => {
            console.log('📦 Extracting bundle...');
            try {
                await tar.extract({
                    file: bundlePath,
                    cwd: this.workDir,
                });
                span.setAttributes({ extracted_to: this.workDir });
                console.log(`✅ Bundle extracted to: ${this.workDir}`);
            }
            catch (error) {
                span.recordException(error);
                throw new Error(`Bundle extraction failed: ${error.message}`);
            }
            finally {
                span.end();
            }
        });
    }
    async validateManifest() {
        return tracer.startActiveSpan('import.validate_manifest', async (span) => {
            const errors = [];
            const warnings = [];
            try {
                const manifestPath = (0, path_1.join)(this.workDir, 'manifest.json');
                const manifestContent = await (0, promises_1.readFile)(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                // Validate required fields
                const requiredFields = [
                    'version',
                    'exportId',
                    'tenantId',
                    'region',
                    'purpose',
                    'createdAt',
                    'files',
                ];
                for (const field of requiredFields) {
                    if (!manifest[field]) {
                        errors.push(`Missing required field: ${field}`);
                    }
                }
                // Validate version compatibility
                if (manifest.version !== '24.3.0') {
                    warnings.push(`Version mismatch: expected 24.3.0, got ${manifest.version}`);
                }
                // Validate export purpose
                const validPurposes = [
                    'legal_compliance',
                    'data_migration',
                    'analytics',
                    'backup',
                ];
                if (!validPurposes.includes(manifest.purpose)) {
                    errors.push(`Invalid purpose: ${manifest.purpose}`);
                }
                // Validate provenance chain structure
                if (!manifest.provenance || manifest.provenance.length === 0) {
                    errors.push('Missing provenance chain');
                }
                // Validate files array
                if (!manifest.files || manifest.files.length === 0) {
                    errors.push('No files listed in manifest');
                }
                span.setAttributes({
                    manifest_valid: errors.length === 0,
                    export_id: manifest.exportId,
                    tenant_id: manifest.tenantId,
                    files_count: manifest.files?.length || 0,
                });
                console.log(`📋 Manifest validation: ${errors.length === 0 ? 'PASS' : 'FAIL'}`);
                return {
                    valid: errors.length === 0,
                    manifest: errors.length === 0 ? manifest : undefined,
                    errors,
                    warnings,
                };
            }
            catch (error) {
                span.recordException(error);
                errors.push(`Manifest parsing failed: ${error.message}`);
                return { valid: false, errors, warnings };
            }
            finally {
                span.end();
            }
        });
    }
    async verifyFileIntegrity(manifest) {
        return tracer.startActiveSpan('import.verify_file_integrity', async (span) => {
            const errors = [];
            const warnings = [];
            console.log('🔐 Verifying file integrity...');
            try {
                for (const file of manifest.files) {
                    const filepath = (0, path_1.join)(this.workDir, file.filename);
                    try {
                        // Check file exists
                        const actualChecksum = await this.calculateFileChecksum(filepath);
                        // Verify checksum matches manifest
                        if (actualChecksum !== file.checksum) {
                            errors.push(`Checksum mismatch for ${file.filename}: expected ${file.checksum}, got ${actualChecksum}`);
                        }
                        // Verify checksum matches checksums record
                        if (manifest.checksums[file.filename] &&
                            manifest.checksums[file.filename] !== actualChecksum) {
                            errors.push(`Checksum record mismatch for ${file.filename}`);
                        }
                    }
                    catch (error) {
                        errors.push(`File verification failed for ${file.filename}: ${error.message}`);
                    }
                }
                span.setAttributes({
                    files_verified: manifest.files.length,
                    integrity_valid: errors.length === 0,
                });
                console.log(`✅ File integrity: ${errors.length === 0 ? 'PASS' : 'FAIL'}`);
                return { valid: errors.length === 0, errors, warnings };
            }
            catch (error) {
                span.recordException(error);
                errors.push(`File integrity verification failed: ${error.message}`);
                return { valid: false, errors, warnings };
            }
            finally {
                span.end();
            }
        });
    }
    async verifySignature(bundlePath, cosignPubKey) {
        return tracer.startActiveSpan('import.verify_signature', async (span) => {
            const result = {
                valid: false,
                verified: false,
                errors: [],
            };
            console.log('🔏 Verifying signature...');
            try {
                const signatureFile = `${bundlePath}.sig`;
                // Verify signature using cosign
                await this.runCommand('cosign', [
                    'verify-blob',
                    '--key',
                    cosignPubKey,
                    '--signature',
                    signatureFile,
                    bundlePath,
                ]);
                result.valid = true;
                result.verified = true;
                result.signer = 'cosign-verified';
                span.setAttributes({
                    signature_valid: true,
                    signature_file: signatureFile,
                });
                console.log(`✅ Signature verification: PASS`);
            }
            catch (error) {
                result.errors.push(`Signature verification failed: ${error.message}`);
                span.setAttributes({
                    signature_valid: false,
                    error: error.message,
                });
                console.log(`❌ Signature verification: FAIL`);
            }
            finally {
                span.end();
            }
            return result;
        });
    }
    async validateProvenance(manifest) {
        return tracer.startActiveSpan('import.validate_provenance', async (span) => {
            const result = {
                valid: true,
                chainComplete: true,
                chronologicalOrder: true,
                actorsValid: true,
                errors: [],
            };
            console.log('📜 Validating provenance chain...');
            try {
                const provenance = manifest.provenance;
                // Check chain completeness
                const requiredActions = ['export_initiated'];
                for (const action of requiredActions) {
                    if (!provenance.some((entry) => entry.action === action)) {
                        result.chainComplete = false;
                        result.errors.push(`Missing required provenance action: ${action}`);
                    }
                }
                // Check chronological order
                for (let i = 1; i < provenance.length; i++) {
                    const prevTime = new Date(provenance[i - 1].timestamp);
                    const currTime = new Date(provenance[i].timestamp);
                    if (prevTime > currTime) {
                        result.chronologicalOrder = false;
                        result.errors.push(`Provenance chain not in chronological order at index ${i}`);
                    }
                }
                // Validate actors
                const validActors = ['exporter', 'system', 'admin'];
                for (const entry of provenance) {
                    if (!validActors.includes(entry.actor) &&
                        !entry.actor.includes('@')) {
                        result.actorsValid = false;
                        result.warnings = result.warnings || [];
                        result.warnings.push(`Unusual actor in provenance: ${entry.actor}`);
                    }
                }
                // Check for suspicious gaps
                for (let i = 1; i < provenance.length; i++) {
                    const prevTime = new Date(provenance[i - 1].timestamp);
                    const currTime = new Date(provenance[i].timestamp);
                    const gapMs = currTime.getTime() - prevTime.getTime();
                    if (gapMs > 24 * 60 * 60 * 1000) {
                        // 24 hours
                        result.warnings = result.warnings || [];
                        result.warnings.push(`Large time gap in provenance chain: ${gapMs / (60 * 60 * 1000)} hours`);
                    }
                }
                result.valid =
                    result.chainComplete &&
                        result.chronologicalOrder &&
                        result.actorsValid;
                span.setAttributes({
                    provenance_valid: result.valid,
                    chain_length: provenance.length,
                    chain_complete: result.chainComplete,
                    chronological_order: result.chronologicalOrder,
                });
                console.log(`✅ Provenance validation: ${result.valid ? 'PASS' : 'FAIL'}`);
            }
            catch (error) {
                result.valid = false;
                result.errors.push(`Provenance validation failed: ${error.message}`);
                span.recordException(error);
            }
            finally {
                span.end();
            }
            return result;
        });
    }
    async validateAttestation(bundlePath, manifest) {
        return tracer.startActiveSpan('import.validate_attestation', async (span) => {
            const result = {
                valid: false,
                predicateType: '',
                subjectMatches: false,
                builderTrusted: false,
                errors: [],
            };
            console.log('📋 Validating attestation...');
            try {
                const attestationPath = `${bundlePath}.att`;
                const attestationContent = await (0, promises_1.readFile)(attestationPath, 'utf8');
                const attestation = JSON.parse(attestationContent);
                // Validate attestation structure
                if (attestation._type !== 'https://in-toto.io/Statement/v0.1') {
                    result.errors.push(`Invalid attestation type: ${attestation._type}`);
                }
                result.predicateType = attestation.predicateType || '';
                if (!result.predicateType.includes('maestro.dev/attestation/export')) {
                    result.errors.push(`Unexpected predicate type: ${result.predicateType}`);
                }
                // Verify subject matches bundle
                if (attestation.subject && attestation.subject.length > 0) {
                    const subject = attestation.subject[0];
                    const bundleChecksum = await this.calculateFileChecksum(bundlePath);
                    if (subject.digest?.sha256 === bundleChecksum) {
                        result.subjectMatches = true;
                    }
                    else {
                        result.errors.push('Attestation subject does not match bundle checksum');
                    }
                }
                // Verify builder trust
                const builderId = attestation.predicate?.runDetails?.builder?.id;
                const trustedBuilders = [
                    'maestro-exporter-us-east-1',
                    'maestro-exporter-us-west-2',
                    'maestro-exporter-eu-west-1',
                ];
                if (builderId && trustedBuilders.includes(builderId)) {
                    result.builderTrusted = true;
                }
                else {
                    result.errors.push(`Untrusted builder: ${builderId}`);
                }
                result.valid =
                    result.subjectMatches &&
                        result.builderTrusted &&
                        result.errors.length === 0;
                span.setAttributes({
                    attestation_valid: result.valid,
                    predicate_type: result.predicateType,
                    subject_matches: result.subjectMatches,
                    builder_trusted: result.builderTrusted,
                });
                console.log(`✅ Attestation validation: ${result.valid ? 'PASS' : 'FAIL'}`);
            }
            catch (error) {
                result.errors.push(`Attestation validation failed: ${error.message}`);
                span.recordException(error);
            }
            finally {
                span.end();
            }
            return result;
        });
    }
    checkExpiration(manifest) {
        const expiresAt = new Date(manifest.expiresAt);
        const now = new Date();
        if (now > expiresAt) {
            return {
                valid: false,
                error: `Export bundle expired on ${expiresAt.toISOString()}`,
            };
        }
        return { valid: true };
    }
    async extractToOutput(outputDir, manifest) {
        console.log(`📁 Extracting verified files to: ${outputDir}`);
        await (0, promises_1.mkdir)(outputDir, { recursive: true });
        // Copy verified files
        for (const file of manifest.files) {
            const sourcePath = (0, path_1.join)(this.workDir, file.filename);
            const targetPath = (0, path_1.join)(outputDir, file.filename);
            const content = await (0, promises_1.readFile)(sourcePath);
            await (0, promises_1.writeFile)(targetPath, content);
        }
        // Copy manifest
        const manifestPath = (0, path_1.join)(this.workDir, 'manifest.json');
        const targetManifestPath = (0, path_1.join)(outputDir, 'manifest.json');
        const manifestContent = await (0, promises_1.readFile)(manifestPath);
        await (0, promises_1.writeFile)(targetManifestPath, manifestContent);
        console.log(`✅ Files extracted to: ${outputDir}`);
    }
    async calculateFileChecksum(filepath) {
        const content = await (0, promises_1.readFile)(filepath);
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    async runCommand(command, args) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, { stdio: 'pipe' });
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Command failed with exit code ${code}`));
                }
            });
            child.on('error', reject);
        });
    }
}
// CLI Interface
const program = new commander_1.Command();
program
    .name('maestro-import')
    .description('Maestro Conductor v24.3.0 - Import Verification Tool')
    .version('24.3.0');
program
    .command('verify')
    .description('Verify and extract signed export bundle')
    .requiredOption('-b, --bundle-path <path>', 'Path to export bundle (.tar.gz)')
    .requiredOption('-o, --output-dir <dir>', 'Output directory for extracted files')
    .option('--verify-signature', 'Verify cosign signature', true)
    .option('--cosign-pub-key <path>', 'Path to cosign public key')
    .option('--validate-provenance', 'Validate provenance chain', true)
    .option('--allow-expired', 'Allow expired export bundles', false)
    .option('--dry-run', 'Validate only, do not extract', false)
    .option('--trust-policy <path>', 'Path to trust policy file')
    .action(async (options) => {
    try {
        const verifier = new ImportVerifier(options.bundlePath);
        const importOptions = {
            bundlePath: options.bundlePath,
            verifySignature: options.verifySignature,
            cosignPubKey: options.cosignPubKey,
            validateProvenance: options.validateProvenance,
            allowExpired: options.allowExpired,
            outputDir: options.outputDir,
            dryRun: options.dryRun,
            trustPolicy: options.trustPolicy,
        };
        const result = await verifier.verifyAndExtract(importOptions);
        // Display results
        console.log('\n📊 VERIFICATION RESULTS');
        console.log('========================');
        console.log(`Overall: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
        if (result.manifest) {
            console.log(`Export ID: ${result.manifest.exportId}`);
            console.log(`Tenant: ${result.manifest.tenantId}`);
            console.log(`Purpose: ${result.manifest.purpose}`);
            console.log(`Region: ${result.manifest.region}`);
            console.log(`Created: ${result.manifest.createdAt}`);
            console.log(`Expires: ${result.manifest.expiresAt}`);
        }
        if (result.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            result.errors.forEach((error) => console.log(`  - ${error}`));
        }
        if (result.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            result.warnings.forEach((warning) => console.log(`  - ${warning}`));
        }
        if (result.signature) {
            console.log(`\n🔏 Signature: ${result.signature.valid ? '✅ VALID' : '❌ INVALID'}`);
        }
        if (result.provenance) {
            console.log(`\n📜 Provenance: ${result.provenance.valid ? '✅ VALID' : '❌ INVALID'}`);
        }
        if (result.attestation) {
            console.log(`\n📋 Attestation: ${result.attestation.valid ? '✅ VALID' : '⚠️ UNVERIFIED'}`);
        }
        process.exit(result.valid ? 0 : 1);
    }
    catch (error) {
        console.error('❌ Import verification failed:', error);
        process.exit(1);
    }
});
if (require.main === module) {
    program.parse();
}
