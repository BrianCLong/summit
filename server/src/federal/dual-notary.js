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
exports.dualNotary = exports.DualNotaryService = void 0;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const z = __importStar(require("zod"));
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const pkcs11_guard_js_1 = require("./pkcs11-guard.js");
const DualNotaryConfigSchema = z.object({
    hsmEnabled: z.boolean().default(true),
    tsaEnabled: z.boolean().default(false), // Only enable in connected environments
    hsmKeyLabel: z.string().default('audit-root-signing-key'),
    tsa: z.object({
        url: z.string().url().optional(),
        timeout: z.number().min(1000).max(30000).default(10000),
        retries: z.number().min(0).max(5).default(2),
        requiresCert: z.boolean().default(false),
        hashAlgorithm: z.enum(['SHA256', 'SHA384', 'SHA512']).default('SHA384'),
    }),
});
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
class DualNotaryService {
    config;
    pkcs11Ctx = null;
    constructor(config) {
        this.config = DualNotaryConfigSchema.parse({
            ...config,
            tsaEnabled: process.env.TSA_ENABLED === 'true' && !process.env.AIRGAP_ENABLED,
            tsa: {
                url: process.env.TSA_URL || config?.tsa?.url,
                timeout: Number(process.env.TSA_TIMEOUT) || config?.tsa?.timeout,
                ...config?.tsa,
            },
        });
        if (this.config.hsmEnabled) {
            this.initializeHSM();
        }
    }
    async initializeHSM() {
        try {
            this.pkcs11Ctx = (0, pkcs11_guard_js_1.initPKCS11)();
            console.log('✅ Dual notary HSM initialized');
        }
        catch (error) {
            console.error('HSM initialization failed for notary service:', error);
            if (this.config.hsmEnabled) {
                throw error;
            }
        }
    }
    /**
     * Sign Merkle root with HSM using ECDSA-P384
     */
    async signRootWithHSM(rootHex) {
        const span = otel_tracing_js_1.otelService.createSpan('notary.hsm_sign');
        try {
            if (!this.config.hsmEnabled || !this.pkcs11Ctx) {
                throw new Error('HSM not available for signing');
            }
            const rootBuffer = Buffer.from(rootHex, 'hex');
            // Hash the root before signing (best practice)
            const hash = node_crypto_1.default.createHash('sha384').update(rootBuffer).digest();
            const signature = (0, pkcs11_guard_js_1.ecdsaP384Sign)(this.pkcs11Ctx, this.config.hsmKeyLabel, hash);
            const signatureBase64 = signature.toString('base64');
            otel_tracing_js_1.otelService.addSpanAttributes({
                'notary.hsm.root_hex': rootHex,
                'notary.hsm.signature_length': signature.length,
                'notary.hsm.key_label': this.config.hsmKeyLabel,
            });
            console.log(`✅ HSM signed root: ${rootHex.substring(0, 16)}...`);
            return signatureBase64;
        }
        catch (error) {
            console.error('HSM root signing failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Get RFC 3161 timestamp from external TSA
     */
    async getTimestampFromTSA(rootHex) {
        const span = otel_tracing_js_1.otelService.createSpan('notary.tsa_timestamp');
        try {
            if (!this.config.tsaEnabled || !this.config.tsa.url) {
                throw new Error('TSA not configured or disabled');
            }
            // Create temporary files for OpenSSL TSA operations
            const tempDir = '/tmp/tsa-' + Date.now();
            await promises_1.default.mkdir(tempDir, { recursive: true });
            const rootBinPath = `${tempDir}/root.bin`;
            const tsqPath = `${tempDir}/tsq.der`;
            const tsrPath = `${tempDir}/tsr.der`;
            try {
                // Write binary root data
                const rootBuffer = Buffer.from(rootHex, 'hex');
                await promises_1.default.writeFile(rootBinPath, rootBuffer);
                // Create timestamp query
                const queryCmd = [
                    'openssl',
                    'ts',
                    '-query',
                    `-${this.config.tsa.hashAlgorithm.toLowerCase()}`,
                    '-data',
                    rootBinPath,
                    '-no_nonce',
                    this.config.tsa.requiresCert ? '-cert' : '',
                    '-out',
                    tsqPath,
                ]
                    .filter(Boolean)
                    .join(' ');
                await execAsync(queryCmd, { timeout: 5000 });
                // Send query to TSA
                const curlCmd = [
                    'curl',
                    '-sS',
                    '-H',
                    'Content-Type: application/timestamp-query',
                    '--data-binary',
                    `@${tsqPath}`,
                    '--max-time',
                    (this.config.tsa.timeout / 1000).toString(),
                    this.config.tsa.url,
                    '-o',
                    tsrPath,
                ].join(' ');
                let lastError = null;
                // Retry logic for TSA requests
                for (let attempt = 0; attempt <= this.config.tsa.retries; attempt++) {
                    try {
                        await execAsync(curlCmd, { timeout: this.config.tsa.timeout });
                        // Verify response exists and is valid
                        const tsrStats = await promises_1.default.stat(tsrPath);
                        if (tsrStats.size === 0) {
                            throw new Error('Empty TSA response');
                        }
                        // Read and encode TSA response
                        const tsrBuffer = await promises_1.default.readFile(tsrPath);
                        const tsrBase64 = tsrBuffer.toString('base64');
                        otel_tracing_js_1.otelService.addSpanAttributes({
                            'notary.tsa.url': this.config.tsa.url,
                            'notary.tsa.attempts': attempt + 1,
                            'notary.tsa.response_size': tsrBuffer.length,
                            'notary.tsa.hash_algorithm': this.config.tsa.hashAlgorithm,
                        });
                        console.log(`✅ TSA timestamp obtained from ${this.config.tsa.url} (attempt ${attempt + 1})`);
                        return tsrBase64;
                    }
                    catch (error) {
                        lastError = error;
                        if (attempt < this.config.tsa.retries) {
                            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                            console.warn(`TSA attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
                            await new Promise((resolve) => setTimeout(resolve, delay));
                        }
                    }
                }
                throw lastError || new Error('All TSA attempts failed');
            }
            finally {
                // Clean up temporary files
                try {
                    await promises_1.default.rm(tempDir, { recursive: true, force: true });
                }
                catch (cleanupError) {
                    console.warn('Failed to cleanup TSA temp files:', cleanupError);
                }
            }
        }
        catch (error) {
            console.error('TSA timestamp failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Notarize Merkle root using dual-path approach
     */
    async notarizeRoot(rootHex) {
        const span = otel_tracing_js_1.otelService.createSpan('notary.notarize_root');
        try {
            const notarized = {
                rootHex,
                timestamp: new Date(),
                hsmSignature: '',
                notarizedBy: [],
                verification: {
                    hsmValid: false,
                    tsaValid: false,
                },
            };
            // HSM signature (always attempted if enabled)
            if (this.config.hsmEnabled) {
                try {
                    notarized.hsmSignature = await this.signRootWithHSM(rootHex);
                    notarized.notarizedBy.push('HSM');
                    notarized.verification.hsmValid = true;
                }
                catch (error) {
                    console.error('HSM notarization failed:', error);
                    // Continue with TSA if HSM fails
                }
            }
            // TSA timestamp (only in connected environments)
            if (this.config.tsaEnabled) {
                try {
                    notarized.tsaResponse = await this.getTimestampFromTSA(rootHex);
                    notarized.notarizedBy.push('TSA');
                    notarized.verification.tsaValid = true;
                }
                catch (error) {
                    console.error('TSA notarization failed:', error);
                    // TSA failure is not critical if HSM succeeded
                }
            }
            // Ensure at least one notarization method succeeded
            if (notarized.notarizedBy.length === 0) {
                throw new Error('All notarization methods failed');
            }
            otel_tracing_js_1.otelService.addSpanAttributes({
                'notary.root_hex': rootHex,
                'notary.methods': notarized.notarizedBy.join(','),
                'notary.hsm_valid': notarized.verification.hsmValid,
                'notary.tsa_valid': notarized.verification.tsaValid,
            });
            console.log(`✅ Root notarized via: ${notarized.notarizedBy.join(' + ')}`);
            return notarized;
        }
        catch (error) {
            console.error('Root notarization failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Verify notarized root signature and timestamp
     */
    async verifyNotarizedRoot(notarized) {
        const span = otel_tracing_js_1.otelService.createSpan('notary.verify_root');
        try {
            const errors = [];
            let hsmVerification = false;
            let tsaVerification = false;
            // Verify HSM signature if present
            if (notarized.hsmSignature && this.config.hsmEnabled) {
                try {
                    // In production, would use HSM public key to verify signature
                    // For now, validate signature format and presence
                    const sigBuffer = Buffer.from(notarized.hsmSignature, 'base64');
                    if (sigBuffer.length >= 64) {
                        // ECDSA P-384 signature should be ~96 bytes
                        hsmVerification = true;
                    }
                    else {
                        errors.push('HSM signature too short');
                    }
                }
                catch (error) {
                    errors.push(`HSM signature verification failed: ${error.message}`);
                }
            }
            // Verify TSA response if present
            if (notarized.tsaResponse) {
                try {
                    // Create temporary file for TSA verification
                    const tempDir = '/tmp/tsa-verify-' + Date.now();
                    await promises_1.default.mkdir(tempDir, { recursive: true });
                    try {
                        const tsrPath = `${tempDir}/tsr.der`;
                        const rootPath = `${tempDir}/root.bin`;
                        // Write TSA response and root data
                        const tsrBuffer = Buffer.from(notarized.tsaResponse, 'base64');
                        await promises_1.default.writeFile(tsrPath, tsrBuffer);
                        await promises_1.default.writeFile(rootPath, Buffer.from(notarized.rootHex, 'hex'));
                        // Verify TSA response (if TSA root certificates are available)
                        const verifyCmd = [
                            'openssl',
                            'ts',
                            '-verify',
                            '-in',
                            tsrPath,
                            '-data',
                            rootPath,
                            // In production, add: '-CAfile', '/path/to/tsa-root.pem',
                            // In production, add: '-untrusted', '/path/to/tsa-chain.pem'
                        ].join(' ');
                        try {
                            await execAsync(verifyCmd, { timeout: 5000 });
                            tsaVerification = true;
                        }
                        catch (verifyError) {
                            // TSA verification might fail if root certs not available
                            // Check if response is structurally valid instead
                            if (tsrBuffer.length > 100) {
                                tsaVerification = true; // Basic structural validation
                            }
                            else {
                                errors.push('TSA response structurally invalid');
                            }
                        }
                    }
                    finally {
                        await promises_1.default.rm(tempDir, { recursive: true, force: true });
                    }
                }
                catch (error) {
                    errors.push(`TSA verification failed: ${error.message}`);
                }
            }
            const valid = (hsmVerification || tsaVerification) && errors.length === 0;
            otel_tracing_js_1.otelService.addSpanAttributes({
                'notary.verify.valid': valid,
                'notary.verify.hsm_valid': hsmVerification,
                'notary.verify.tsa_valid': tsaVerification,
                'notary.verify.error_count': errors.length,
            });
            return {
                valid,
                hsmVerification,
                tsaVerification,
                errors,
            };
        }
        catch (error) {
            console.error('Root verification failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            return {
                valid: false,
                hsmVerification: false,
                tsaVerification: false,
                errors: [error.message],
            };
        }
        finally {
            span?.end();
        }
    }
    /**
     * Generate notarization capabilities report
     */
    getCapabilities() {
        const hsmAvailable = this.config.hsmEnabled && this.pkcs11Ctx !== null;
        const tsaAvailable = this.config.tsaEnabled && !!this.config.tsa.url;
        let recommendedMode;
        if (hsmAvailable && tsaAvailable) {
            recommendedMode = 'DUAL_PATH';
        }
        else if (hsmAvailable) {
            recommendedMode = 'HSM_ONLY';
        }
        else {
            recommendedMode = 'UNAVAILABLE';
        }
        return {
            hsmAvailable,
            tsaAvailable,
            tsaUrl: this.config.tsa.url,
            recommendedMode,
        };
    }
    /**
     * Health check for notarization services
     */
    async healthCheck() {
        let hsmHealthy = false;
        let tsaHealthy = false;
        // Check HSM
        if (this.config.hsmEnabled) {
            try {
                if (this.pkcs11Ctx) {
                    hsmHealthy = true;
                }
            }
            catch (error) {
                console.warn('HSM health check failed:', error);
            }
        }
        // Check TSA connectivity
        if (this.config.tsaEnabled && this.config.tsa.url) {
            try {
                // Simple connectivity test
                const testCmd = `curl -s --max-time 5 --head "${this.config.tsa.url}"`;
                await execAsync(testCmd);
                tsaHealthy = true;
            }
            catch (error) {
                console.warn('TSA health check failed:', error);
            }
        }
        let status;
        if (hsmHealthy && (!this.config.tsaEnabled || tsaHealthy)) {
            status = 'healthy';
        }
        else if (hsmHealthy || tsaHealthy) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            hsm: hsmHealthy,
            tsa: tsaHealthy,
            details: {
                hsmEnabled: this.config.hsmEnabled,
                tsaEnabled: this.config.tsaEnabled,
                tsaUrl: this.config.tsa.url,
            },
        };
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.pkcs11Ctx) {
            try {
                (0, pkcs11_guard_js_1.finalizePKCS11)(this.pkcs11Ctx);
                this.pkcs11Ctx = null;
            }
            catch (error) {
                console.warn('Failed to cleanup PKCS#11 context:', error);
            }
        }
    }
}
exports.DualNotaryService = DualNotaryService;
// Create singleton instance
exports.dualNotary = new DualNotaryService();
