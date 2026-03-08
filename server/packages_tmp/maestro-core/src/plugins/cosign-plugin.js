"use strict";
/**
 * Cosign Plugin
 * Handles container image signing and verification using Sigstore Cosign
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosignPlugin = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
class CosignPlugin {
    name = 'cosign';
    cosignPath;
    constructor() {
        this.cosignPath = this.findCosignExecutable();
    }
    validate(config) {
        const stepConfig = config;
        if (!stepConfig.operation) {
            throw new Error('Cosign step requires operation configuration');
        }
        if (!['sign', 'verify', 'attest', 'verify-attestation'].includes(stepConfig.operation)) {
            throw new Error(`Invalid Cosign operation: ${stepConfig.operation}`);
        }
        if (!stepConfig.image) {
            throw new Error('Cosign step requires image configuration');
        }
        // Check if Cosign is available
        if (!this.cosignPath) {
            throw new Error('Cosign executable not found. Please install Cosign (https://github.com/sigstore/cosign)');
        }
        // Validate operation-specific requirements
        this.validateOperationConfig(stepConfig);
    }
    async execute(context, step, execution) {
        const stepConfig = step.config;
        try {
            const startTime = Date.now();
            let result;
            switch (stepConfig.operation) {
                case 'sign':
                    result = await this.signImage(stepConfig);
                    break;
                case 'verify':
                    result = await this.verifyImage(stepConfig);
                    break;
                case 'attest':
                    result = await this.attestImage(stepConfig);
                    break;
                case 'verify-attestation':
                    result = await this.verifyAttestation(stepConfig);
                    break;
                default:
                    throw new Error(`Unsupported operation: ${stepConfig.operation}`);
            }
            const duration = Date.now() - startTime;
            return {
                output: result,
                cost_usd: this.calculateCost(stepConfig.operation, duration),
                metadata: {
                    operation: stepConfig.operation,
                    image: stepConfig.image,
                    duration_ms: duration,
                    keyless: stepConfig.keyless || false,
                    cosign_version: await this.getCosignVersion(),
                },
            };
        }
        catch (error) {
            throw new Error(`Cosign ${stepConfig.operation} failed: ${error.message}`);
        }
    }
    async compensate(context, step, execution) {
        const stepConfig = step.config;
        // Note: Signatures and attestations in transparency logs cannot be "undone"
        // This is by design for security and auditability
        // We can only clean up local artifacts
        try {
            if (stepConfig.output_signature &&
                (0, fs_1.existsSync)(stepConfig.output_signature)) {
                (0, child_process_1.execSync)(`rm -f "${stepConfig.output_signature}"`);
            }
            if (stepConfig.output_certificate &&
                (0, fs_1.existsSync)(stepConfig.output_certificate)) {
                (0, child_process_1.execSync)(`rm -f "${stepConfig.output_certificate}"`);
            }
            console.log(`Cosign compensation: Local artifacts cleaned for ${stepConfig.operation} on ${stepConfig.image}`);
        }
        catch (error) {
            console.warn(`Cosign compensation warning: ${error.message}`);
        }
    }
    async signImage(config) {
        const args = ['sign'];
        // Add keyless or key-based signing options
        if (config.keyless) {
            args.push('--yes'); // Skip confirmation for keyless signing
            if (config.experimental) {
                process.env.COSIGN_EXPERIMENTAL = '1';
            }
        }
        else if (config.key) {
            args.push('--key', config.key);
        }
        else {
            throw new Error('Either keyless signing or key must be specified');
        }
        // Add optional parameters
        if (config.rekor_url) {
            args.push('--rekor-url', config.rekor_url);
        }
        if (config.fulcio_url) {
            args.push('--fulcio-url', config.fulcio_url);
        }
        if (config.output_signature) {
            args.push('--output-signature', config.output_signature);
        }
        if (config.output_certificate) {
            args.push('--output-certificate', config.output_certificate);
        }
        // Add annotations
        if (config.annotations) {
            for (const [key, value] of Object.entries(config.annotations)) {
                args.push('-a', `${key}=${value}`);
            }
        }
        args.push(config.image);
        try {
            const result = (0, child_process_1.execSync)(`"${this.cosignPath}" ${args.join(' ')}`, {
                encoding: 'utf8',
                stdio: ['inherit', 'pipe', 'pipe'],
            });
            return {
                success: true,
                digest: this.extractDigest(config.image),
                signature: config.output_signature
                    ? (0, fs_1.readFileSync)(config.output_signature, 'utf8')
                    : undefined,
                certificate: config.output_certificate
                    ? (0, fs_1.readFileSync)(config.output_certificate, 'utf8')
                    : undefined,
            };
        }
        catch (error) {
            throw new Error(`Image signing failed: ${error.message}`);
        }
    }
    async verifyImage(config) {
        const args = ['verify'];
        // Add verification method
        if (config.keyless) {
            if (config.certificate_identity) {
                args.push('--certificate-identity', config.certificate_identity);
            }
            if (config.certificate_oidc_issuer) {
                args.push('--certificate-oidc-issuer', config.certificate_oidc_issuer);
            }
            if (config.experimental) {
                process.env.COSIGN_EXPERIMENTAL = '1';
            }
        }
        else if (config.key) {
            args.push('--key', config.key);
        }
        else {
            throw new Error('Either keyless verification parameters or key must be specified');
        }
        // Add optional parameters
        if (config.rekor_url) {
            args.push('--rekor-url', config.rekor_url);
        }
        if (config.policy) {
            args.push('--policy', config.policy);
        }
        args.push(config.image);
        try {
            const result = (0, child_process_1.execSync)(`"${this.cosignPath}" ${args.join(' ')}`, {
                encoding: 'utf8',
            });
            // Parse verification result
            const verification = this.parseVerificationResult(result);
            return {
                success: true,
                digest: this.extractDigest(config.image),
                verification_result: verification,
            };
        }
        catch (error) {
            return {
                success: false,
                digest: this.extractDigest(config.image),
                verification_result: {
                    verified: false,
                    signatures: [],
                },
            };
        }
    }
    async attestImage(config) {
        if (!config.predicate) {
            throw new Error('Predicate file required for attestation');
        }
        const args = ['attest'];
        // Add keyless or key-based signing options
        if (config.keyless) {
            args.push('--yes');
            if (config.experimental) {
                process.env.COSIGN_EXPERIMENTAL = '1';
            }
        }
        else if (config.key) {
            args.push('--key', config.key);
        }
        else {
            throw new Error('Either keyless signing or key must be specified for attestation');
        }
        // Add predicate
        args.push('--predicate', config.predicate);
        // Add predicate type
        if (config.predicate_type) {
            args.push('--type', config.predicate_type);
        }
        // Add optional parameters
        if (config.rekor_url) {
            args.push('--rekor-url', config.rekor_url);
        }
        if (config.fulcio_url) {
            args.push('--fulcio-url', config.fulcio_url);
        }
        args.push(config.image);
        try {
            const result = (0, child_process_1.execSync)(`"${this.cosignPath}" ${args.join(' ')}`, {
                encoding: 'utf8',
                stdio: ['inherit', 'pipe', 'pipe'],
            });
            return {
                success: true,
                digest: this.extractDigest(config.image),
                bundle: result,
            };
        }
        catch (error) {
            throw new Error(`Image attestation failed: ${error.message}`);
        }
    }
    async verifyAttestation(config) {
        const args = ['verify-attestation'];
        // Add verification method
        if (config.keyless) {
            if (config.certificate_identity) {
                args.push('--certificate-identity', config.certificate_identity);
            }
            if (config.certificate_oidc_issuer) {
                args.push('--certificate-oidc-issuer', config.certificate_oidc_issuer);
            }
            if (config.experimental) {
                process.env.COSIGN_EXPERIMENTAL = '1';
            }
        }
        else if (config.key) {
            args.push('--key', config.key);
        }
        else {
            throw new Error('Either keyless verification parameters or key must be specified');
        }
        // Add predicate type if specified
        if (config.predicate_type) {
            args.push('--type', config.predicate_type);
        }
        // Add policy if specified
        if (config.policy) {
            args.push('--policy', config.policy);
        }
        args.push(config.image);
        try {
            const result = (0, child_process_1.execSync)(`"${this.cosignPath}" ${args.join(' ')}`, {
                encoding: 'utf8',
            });
            return {
                success: true,
                digest: this.extractDigest(config.image),
                verification_result: {
                    verified: true,
                    signatures: [],
                },
            };
        }
        catch (error) {
            return {
                success: false,
                digest: this.extractDigest(config.image),
                verification_result: {
                    verified: false,
                    signatures: [],
                },
            };
        }
    }
    validateOperationConfig(config) {
        switch (config.operation) {
            case 'sign':
            case 'attest':
                if (!config.keyless && !config.key) {
                    throw new Error(`${config.operation} requires either keyless=true or key parameter`);
                }
                if (config.operation === 'attest' && !config.predicate) {
                    throw new Error('attest operation requires predicate parameter');
                }
                break;
            case 'verify':
            case 'verify-attestation':
                if (!config.keyless && !config.key) {
                    throw new Error(`${config.operation} requires either keyless verification parameters or key parameter`);
                }
                if (config.keyless &&
                    !config.certificate_identity &&
                    !config.certificate_oidc_issuer) {
                    console.warn('Keyless verification without certificate constraints may accept any valid certificate');
                }
                break;
        }
    }
    extractDigest(image) {
        try {
            // Try to get the actual digest from the registry
            const result = (0, child_process_1.execSync)(`docker inspect --format='{{index .RepoDigests 0}}' "${image}"`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            });
            const digestMatch = result.match(/sha256:[a-f0-9]{64}/);
            return digestMatch
                ? digestMatch[0]
                : (0, crypto_1.createHash)('sha256').update(image).digest('hex');
        }
        catch {
            // Fallback to hash of image name
            return (0, crypto_1.createHash)('sha256').update(image).digest('hex');
        }
    }
    parseVerificationResult(output) {
        // Parse cosign verify output to extract verification details
        // This is a simplified parser - real implementation would be more robust
        const lines = output.split('\n');
        const result = {
            verified: true,
            signatures: [],
        };
        for (const line of lines) {
            if (line.includes('Certificate subject:')) {
                result.certificate_identity = line.split(':')[1]?.trim();
            }
            else if (line.includes('Certificate issuer:')) {
                result.certificate_issuer = line.split(':')[1]?.trim();
            }
            else if (line.includes('keyid:')) {
                const keyidMatch = line.match(/keyid:\s*([a-f0-9]+)/);
                if (keyidMatch) {
                    result.signatures.push({
                        keyid: keyidMatch[1],
                        signature: 'verified',
                    });
                }
            }
        }
        return result;
    }
    calculateCost(operation, duration) {
        // Estimate cost based on operation complexity and time
        const baseCosts = {
            sign: 0.001,
            verify: 0.0005,
            attest: 0.0015,
            'verify-attestation': 0.001,
        };
        const baseCost = baseCosts[operation] || 0.001;
        const timeCost = (duration / 1000) * 0.0001; // $0.0001 per second
        return baseCost + timeCost;
    }
    async getCosignVersion() {
        try {
            const version = (0, child_process_1.execSync)(`"${this.cosignPath}" version`, {
                encoding: 'utf8',
            });
            const versionMatch = version.match(/v\d+\.\d+\.\d+/);
            return versionMatch ? versionMatch[0] : 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    findCosignExecutable() {
        const possiblePaths = [
            '/usr/local/bin/cosign',
            '/usr/bin/cosign',
            'cosign', // Try PATH
        ];
        for (const path of possiblePaths) {
            try {
                (0, child_process_1.execSync)(`"${path}" version`, { stdio: 'ignore' });
                return path;
            }
            catch {
                continue;
            }
        }
        // Try to find via which
        try {
            const whichResult = (0, child_process_1.execSync)('which cosign', { encoding: 'utf8' });
            return whichResult.trim();
        }
        catch {
            return '';
        }
    }
}
exports.CosignPlugin = CosignPlugin;
