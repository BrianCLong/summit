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
exports.slsa3Verifier = exports.SLSA3Verifier = void 0;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const z = __importStar(require("zod"));
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const SLSA3ConfigSchema = z.object({
    enabled: z.boolean().default(true),
    trustedBuilders: z
        .array(z.string())
        .default([
        'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml',
        'https://github.com/intelgraph/build-system/.github/workflows/federal-build.yml',
    ]),
    trustedKeys: z.array(z.string()).default([]), // Public keys for signature verification
    requireHermetic: z.boolean().default(true),
    requireReproducible: z.boolean().default(false), // SLSA-4 requirement
    allowedSources: z
        .array(z.string())
        .default(['github.com/intelgraph/', 'github.com/anthropic/']),
    maxAge: z.number().default(86400 * 30), // 30 days max age for provenance
});
class SLSA3Verifier {
    config;
    trustedKeyCache = new Map();
    constructor(config) {
        this.config = SLSA3ConfigSchema.parse({
            ...config,
            enabled: process.env.SLSA3_ENABLED !== 'false',
        });
        if (this.config.enabled) {
            this.loadTrustedKeys();
        }
    }
    async loadTrustedKeys() {
        try {
            // Load public keys for signature verification
            // In production, these would be loaded from a secure key store
            for (const keyPath of this.config.trustedKeys) {
                try {
                    const keyData = await promises_1.default.readFile(keyPath, 'utf8');
                    const keyObject = node_crypto_1.default.createPublicKey(keyData);
                    const keyId = node_crypto_1.default
                        .createHash('sha256')
                        .update(keyData)
                        .digest('hex')
                        .substring(0, 16);
                    this.trustedKeyCache.set(keyId, keyObject);
                }
                catch (error) {
                    console.warn(`Failed to load trusted key ${keyPath}:`, error);
                }
            }
            console.log(`✅ Loaded ${this.trustedKeyCache.size} trusted SLSA verification keys`);
        }
        catch (error) {
            console.error('Failed to load trusted keys:', error);
        }
    }
    /**
     * Verify SHA256 hash of artifact
     */
    async verifySHA256(filePath, expectedHex) {
        try {
            const fileData = await promises_1.default.readFile(filePath);
            const actualHex = node_crypto_1.default
                .createHash('sha256')
                .update(fileData)
                .digest('hex');
            return actualHex === expectedHex.toLowerCase();
        }
        catch (error) {
            console.error(`SHA256 verification failed for ${filePath}:`, error);
            return false;
        }
    }
    /**
     * Verify SLSA v1.0 provenance format and structure
     */
    verifyProvenanceFormat(provenance) {
        const errors = [];
        const pred = provenance.predicate;
        const buildDef = pred?.buildDefinition;
        const runDetails = pred?.runDetails;
        const builder = runDetails?.builder;
        const metadata = runDetails?.metadata;
        // Check required fields
        if (provenance._type !== 'https://in-toto.io/Statement/v0.1') {
            errors.push(`Invalid statement type: ${provenance._type}`);
        }
        if (provenance.predicateType !== 'https://slsa.dev/provenance/v1') {
            errors.push(`Invalid predicate type: ${provenance.predicateType}`);
        }
        if (!Array.isArray(provenance.subject) || provenance.subject.length === 0) {
            errors.push('Missing or empty subject array');
        }
        if (!buildDef?.buildType) {
            errors.push('Missing build type in predicate');
        }
        if (!builder?.id) {
            errors.push('Missing builder ID in run details');
        }
        // Check timestamps
        const startedOn = metadata?.startedOn;
        const finishedOn = metadata?.finishedOn;
        if (startedOn) {
            try {
                const startTime = new Date(startedOn);
                const age = Date.now() - startTime.getTime();
                if (age > this.config.maxAge * 1000) {
                    errors.push(`Provenance too old: ${age / 1000 / 86400} days`);
                }
            }
            catch (error) {
                errors.push('Invalid startedOn timestamp format');
            }
        }
        if (startedOn && finishedOn) {
            try {
                const start = new Date(startedOn);
                const finish = new Date(finishedOn);
                if (finish <= start) {
                    errors.push('Invalid build duration: finishedOn <= startedOn');
                }
            }
            catch (error) {
                errors.push('Invalid timestamp format in metadata');
            }
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Verify builder is in trusted list
     */
    verifyBuilderTrust(builderId) {
        return this.config.trustedBuilders.some((trusted) => builderId === trusted ||
            builderId.startsWith(trusted.replace(/\*$/, '')));
    }
    /**
     * Verify source repository is allowed
     */
    verifySourceIntegrity(provenance) {
        const errors = [];
        // Check if source URI is in allowed list
        const resolvedDeps = provenance.predicate?.buildDefinition?.resolvedDependencies || [];
        const sourceRepos = resolvedDeps.filter((dep) => dep.uri?.includes('github.com') || dep.uri?.includes('gitlab.com'));
        if (sourceRepos.length === 0) {
            errors.push('No source repositories found in resolved dependencies');
            return { valid: false, errors };
        }
        for (const repo of sourceRepos) {
            const allowed = this.config.allowedSources.some((allowed) => repo.uri.includes(allowed));
            if (!allowed) {
                errors.push(`Source repository not allowed: ${repo.uri}`);
            }
            // Verify commit SHA is present and valid format
            if (!repo.digest?.sha1 && !repo.digest?.sha256) {
                errors.push(`Source ${repo.uri} missing commit hash`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    /**
     * Check if build was hermetic (isolated)
     */
    checkHermeticBuild(provenance) {
        const buildType = provenance.predicate?.buildDefinition?.buildType || '';
        // Common indicators of hermetic builds
        const hermeticIndicators = [
            'hermetic',
            'isolated',
            'container',
            'github-actions', // GitHub Actions provides some isolation
        ];
        const isHermetic = hermeticIndicators.some((indicator) => buildType.toLowerCase().includes(indicator));
        // Additional checks for hermetic build
        const externalParams = provenance.predicate?.buildDefinition?.externalParameters || {};
        // Check for network access restrictions
        const hasNetworkRestrictions = externalParams.network === 'none' ||
            externalParams.isolated === true ||
            externalParams.hermetic === true;
        return isHermetic || hasNetworkRestrictions;
    }
    /**
     * Verify DSSE envelope signatures
     */
    async verifySignatures(bundle) {
        const errors = [];
        if (!bundle.dsseEnvelope?.signatures ||
            bundle.dsseEnvelope.signatures.length === 0) {
            errors.push('No signatures found in DSSE envelope');
            return { valid: false, errors };
        }
        const payload = bundle.dsseEnvelope.payload;
        const payloadType = bundle.dsseEnvelope.payloadType;
        // Create PAE (Pre-Authentication Encoding) as per DSSE spec
        const pae = this.createPAE(payloadType, payload);
        let validSignatures = 0;
        for (const signature of bundle.dsseEnvelope.signatures) {
            try {
                const publicKey = this.trustedKeyCache.get(signature.keyid);
                if (!publicKey) {
                    errors.push(`Unknown signing key: ${signature.keyid}`);
                    continue;
                }
                const signatureBuffer = Buffer.from(signature.sig, 'base64');
                // Verify signature against PAE
                const isValid = node_crypto_1.default.verify('sha256', pae, publicKey, signatureBuffer);
                if (isValid) {
                    validSignatures++;
                }
                else {
                    errors.push(`Invalid signature for key: ${signature.keyid}`);
                }
            }
            catch (error) {
                errors.push(`Signature verification failed for ${signature.keyid}: ${error.message}`);
            }
        }
        // Require at least one valid signature
        const valid = validSignatures > 0;
        if (!valid && validSignatures === 0) {
            errors.push('No valid signatures found');
        }
        return { valid, errors };
    }
    /**
     * Create Pre-Authentication Encoding (PAE) for DSSE signature verification
     */
    createPAE(payloadType, payload) {
        // DSSE PAE format: "DSSEv1" + SP + LEN(payloadType) + SP + payloadType + SP + LEN(payload) + SP + payload
        const parts = [
            Buffer.from('DSSEv1', 'utf8'),
            Buffer.from(' ', 'utf8'),
            Buffer.from(payloadType.length.toString(), 'utf8'),
            Buffer.from(' ', 'utf8'),
            Buffer.from(payloadType, 'utf8'),
            Buffer.from(' ', 'utf8'),
            Buffer.from(payload.length.toString(), 'utf8'),
            Buffer.from(' ', 'utf8'),
            Buffer.from(payload, 'utf8'),
        ];
        return Buffer.concat(parts);
    }
    /**
     * Verify complete SLSA-3 provenance bundle
     */
    async verifyProvenance(bundlePath, artifactPath) {
        const span = otel_tracing_js_1.otelService.createSpan('slsa3.verify_provenance');
        try {
            if (!this.config.enabled) {
                return {
                    valid: false,
                    level: 'SLSA_0',
                    provenance: null,
                    checks: {
                        formatValid: false,
                        signatureValid: false,
                        builderTrusted: false,
                        sourceIntegrity: false,
                        hermetic: false,
                        reproduced: false,
                    },
                    errors: ['SLSA verification disabled'],
                    warnings: [],
                };
            }
            const result = {
                valid: false,
                level: 'SLSA_0',
                provenance: null,
                checks: {
                    formatValid: false,
                    signatureValid: false,
                    builderTrusted: false,
                    sourceIntegrity: false,
                    hermetic: false,
                    reproduced: false,
                },
                errors: [],
                warnings: [],
            };
            // Load and parse bundle
            let bundle;
            try {
                const bundleData = await promises_1.default.readFile(bundlePath, 'utf8');
                bundle = JSON.parse(bundleData);
            }
            catch (error) {
                result.errors.push(`Failed to parse provenance bundle: ${error.message}`);
                return result;
            }
            // Decode and parse provenance
            let provenance;
            try {
                const payloadJson = Buffer.from(bundle.dsseEnvelope.payload, 'base64').toString('utf8');
                provenance = JSON.parse(payloadJson);
                result.provenance = provenance;
            }
            catch (error) {
                result.errors.push(`Failed to decode provenance payload: ${error.message}`);
                return result;
            }
            // Verify provenance format
            const formatCheck = this.verifyProvenanceFormat(provenance);
            result.checks.formatValid = formatCheck.valid;
            result.errors.push(...formatCheck.errors);
            // Verify signatures
            const signatureCheck = await this.verifySignatures(bundle);
            result.checks.signatureValid = signatureCheck.valid;
            result.errors.push(...signatureCheck.errors);
            // Verify builder trust
            const pred2 = provenance.predicate;
            const runDetails2 = pred2?.runDetails;
            const builder2 = runDetails2?.builder;
            const builderId = builder2?.id;
            if (builderId) {
                result.checks.builderTrusted = this.verifyBuilderTrust(builderId);
                if (!result.checks.builderTrusted) {
                    result.errors.push(`Untrusted builder: ${builderId}`);
                }
            }
            else {
                result.errors.push('Missing builder ID');
            }
            // Verify source integrity
            const sourceCheck = this.verifySourceIntegrity(provenance);
            result.checks.sourceIntegrity = sourceCheck.valid;
            result.errors.push(...sourceCheck.errors);
            // Check hermetic build
            result.checks.hermetic = this.checkHermeticBuild(provenance);
            if (this.config.requireHermetic && !result.checks.hermetic) {
                result.errors.push('Build was not hermetic (required for SLSA-3)');
            }
            // Verify artifact hashes match
            if (provenance.subject && provenance.subject.length > 0) {
                const subject = provenance.subject[0];
                if (subject.digest?.sha256) {
                    const hashMatch = await this.verifySHA256(artifactPath, subject.digest.sha256);
                    if (!hashMatch) {
                        result.errors.push('Artifact SHA256 hash does not match provenance');
                    }
                }
                else {
                    result.errors.push('Missing SHA256 hash in provenance subject');
                }
            }
            // Check for reproducibility (SLSA-4 requirement)
            if (this.config.requireReproducible) {
                // This would require additional verification of reproducible builds
                // For now, check if byproducts include reproducibility attestation
                const pred3 = provenance.predicate;
                const runDetails3 = pred3?.runDetails;
                const byproducts = runDetails3?.byproducts || [];
                const hasReproducibilityAttestation = byproducts.some((bp) => bp.name?.includes('reproducibility') ||
                    bp.name?.includes('rebuild'));
                result.checks.reproduced = hasReproducibilityAttestation;
                if (!result.checks.reproduced) {
                    result.warnings.push('No reproducibility attestation found (required for SLSA-4)');
                }
            }
            // Determine SLSA level achieved
            if (result.checks.formatValid &&
                result.checks.signatureValid &&
                result.checks.builderTrusted) {
                if (result.checks.sourceIntegrity && result.checks.hermetic) {
                    if (result.checks.reproduced) {
                        result.level = 'SLSA_4';
                    }
                    else {
                        result.level = 'SLSA_3';
                    }
                }
                else if (result.checks.sourceIntegrity) {
                    result.level = 'SLSA_2';
                }
                else {
                    result.level = 'SLSA_1';
                }
            }
            // Overall validity
            result.valid =
                result.errors.length === 0 &&
                    result.level !== 'SLSA_0' &&
                    (result.level === 'SLSA_3' || result.level === 'SLSA_4');
            otel_tracing_js_1.otelService.addSpanAttributes({
                'slsa3.valid': result.valid,
                'slsa3.level': result.level,
                'slsa3.builder_id': builderId || 'unknown',
                'slsa3.error_count': result.errors.length,
                'slsa3.warning_count': result.warnings.length,
            });
            console.log(`SLSA verification result: ${result.level} (${result.valid ? 'VALID' : 'INVALID'})`);
            return result;
        }
        catch (error) {
            console.error('SLSA-3 verification failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            return {
                valid: false,
                level: 'SLSA_0',
                provenance: null,
                checks: {
                    formatValid: false,
                    signatureValid: false,
                    builderTrusted: false,
                    sourceIntegrity: false,
                    hermetic: false,
                    reproduced: false,
                },
                errors: [error.message],
                warnings: [],
            };
        }
        finally {
            span?.end();
        }
    }
    /**
     * Batch verify multiple artifacts with their provenance
     */
    async verifyBatch(artifacts) {
        const results = [];
        let validCount = 0;
        let slsa3Count = 0;
        let slsa4Count = 0;
        for (const artifact of artifacts) {
            try {
                const result = await this.verifyProvenance(artifact.provenancePath, artifact.artifactPath);
                results.push({ name: artifact.name, result });
                if (result.valid) {
                    validCount++;
                    if (result.level === 'SLSA_3')
                        slsa3Count++;
                    if (result.level === 'SLSA_4')
                        slsa4Count++;
                }
            }
            catch (error) {
                results.push({
                    name: artifact.name,
                    result: {
                        valid: false,
                        level: 'SLSA_0',
                        provenance: null,
                        checks: {
                            formatValid: false,
                            signatureValid: false,
                            builderTrusted: false,
                            sourceIntegrity: false,
                            hermetic: false,
                            reproduced: false,
                        },
                        errors: [error.message],
                        warnings: [],
                    },
                });
            }
        }
        return {
            overallValid: validCount === artifacts.length,
            results,
            summary: {
                total: artifacts.length,
                valid: validCount,
                failed: artifacts.length - validCount,
                slsa3Count,
                slsa4Count,
            },
        };
    }
    /**
     * Generate verification report for compliance
     */
    generateComplianceReport(results) {
        const artifacts = results.map(({ name, result }) => ({
            name,
            compliant: result.valid,
            level: result.level,
            issues: result.errors,
        }));
        const levels = results
            .map((r) => r.result.level)
            .filter((l) => l !== 'SLSA_0');
        const minLevel = levels.length > 0 ? levels.sort()[0] : 'SLSA_0';
        const maxLevel = levels.length > 0 ? levels.sort().reverse()[0] : 'SLSA_0';
        const overallCompliance = artifacts.every((a) => a.compliant)
            ? 'COMPLIANT'
            : 'NON_COMPLIANT';
        const recommendations = [];
        if (overallCompliance === 'NON_COMPLIANT') {
            recommendations.push('Resolve all provenance verification failures before deployment');
        }
        if (minLevel !== 'SLSA_3' && minLevel !== 'SLSA_4') {
            recommendations.push('Upgrade build system to achieve SLSA-3 minimum level');
        }
        if (!results.every((r) => r.result.checks.hermetic)) {
            recommendations.push('Ensure all builds are hermetic for improved supply chain security');
        }
        return {
            timestamp: new Date(),
            overallCompliance,
            minLevel,
            maxLevel,
            artifacts,
            recommendations,
        };
    }
}
exports.SLSA3Verifier = SLSA3Verifier;
// Create singleton instance
exports.slsa3Verifier = new SLSA3Verifier();
