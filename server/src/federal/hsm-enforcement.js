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
exports.assertFipsAndHsm = exports.hsmEnforcement = void 0;
exports.createHSMEnforcement = createHSMEnforcement;
const crypto = __importStar(require("node:crypto"));
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
class HSMEnforcement {
    probeCache = null;
    probeTimer = null;
    config;
    constructor(config) {
        this.config = {
            enabledProviders: ['AWS_CloudHSM'],
            fallbackToSoftware: false, // CRITICAL: Must be false for Federal
            probeInterval: 60, // 1 minute
            requirePKCS11: true,
            ...config,
        };
        // Freeze crypto module configuration to prevent runtime tampering
        this.freezeCryptoModules();
        // Start continuous HSM probing
        this.startContinuousProbing();
    }
    freezeCryptoModules() {
        // Prevent runtime reconfiguration of crypto providers
        Object.freeze(process.versions);
        Object.freeze(crypto.constants);
        // Ensure Node.js was built with FIPS support
        if (!process.config?.variables?.openssl_fips) {
            console.error('CRITICAL: Node.js not built with FIPS-enabled OpenSSL');
            if (!this.config.fallbackToSoftware) {
                process.exit(1);
            }
        }
        // Verify FIPS mode is active
        const fipsEnabled = crypto.getFips?.();
        if (!fipsEnabled && !this.config.fallbackToSoftware) {
            console.error('CRITICAL: FIPS mode not enabled in Node.js crypto');
            process.exit(1);
        }
        console.log('✅ Crypto modules frozen - FIPS enforcement active');
    }
    startContinuousProbing() {
        this.performHSMProbe().then(() => {
            this.probeTimer = setInterval(async () => {
                await this.performHSMProbe();
            }, this.config.probeInterval * 1000);
        });
    }
    async performHSMProbe() {
        const span = otel_tracing_js_1.otelService.createSpan('hsm.probe');
        try {
            let result = {
                available: false,
                fipsMode: false,
                provider: 'unknown',
                lastProbed: new Date(),
                mechanisms: [],
            };
            // Probe based on configured providers
            for (const provider of this.config.enabledProviders) {
                switch (provider) {
                    case 'AWS_CloudHSM':
                        result = await this.probeAWSCloudHSM();
                        break;
                    case 'Luna_HSM':
                        result = await this.probeLunaHSM();
                        break;
                    case 'nShield':
                        result = await this.probenShield();
                        break;
                    case 'Azure_HSM':
                        result = await this.probeAzureHSM();
                        break;
                }
                if (result.available && result.fipsMode) {
                    break; // Found working FIPS-enabled HSM
                }
            }
            this.probeCache = result;
            otel_tracing_js_1.otelService.addSpanAttributes({
                'hsm.available': result.available,
                'hsm.fips_mode': result.fipsMode,
                'hsm.provider': result.provider,
                'hsm.mechanism_count': result.mechanisms.length,
            });
            if (!result.available || !result.fipsMode) {
                console.error('HSM probe failed:', result.error || 'HSM unavailable or not FIPS-enabled');
                if (!this.config.fallbackToSoftware) {
                    console.error('CRITICAL: HSM required but unavailable - system will halt crypto operations');
                }
            }
            return result;
        }
        catch (error) {
            console.error('HSM probe exception:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span?.setStatus({ code: 2, message: error.message });
            this.probeCache = {
                available: false,
                fipsMode: false,
                provider: 'error',
                lastProbed: new Date(),
                mechanisms: [],
                error: error.message,
            };
            return this.probeCache;
        }
        finally {
            span?.end();
        }
    }
    async probeAWSCloudHSM() {
        try {
            // AWS CloudHSM PKCS#11 probe
            const libPath = process.env.CLOUDHSM_PKCS11_LIB ||
                '/opt/cloudhsm/lib/libcloudhsm_pkcs11.so';
            const pkcs11 = await Promise.resolve().then(() => __importStar(require('pkcs11js'))).catch(() => null);
            if (!pkcs11) {
                throw new Error('PKCS#11 library not available');
            }
            const p11 = new pkcs11.PKCS11();
            p11.load(libPath);
            p11.C_Initialize();
            const slots = p11.C_GetSlotList(true);
            if (slots.length === 0) {
                throw new Error('No HSM slots available');
            }
            const slot = slots[0];
            const tokenInfo = p11.C_GetTokenInfo(slot);
            const sessionHandle = p11.C_OpenSession(slot, pkcs11.CKF_SERIAL_SESSION | pkcs11.CKF_RW_SESSION);
            // Get available mechanisms
            const mechanisms = p11.C_GetMechanismList(slot);
            const mechanismNames = mechanisms.map((mech) => {
                return `0x${mech.toString(16).padStart(8, '0')}`;
            });
            // Check for FIPS mode indicators
            const fipsMode = tokenInfo.label.includes('FIPS') ||
                (tokenInfo.flags & 0x00000002) !== 0; // CKF_FIPS_MODE
            p11.C_CloseSession(sessionHandle);
            p11.C_Finalize();
            return {
                available: true,
                fipsMode,
                provider: 'AWS_CloudHSM',
                lastProbed: new Date(),
                mechanisms: mechanismNames,
            };
        }
        catch (error) {
            return {
                available: false,
                fipsMode: false,
                provider: 'AWS_CloudHSM',
                lastProbed: new Date(),
                mechanisms: [],
                error: error.message,
            };
        }
    }
    async probeLunaHSM() {
        try {
            // SafeNet Luna HSM probe
            const libPath = process.env.LUNA_PKCS11_LIB || '/usr/lib/libCryptoki2_64.so';
            const pkcs11 = await Promise.resolve().then(() => __importStar(require('pkcs11js'))).catch(() => null);
            if (!pkcs11) {
                throw new Error('PKCS#11 library not available');
            }
            const p11 = new pkcs11.PKCS11();
            p11.load(libPath);
            p11.C_Initialize();
            const slots = p11.C_GetSlotList(true);
            if (slots.length === 0) {
                throw new Error('No Luna HSM slots available');
            }
            const slot = slots[0];
            const tokenInfo = p11.C_GetTokenInfo(slot);
            // Luna FIPS mode check
            const fipsMode = tokenInfo.label.includes('FIPS') || tokenInfo.model.includes('FIPS');
            const mechanisms = p11.C_GetMechanismList(slot);
            const mechanismNames = mechanisms.map((mech) => `Luna_0x${mech.toString(16)}`);
            p11.C_Finalize();
            return {
                available: true,
                fipsMode,
                provider: 'Luna_HSM',
                lastProbed: new Date(),
                mechanisms: mechanismNames,
            };
        }
        catch (error) {
            return {
                available: false,
                fipsMode: false,
                provider: 'Luna_HSM',
                lastProbed: new Date(),
                mechanisms: [],
                error: error.message,
            };
        }
    }
    async probenShield() {
        try {
            // Thales nShield probe
            const libPath = process.env.NSHIELD_PKCS11_LIB ||
                '/opt/nfast/toolkits/pkcs11/libcknfast.so';
            const pkcs11 = await Promise.resolve().then(() => __importStar(require('pkcs11js'))).catch(() => null);
            if (!pkcs11) {
                throw new Error('PKCS#11 library not available');
            }
            const p11 = new pkcs11.PKCS11();
            try {
                p11.load(libPath);
                p11.C_Initialize();
            }
            catch (e) {
                return {
                    available: false,
                    fipsMode: false,
                    provider: 'nShield',
                    lastProbed: new Date(),
                    mechanisms: [],
                    error: `Failed to load nShield library: ${e.message}`,
                };
            }
            const slots = p11.C_GetSlotList(true);
            if (slots.length === 0) {
                throw new Error('No nShield slots available');
            }
            const slot = slots[0];
            const tokenInfo = p11.C_GetTokenInfo(slot);
            // nShield FIPS validation
            const fipsMode = tokenInfo.label.includes('FIPS') ||
                tokenInfo.model.includes('FIPS') ||
                (tokenInfo.flags & 0x00000002) !== 0;
            const mechanisms = p11.C_GetMechanismList(slot);
            const mechanismNames = mechanisms.map((mech) => `nShield_0x${mech.toString(16)}`);
            p11.C_Finalize();
            return {
                available: true,
                fipsMode,
                provider: 'nShield',
                lastProbed: new Date(),
                mechanisms: mechanismNames,
            };
        }
        catch (error) {
            return {
                available: false,
                fipsMode: false,
                provider: 'nShield',
                lastProbed: new Date(),
                mechanisms: [],
                error: error.message,
            };
        }
    }
    async probeAzureHSM() {
        try {
            // Azure Dedicated HSM probe
            const libPath = process.env.AZURE_HSM_PKCS11_LIB ||
                '/opt/azhsm/lib/libazhsm_pkcs11.so';
            const pkcs11 = await Promise.resolve().then(() => __importStar(require('pkcs11js'))).catch(() => null);
            if (!pkcs11) {
                throw new Error('PKCS#11 library not available');
            }
            const p11 = new pkcs11.PKCS11();
            try {
                p11.load(libPath);
                p11.C_Initialize();
            }
            catch (e) {
                return {
                    available: false,
                    fipsMode: false,
                    provider: 'Azure_HSM',
                    lastProbed: new Date(),
                    mechanisms: [],
                    error: `Failed to load Azure HSM library: ${e.message}`,
                };
            }
            const slots = p11.C_GetSlotList(true);
            if (slots.length === 0) {
                throw new Error('No Azure HSM slots available');
            }
            const slot = slots[0];
            const tokenInfo = p11.C_GetTokenInfo(slot);
            // Azure Dedicated HSM FIPS mode
            const fipsMode = tokenInfo.label.includes('FIPS') ||
                tokenInfo.model.includes('FIPS');
            const mechanisms = p11.C_GetMechanismList(slot);
            const mechanismNames = mechanisms.map((mech) => `Azure_0x${mech.toString(16)}`);
            p11.C_Finalize();
            return {
                available: true,
                fipsMode,
                provider: 'Azure_HSM',
                lastProbed: new Date(),
                mechanisms: mechanismNames,
            };
        }
        catch (error) {
            return {
                available: false,
                fipsMode: false,
                provider: 'Azure_HSM',
                lastProbed: new Date(),
                mechanisms: [],
                error: error.message,
            };
        }
    }
    /**
     * Express middleware to enforce HSM-only crypto operations
     */
    middleware() {
        return (req, res, next) => {
            const span = otel_tracing_js_1.otelService.createSpan('hsm.enforcement');
            try {
                // Check if HSM is available and FIPS-enabled
                if (!this.probeCache) {
                    span?.setStatus({ code: 2, message: 'HSM not probed yet' });
                    return res.status(503).json({
                        error: 'hsm_not_ready',
                        message: 'HSM availability not yet determined',
                    });
                }
                if (!this.probeCache.available) {
                    span?.setStatus({ code: 2, message: 'HSM unavailable' });
                    return res.status(503).json({
                        error: 'hsm_unavailable',
                        message: 'Hardware Security Module is not available',
                        lastProbed: this.probeCache.lastProbed,
                        provider: this.probeCache.provider,
                        details: this.probeCache.error,
                    });
                }
                if (!this.probeCache.fipsMode) {
                    span?.setStatus({ code: 2, message: 'HSM not FIPS-enabled' });
                    return res.status(503).json({
                        error: 'fips_required',
                        message: 'HSM is not operating in FIPS mode',
                        provider: this.probeCache.provider,
                    });
                }
                // HSM is available and FIPS-enabled
                otel_tracing_js_1.otelService.addSpanAttributes({
                    'hsm.enforcement.passed': true,
                    'hsm.provider': this.probeCache.provider,
                    'hsm.mechanisms': this.probeCache.mechanisms.length,
                });
                next();
            }
            catch (error) {
                console.error('HSM enforcement middleware error:', error);
                otel_tracing_js_1.otelService.recordException(error);
                span?.setStatus({ code: 2, message: error.message });
                return res.status(500).json({
                    error: 'hsm_enforcement_error',
                    message: 'HSM enforcement check failed',
                });
            }
            finally {
                span?.end();
            }
        };
    }
    /**
     * Get current HSM status for health checks
     */
    getStatus() {
        return this.probeCache;
    }
    /**
     * Force immediate HSM probe (for testing/debugging)
     */
    async forceProbe() {
        return await this.performHSMProbe();
    }
    /**
     * Generate HSM attestation for ATO evidence
     */
    generateAttestation() {
        const attestation = {
            timestamp: new Date().toISOString(),
            fipsCompliant: this.probeCache?.fipsMode || false,
            hsmProvider: this.probeCache?.provider || 'unknown',
            mechanisms: this.probeCache?.mechanisms || [],
            nodeFipsEnabled: crypto.getFips?.() || false,
            opensslFipsCapable: !!process.config?.variables?.openssl_fips,
        };
        // In production, sign this attestation with HSM
        // attestationSignature would be HSM-signed hash of the above data
        return attestation;
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.probeTimer) {
            clearInterval(this.probeTimer);
            this.probeTimer = null;
        }
        this.probeCache = null;
    }
}
// Export factory function for dependency injection
function createHSMEnforcement(config) {
    return new HSMEnforcement(config);
}
// Default instance for immediate use
exports.hsmEnforcement = new HSMEnforcement({
    enabledProviders: process.env.HSM_PROVIDERS?.split(',') || [
        'AWS_CloudHSM',
    ],
    fallbackToSoftware: process.env.ALLOW_SOFTWARE_CRYPTO === 'true', // Should be false for Federal
    probeInterval: Number(process.env.HSM_PROBE_INTERVAL) || 60,
    requirePKCS11: true,
});
// Express middleware export
exports.assertFipsAndHsm = exports.hsmEnforcement.middleware.bind(exports.hsmEnforcement);
