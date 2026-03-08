"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSupplyChainVerification = exports.supplyChainVerifier = exports.SupplyChainVerifier = exports.SLSASchema = exports.SBOMSchema = void 0;
const react_1 = __importDefault(require("react"));
const zod_1 = require("zod");
// SBOM (Software Bill of Materials) Schema
exports.SBOMSchema = zod_1.z.object({
    bomFormat: zod_1.z.string(),
    specVersion: zod_1.z.string(),
    version: zod_1.z.number(),
    metadata: zod_1.z.object({
        timestamp: zod_1.z.string(),
        tools: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            version: zod_1.z.string(),
        })),
        authors: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string(),
            email: zod_1.z.string().optional(),
        }))
            .optional(),
    }),
    components: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['application', 'library', 'framework', 'container']),
        'bom-ref': zod_1.z.string(),
        name: zod_1.z.string(),
        version: zod_1.z.string(),
        purl: zod_1.z.string().optional(),
        hashes: zod_1.z
            .array(zod_1.z.object({
            alg: zod_1.z.string(),
            content: zod_1.z.string(),
        }))
            .optional(),
        licenses: zod_1.z
            .array(zod_1.z.object({
            license: zod_1.z.object({
                id: zod_1.z.string().optional(),
                name: zod_1.z.string().optional(),
            }),
        }))
            .optional(),
        supplier: zod_1.z
            .object({
            name: zod_1.z.string(),
            url: zod_1.z.string().optional(),
        })
            .optional(),
    })),
});
// SLSA (Supply-chain Levels for Software Artifacts) Schema
exports.SLSASchema = zod_1.z.object({
    _type: zod_1.z.literal('https://in-toto.io/Statement/v0.1'),
    subject: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        digest: zod_1.z.record(zod_1.z.string()),
    })),
    predicateType: zod_1.z.literal('https://slsa.dev/provenance/v0.2'),
    predicate: zod_1.z.object({
        builder: zod_1.z.object({
            id: zod_1.z.string(),
        }),
        buildType: zod_1.z.string(),
        invocation: zod_1.z.object({
            configSource: zod_1.z.object({
                uri: zod_1.z.string(),
                digest: zod_1.z.record(zod_1.z.string()),
                entryPoint: zod_1.z.string().optional(),
            }),
            parameters: zod_1.z.record(zod_1.z.unknown()).optional(),
            environment: zod_1.z.record(zod_1.z.unknown()).optional(),
        }),
        metadata: zod_1.z.object({
            buildInvocationId: zod_1.z.string(),
            buildStartedOn: zod_1.z.string(),
            buildFinishedOn: zod_1.z.string(),
            completeness: zod_1.z.object({
                parameters: zod_1.z.boolean(),
                environment: zod_1.z.boolean(),
                materials: zod_1.z.boolean(),
            }),
            reproducible: zod_1.z.boolean(),
        }),
        materials: zod_1.z.array(zod_1.z.object({
            uri: zod_1.z.string(),
            digest: zod_1.z.record(zod_1.z.string()),
        })),
    }),
});
class SupplyChainVerifier {
    cosignPublicKey;
    rekorUrl;
    fulcioUrl;
    constructor(config = {}) {
        this.cosignPublicKey =
            config.cosignPublicKey || process.env.COSIGN_PUBLIC_KEY || '';
        this.rekorUrl = config.rekorUrl || 'https://rekor.sigstore.dev';
        this.fulcioUrl = config.fulcioUrl || 'https://fulcio.sigstore.dev';
    }
    async verifyArtifact(artifactReference, options = {}) {
        const result = {
            artifact: artifactReference,
            verified: false,
            timestamp: new Date().toISOString(),
            errors: [],
            warnings: [],
        };
        try {
            // Verify Cosign signatures
            result.cosignVerification =
                await this.verifyCosignSignature(artifactReference);
            // Verify SBOM if present
            result.sbomVerification = await this.verifySBOM(artifactReference);
            // Verify SLSA attestation if present
            result.slsaVerification = await this.verifySLSA(artifactReference);
            // Apply verification rules
            result.verified = this.evaluateVerificationRules(result, options);
        }
        catch (error) {
            result.errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.verified = false;
        }
        return result;
    }
    async verifyCosignSignature(artifactReference) {
        try {
            // In a real implementation, this would call cosign CLI or use cosign libraries
            // For now, we'll simulate the verification process
            // Fetch signature from registry
            const signatureResponse = await fetch(`/api/maestro/v1/supply-chain/cosign/signature/${encodeURIComponent(artifactReference)}`);
            if (!signatureResponse.ok) {
                throw new Error('No cosign signature found');
            }
            const signature = await signatureResponse.json();
            // Verify signature with public key or certificate
            const signatureValid = await this.validateSignature(artifactReference, signature);
            // Verify certificate chain if using keyless signing
            const certificateValid = signature.cert
                ? await this.validateCertificate(signature.cert)
                : true;
            // Verify Rekor transparency log entry
            const rekorEntryValid = signature.bundle
                ? await this.validateRekorEntry(signature.bundle)
                : true;
            return {
                signatureValid,
                certificateValid,
                rekorEntryValid,
                fulcioIssuer: this.extractFulcioIssuer(signature),
                subject: this.extractSubject(signature),
                extensions: this.extractExtensions(signature),
            };
        }
        catch (error) {
            throw new Error(`Cosign verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async verifySBOM(artifactReference) {
        try {
            const sbomResponse = await fetch(`/api/maestro/v1/supply-chain/sbom/${encodeURIComponent(artifactReference)}`);
            if (!sbomResponse.ok) {
                return {
                    present: false,
                    valid: false,
                    componentsCount: 0,
                };
            }
            const sbomData = await sbomResponse.json();
            // Validate SBOM structure
            const validationResult = exports.SBOMSchema.safeParse(sbomData);
            if (!validationResult.success) {
                return {
                    present: true,
                    valid: false,
                    componentsCount: 0,
                    vulnerabilities: [],
                };
            }
            // Scan for vulnerabilities
            const vulnerabilities = await this.scanVulnerabilities(validationResult.data.components);
            return {
                present: true,
                valid: true,
                componentsCount: validationResult.data.components.length,
                vulnerabilities,
            };
        }
        catch (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _error) {
            return {
                present: false,
                valid: false,
                componentsCount: 0,
            };
        }
    }
    async verifySLSA(artifactReference) {
        try {
            const slsaResponse = await fetch(`/api/maestro/v1/supply-chain/slsa/${encodeURIComponent(artifactReference)}`);
            if (!slsaResponse.ok) {
                return {
                    present: false,
                    valid: false,
                    level: 0,
                    buildPlatform: '',
                };
            }
            const slsaAttestation = await slsaResponse.json();
            // Validate SLSA structure
            const validationResult = exports.SLSASchema.safeParse(slsaAttestation);
            if (!validationResult.success) {
                return {
                    present: true,
                    valid: false,
                    level: 0,
                    buildPlatform: '',
                };
            }
            const predicate = validationResult.data.predicate;
            // Determine SLSA level based on attestation completeness
            const level = this.determineSLSALevel(predicate);
            return {
                present: true,
                valid: true,
                level,
                buildPlatform: predicate.builder.id,
                sourceRepository: predicate.invocation.configSource.uri,
                buildInvocationId: predicate.metadata.buildInvocationId,
            };
        }
        catch (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _error) {
            return {
                present: false,
                valid: false,
                level: 0,
                buildPlatform: '',
            };
        }
    }
    async validateSignature(_artifact, signature) {
        // In production, this would use cryptographic libraries to verify the signature
        // For now, simulate verification
        return signature.sig.length > 0;
    }
    async validateCertificate(_cert) {
        try {
            // Validate certificate chain against Fulcio root
            const certResponse = await fetch(`${this.fulcioUrl}/api/v1/rootCert`);
            if (certResponse.ok) {
                // In production, perform actual certificate validation
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    async validateRekorEntry(bundle) {
        try {
            // Verify transparency log entry exists and is valid
            for (const entry of bundle.verificationMaterial.tlogEntries) {
                const rekorResponse = await fetch(`${this.rekorUrl}/api/v1/log/entries/${entry.logIndex}`);
                if (!rekorResponse.ok) {
                    return false;
                }
            }
            return true;
        }
        catch {
            return false;
        }
    }
    extractFulcioIssuer(signature) {
        // Extract issuer from certificate extensions
        return signature.bundle?.verificationMaterial?.x509CertificateChain
            ?.certificates?.[0]
            ? 'https://accounts.google.com'
            : undefined;
    }
    extractSubject(signature) {
        // Extract subject from certificate
        return signature.bundle ? 'user@example.com' : undefined;
    }
    extractExtensions(_signature) {
        // Extract certificate extensions
        return {
            'github.com/workflow': 'release.yml',
            'github.com/repository': 'BrianCLong/summit',
        };
    }
    async scanVulnerabilities(components) {
        // In production, integrate with vulnerability databases like OSV, NVD
        const vulnerabilities = [];
        for (const component of components) {
            try {
                const vulnResponse = await fetch(`/api/maestro/v1/supply-chain/vulnerabilities/scan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: component.name,
                        version: component.version,
                        purl: component.purl,
                    }),
                });
                if (vulnResponse.ok) {
                    const vulns = await vulnResponse.json();
                    vulnerabilities.push(...vulns);
                }
            }
            catch (
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _error) {
                // Continue scanning other components
                continue;
            }
        }
        return vulnerabilities;
    }
    determineSLSALevel(predicate) {
        let level = 0;
        // SLSA Level 1: Source integrity
        if (predicate.invocation.configSource.digest) {
            level = 1;
        }
        // SLSA Level 2: Build service
        if (predicate.builder.id && predicate.metadata.completeness.parameters) {
            level = 2;
        }
        // SLSA Level 3: Source protected, no manual access to build service
        if (predicate.metadata.reproducible &&
            predicate.metadata.completeness.environment) {
            level = 3;
        }
        // SLSA Level 4: Two-person reviewed, hermetic, reproducible
        if (level === 3 && predicate.materials.length > 0) {
            level = 4;
        }
        return level;
    }
    evaluateVerificationRules(result, options) {
        const errors = [];
        // Check Cosign signature
        if (!result.cosignVerification?.signatureValid) {
            errors.push('Cosign signature verification failed');
        }
        if (!result.cosignVerification?.certificateValid) {
            errors.push('Certificate validation failed');
        }
        if (!result.cosignVerification?.rekorEntryValid) {
            errors.push('Rekor transparency log verification failed');
        }
        // Check SBOM requirements
        if (options.requireSBOM && !result.sbomVerification?.present) {
            errors.push('SBOM is required but not present');
        }
        if (result.sbomVerification?.present && !result.sbomVerification.valid) {
            errors.push('SBOM is present but invalid');
        }
        // Check for critical vulnerabilities
        const criticalVulns = result.sbomVerification?.vulnerabilities?.filter((v) => v.severity === 'critical');
        if (criticalVulns && criticalVulns.length > 0) {
            errors.push(`${criticalVulns.length} critical vulnerabilities found`);
        }
        // Check SLSA requirements
        if (options.requireSLSA && !result.slsaVerification?.present) {
            errors.push('SLSA attestation is required but not present');
        }
        if (result.slsaVerification?.present && !result.slsaVerification.valid) {
            errors.push('SLSA attestation is present but invalid');
        }
        if (options.minSLSALevel &&
            (result.slsaVerification?.level || 0) < options.minSLSALevel) {
            errors.push(`SLSA level ${result.slsaVerification?.level} is below required level ${options.minSLSALevel}`);
        }
        // Check issuer allowlist
        if (options.allowedIssuers && result.cosignVerification?.fulcioIssuer) {
            if (!options.allowedIssuers.includes(result.cosignVerification.fulcioIssuer)) {
                errors.push(`Issuer ${result.cosignVerification.fulcioIssuer} is not in allowlist`);
            }
        }
        result.errors.push(...errors);
        return errors.length === 0;
    }
    async batchVerifyArtifacts(artifacts, options) {
        const results = await Promise.all(artifacts.map((artifact) => this.verifyArtifact(artifact, options)));
        return results;
    }
    async generateVerificationReport(results) {
        const total = results.length;
        // ⚡ Bolt Optimization: Use a single reduce pass instead of 5 separate filter/map/reduce passes over the results array
        const summaryData = results.reduce((acc, r) => {
            if (r.verified)
                acc.verified++;
            if (r.sbomVerification?.present)
                acc.withSBOM++;
            if (r.slsaVerification?.present)
                acc.withSLSA++;
            const level = r.slsaVerification?.level || 0;
            if (level > 0) {
                acc.slsaLevelSum += level;
                acc.slsaLevelCount++;
            }
            if (r.sbomVerification?.vulnerabilities) {
                for (const v of r.sbomVerification.vulnerabilities) {
                    if (v.severity === 'critical') {
                        acc.criticalVulnerabilities++;
                    }
                }
            }
            return acc;
        }, { verified: 0, withSBOM: 0, withSLSA: 0, slsaLevelSum: 0, slsaLevelCount: 0, criticalVulnerabilities: 0 });
        const failed = total - summaryData.verified;
        const avgSLSALevel = summaryData.slsaLevelCount > 0
            ? summaryData.slsaLevelSum / summaryData.slsaLevelCount
            : 0;
        return {
            summary: {
                total,
                verified: summaryData.verified,
                failed,
                withSBOM: summaryData.withSBOM,
                withSLSA: summaryData.withSLSA,
                avgSLSALevel: Math.round(avgSLSALevel * 100) / 100,
                criticalVulnerabilities: summaryData.criticalVulnerabilities,
            },
            details: results,
        };
    }
}
exports.SupplyChainVerifier = SupplyChainVerifier;
exports.supplyChainVerifier = new SupplyChainVerifier();
// Hook for using supply chain verification in React components
const useSupplyChainVerification = () => {
    const [isVerifying, setIsVerifying] = react_1.default.useState(false);
    const [results, setResults] = react_1.default.useState([]);
    const verifyArtifact = react_1.default.useCallback(async (artifact, options) => {
        setIsVerifying(true);
        try {
            const result = await exports.supplyChainVerifier.verifyArtifact(artifact, options);
            setResults((prev) => [...prev, result]);
            return result;
        }
        finally {
            setIsVerifying(false);
        }
    }, []);
    const batchVerify = react_1.default.useCallback(async (artifacts, options) => {
        setIsVerifying(true);
        try {
            const batchResults = await exports.supplyChainVerifier.batchVerifyArtifacts(artifacts, options);
            setResults(batchResults);
            return batchResults;
        }
        finally {
            setIsVerifying(false);
        }
    }, []);
    const clearResults = react_1.default.useCallback(() => {
        setResults([]);
    }, []);
    return {
        isVerifying,
        results,
        verifyArtifact,
        batchVerify,
        clearResults,
        generateReport: react_1.default.useCallback(() => exports.supplyChainVerifier.generateVerificationReport(results), [results]),
    };
};
exports.useSupplyChainVerification = useSupplyChainVerification;
