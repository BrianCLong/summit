"use strict";
/**
 * SBOM (Software Bill of Materials) Plugin
 * Generates and manages SPDX/CycloneDX SBOMs with Syft integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SBOMPlugin = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
class SBOMPlugin {
    name = 'sbom';
    syftPath;
    constructor() {
        this.syftPath = this.findSyftExecutable();
    }
    validate(config) {
        const stepConfig = config;
        if (!stepConfig.target) {
            throw new Error('SBOM step requires target configuration');
        }
        // Validate format
        const supportedFormats = [
            'spdx-json',
            'spdx-tag',
            'cyclonedx-json',
            'cyclonedx-xml',
        ];
        if (!supportedFormats.includes(stepConfig.format)) {
            throw new Error(`Unsupported SBOM format: ${stepConfig.format}. Supported: ${supportedFormats.join(', ')}`);
        }
        // Check if Syft is available
        if (!this.syftPath) {
            throw new Error('Syft executable not found. Please install Syft (https://github.com/anchore/syft)');
        }
        // Validate target exists
        if (!this.isImageReference(stepConfig.target) &&
            !(0, fs_1.existsSync)(stepConfig.target)) {
            throw new Error(`Target not found: ${stepConfig.target}`);
        }
    }
    async execute(context, step, execution) {
        const stepConfig = step.config;
        try {
            const startTime = Date.now();
            // Generate SBOM using Syft
            const sbomData = await this.generateSBOM(stepConfig);
            // Parse and validate SBOM
            const parsedSBOM = this.parseSBOM(sbomData, stepConfig.format);
            // Store SBOM artifact
            let artifactPath;
            if (stepConfig.upload_to_artifact_store) {
                artifactPath = await this.storeArtifact(context, execution, sbomData, stepConfig.format);
            }
            // Save to local file if specified
            if (stepConfig.output) {
                (0, fs_1.writeFileSync)(stepConfig.output, sbomData);
            }
            // Attach to image if specified
            if (stepConfig.attach_to_image) {
                await this.attachToImage(stepConfig.attach_to_image, sbomData, stepConfig);
            }
            const duration = Date.now() - startTime;
            return {
                output: {
                    sbom: parsedSBOM,
                    packageCount: this.getPackageCount(parsedSBOM),
                    vulnerabilityCount: await this.scanForVulnerabilities(parsedSBOM),
                    format: stepConfig.format,
                    artifactPath,
                    checksum: (0, crypto_1.createHash)('sha256').update(sbomData).digest('hex'),
                },
                cost_usd: this.calculateCost(duration, parsedSBOM),
                metadata: {
                    target: stepConfig.target,
                    format: stepConfig.format,
                    duration_ms: duration,
                    file_size: sbomData.length,
                    syft_version: await this.getSyftVersion(),
                },
            };
        }
        catch (error) {
            throw new Error(`SBOM generation failed: ${error.message}`);
        }
    }
    async compensate(context, step, execution) {
        const stepConfig = step.config;
        try {
            // Clean up local artifacts
            if (stepConfig.output && (0, fs_1.existsSync)(stepConfig.output)) {
                (0, child_process_1.execSync)(`rm -f "${stepConfig.output}"`);
            }
            // If we attached to an image, we could potentially remove the attestation
            // but this is complex and potentially dangerous, so we just log
            if (stepConfig.attach_to_image) {
                console.log(`SBOM compensation: Cannot remove attestation from ${stepConfig.attach_to_image}`);
            }
        }
        catch (error) {
            console.warn(`SBOM compensation warning: ${error.message}`);
        }
    }
    async generateSBOM(config) {
        const args = ['packages', '-o', config.format, config.target];
        // Add optional arguments
        if (config.syft_config) {
            args.push('-c', config.syft_config);
        }
        if (config.catalogers && config.catalogers.length > 0) {
            args.push('--catalogers', config.catalogers.join(','));
        }
        if (config.exclude_paths && config.exclude_paths.length > 0) {
            for (const path of config.exclude_paths) {
                args.push('--exclude', path);
            }
        }
        try {
            const result = (0, child_process_1.execSync)(`"${this.syftPath}" ${args.join(' ')}`, {
                encoding: 'utf8',
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large SBOMs
                timeout: 300000, // 5 minute timeout
            });
            return result;
        }
        catch (error) {
            throw new Error(`Syft execution failed: ${error.message}`);
        }
    }
    parseSBOM(sbomData, format) {
        try {
            if (format.includes('json')) {
                return JSON.parse(sbomData);
            }
            else {
                // For tag-value and XML formats, return raw data with basic parsing
                return {
                    raw: sbomData,
                    format,
                    parsed: false,
                };
            }
        }
        catch (error) {
            throw new Error(`Failed to parse SBOM: ${error.message}`);
        }
    }
    getPackageCount(sbom) {
        if (sbom.parsed === false) {
            // For non-JSON formats, count packages via regex
            const packageMatches = sbom.raw.match(/PackageName:/g);
            return packageMatches ? packageMatches.length : 0;
        }
        // SPDX JSON format
        if (sbom.packages) {
            return sbom.packages.length;
        }
        // CycloneDX format
        if (sbom.components) {
            return sbom.components.length;
        }
        return 0;
    }
    async scanForVulnerabilities(sbom) {
        // Basic vulnerability scanning using known vulnerability patterns
        // In production, this would integrate with Grype, Trivy, or similar
        if (sbom.parsed === false) {
            return 0; // Cannot scan non-parsed SBOMs
        }
        let vulnerabilityCount = 0;
        const packages = sbom.packages || sbom.components || [];
        for (const pkg of packages) {
            // Check for known vulnerable patterns (simplified)
            if (this.isVulnerablePackage(pkg)) {
                vulnerabilityCount++;
            }
        }
        return vulnerabilityCount;
    }
    isVulnerablePackage(pkg) {
        // Simplified vulnerability detection
        // In production, this would use a vulnerability database
        const vulnerablePatterns = [
            {
                name: 'log4j',
                versions: [
                    '2.0',
                    '2.1',
                    '2.2',
                    '2.3',
                    '2.4',
                    '2.5',
                    '2.6',
                    '2.7',
                    '2.8',
                    '2.9',
                    '2.10',
                    '2.11',
                    '2.12',
                    '2.13',
                    '2.14',
                ],
            },
            {
                name: 'jackson',
                versions: ['2.9.0', '2.9.1', '2.9.2', '2.9.3', '2.9.4', '2.9.5'],
            },
            {
                name: 'spring-core',
                versions: ['5.3.0', '5.3.1', '5.3.2', '5.3.3', '5.3.4', '5.3.5'],
            },
        ];
        for (const pattern of vulnerablePatterns) {
            if (pkg.name &&
                pkg.name.toLowerCase().includes(pattern.name) &&
                pkg.version &&
                pattern.versions.includes(pkg.version)) {
                return true;
            }
        }
        return false;
    }
    async storeArtifact(context, execution, sbomData, format) {
        // This would integrate with the artifact store
        const filename = `sbom-${execution.step_id}-${Date.now()}.${this.getFileExtension(format)}`;
        const data = Buffer.from(sbomData);
        // Return a placeholder path - in real implementation, this would use the artifact store
        return `artifacts/${context.run_id}/${execution.step_id}/${filename}`;
    }
    async attachToImage(image, sbomData, config) {
        if (!config.sign_with_cosign) {
            return;
        }
        try {
            // Save SBOM to temporary file
            const tempFile = `/tmp/sbom-${Date.now()}.${this.getFileExtension(config.format)}`;
            (0, fs_1.writeFileSync)(tempFile, sbomData);
            // Attach using cosign
            const attestCmd = `cosign attest --predicate "${tempFile}" --type ${this.getCosignType(config.format)} "${image}"`;
            (0, child_process_1.execSync)(attestCmd, { stdio: 'inherit' });
            // Clean up
            (0, child_process_1.execSync)(`rm -f "${tempFile}"`);
        }
        catch (error) {
            throw new Error(`Failed to attach SBOM to image: ${error.message}`);
        }
    }
    calculateCost(duration, sbom) {
        // Estimate cost based on processing time and SBOM complexity
        const baseCost = 0.001; // $0.001 base cost
        const timeCost = (duration / 1000) * 0.0001; // $0.0001 per second
        const packageCost = this.getPackageCount(sbom) * 0.00001; // $0.00001 per package
        return baseCost + timeCost + packageCost;
    }
    async getSyftVersion() {
        try {
            const version = (0, child_process_1.execSync)(`"${this.syftPath}" version`, {
                encoding: 'utf8',
            });
            return version.split('\n')[0] || 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    findSyftExecutable() {
        const possiblePaths = [
            '/usr/local/bin/syft',
            '/usr/bin/syft',
            'syft', // Try PATH
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
            const whichResult = (0, child_process_1.execSync)('which syft', { encoding: 'utf8' });
            return whichResult.trim();
        }
        catch {
            return '';
        }
    }
    isImageReference(target) {
        // Check if target looks like a container image reference
        return (target.includes(':') &&
            (target.includes('docker.io/') ||
                target.includes('ghcr.io/') ||
                target.includes('gcr.io/') ||
                target.includes('registry') ||
                Boolean(target.match(/^[a-z0-9]+([._-][a-z0-9]+)*\/[a-z0-9]+([._-][a-z0-9]+)*:[a-z0-9._-]+$/i))));
    }
    getFileExtension(format) {
        const extensions = {
            'spdx-json': 'spdx.json',
            'spdx-tag': 'spdx',
            'cyclonedx-json': 'cdx.json',
            'cyclonedx-xml': 'cdx.xml',
        };
        return extensions[format] || 'sbom';
    }
    getCosignType(format) {
        if (format.startsWith('spdx')) {
            return 'spdx';
        }
        else if (format.startsWith('cyclonedx')) {
            return 'cyclonedx';
        }
        return 'spdx'; // Default
    }
}
exports.SBOMPlugin = SBOMPlugin;
