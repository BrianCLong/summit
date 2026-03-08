"use strict";
/**
 * Citation Validator
 *
 * Validates citations and blocks publishing if required citations are missing.
 * Ensures all data sources are properly attributed and licensed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardLicenses = exports.PublishingPipeline = exports.CitationValidator = void 0;
class CitationValidator {
    registry;
    config;
    constructor(registry, config = {}) {
        this.registry = registry || {
            id: 'default',
            citations: new Map(),
        };
        this.config = {
            requireAllCitations: true,
            requireVerifiedCitations: true,
            allowCopyleft: true,
            ...config,
        };
    }
    /**
     * Register a citation
     */
    registerCitation(citation) {
        this.registry.citations.set(citation.id, citation);
    }
    /**
     * Register multiple citations
     */
    registerCitations(citations) {
        for (const citation of citations) {
            this.registerCitation(citation);
        }
    }
    /**
     * Get citation by ID
     */
    getCitation(id) {
        return this.registry.citations.get(id);
    }
    /**
     * Validate citations for publishing
     */
    validateForPublishing(citations) {
        const blockers = [];
        const warnings = [];
        const missingCitations = [];
        const licenseIssues = [];
        // Check required citations
        const requiredCitations = citations.filter(c => c.required);
        for (const citation of requiredCitations) {
            // Check if citation is verified
            if (!citation.verified && this.config.requireVerifiedCitations) {
                blockers.push(`Required citation "${citation.title}" (${citation.id}) is not verified`);
                missingCitations.push(citation);
            }
            // Validate citation structure
            const structureErrors = this.validateCitationStructure(citation);
            if (structureErrors.length > 0) {
                blockers.push(`Citation "${citation.title}" has errors: ${structureErrors.join(', ')}`);
                missingCitations.push(citation);
            }
            // Validate license
            const licenseErrors = this.validateLicense(citation.license);
            if (licenseErrors.length > 0) {
                licenseIssues.push(`Citation "${citation.title}": ${licenseErrors.join(', ')}`);
                blockers.push(...licenseErrors.map(e => `${citation.title}: ${e}`));
            }
        }
        // Check optional citations for warnings
        const optionalCitations = citations.filter(c => !c.required);
        for (const citation of optionalCitations) {
            if (!citation.verified) {
                warnings.push(`Optional citation "${citation.title}" is not verified`);
            }
            const structureErrors = this.validateCitationStructure(citation);
            if (structureErrors.length > 0) {
                warnings.push(`Optional citation "${citation.title}" has issues: ${structureErrors.join(', ')}`);
            }
        }
        // Check for duplicate citations
        const duplicates = this.findDuplicateCitations(citations);
        if (duplicates.length > 0) {
            warnings.push(`Duplicate citations found: ${duplicates.join(', ')}`);
        }
        // License compatibility check
        const compatibilityIssues = this.checkLicenseCompatibility(citations.map(c => c.license));
        if (compatibilityIssues.length > 0) {
            licenseIssues.push(...compatibilityIssues);
            blockers.push(...compatibilityIssues);
        }
        return {
            canPublish: blockers.length === 0,
            blockers,
            warnings,
            missingCitations,
            licenseIssues,
        };
    }
    /**
     * Validate citation structure
     */
    validateCitationStructure(citation) {
        const errors = [];
        if (!citation.id) {
            errors.push('Missing citation ID');
        }
        if (!citation.title) {
            errors.push('Missing title');
        }
        if (!citation.type) {
            errors.push('Missing type');
        }
        if (!citation.license) {
            errors.push('Missing license information');
        }
        // Type-specific validation
        switch (citation.type) {
            case 'publication':
                if (!citation.doi && !citation.url) {
                    errors.push('Publication missing DOI or URL');
                }
                if (!citation.authors || citation.authors.length === 0) {
                    errors.push('Publication missing authors');
                }
                break;
            case 'data':
                if (!citation.organization && !citation.authors) {
                    errors.push('Data source missing organization or authors');
                }
                break;
            case 'model':
                if (!citation.version) {
                    errors.push('Model missing version');
                }
                break;
            case 'code':
                if (!citation.url) {
                    errors.push('Code missing repository URL');
                }
                break;
        }
        return errors;
    }
    /**
     * Validate license
     */
    validateLicense(license) {
        const errors = [];
        if (!license.spdxId) {
            errors.push('License missing SPDX identifier');
        }
        // Check against whitelist
        if (this.config.allowedLicenses &&
            !this.config.allowedLicenses.includes(license.spdxId)) {
            errors.push(`License ${license.spdxId} is not in allowed list`);
        }
        // Check against blacklist
        if (this.config.prohibitedLicenses &&
            this.config.prohibitedLicenses.includes(license.spdxId)) {
            errors.push(`License ${license.spdxId} is prohibited`);
        }
        // Check commercial use requirement
        if (this.config.requireCommercialUse &&
            !license.allowsCommercialUse) {
            errors.push(`License ${license.spdxId} does not allow commercial use`);
        }
        // Check modification requirement
        if (this.config.requireModification &&
            !license.allowsModification) {
            errors.push(`License ${license.spdxId} does not allow modification`);
        }
        // Check copyleft
        if (!this.config.allowCopyleft && license.copyleft) {
            errors.push(`License ${license.spdxId} is copyleft (not allowed)`);
        }
        return errors;
    }
    /**
     * Find duplicate citations
     */
    findDuplicateCitations(citations) {
        const seen = new Map();
        const duplicates = [];
        for (const citation of citations) {
            const key = citation.doi || citation.url || citation.title;
            if (seen.has(key)) {
                duplicates.push(`${citation.title} (duplicate of ${seen.get(key).title})`);
            }
            else {
                seen.set(key, citation);
            }
        }
        return duplicates;
    }
    /**
     * Check license compatibility
     */
    checkLicenseCompatibility(licenses) {
        const issues = [];
        // Define incompatible license pairs
        const incompatibilities = {
            'GPL-3.0': ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
            'AGPL-3.0': ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'GPL-3.0'],
            'PROPRIETARY': ['GPL-3.0', 'AGPL-3.0'],
        };
        const licenseIds = licenses.map(l => l.spdxId);
        for (const [license, incompatible] of Object.entries(incompatibilities)) {
            if (licenseIds.includes(license)) {
                const conflicts = incompatible.filter(inc => licenseIds.includes(inc));
                if (conflicts.length > 0) {
                    issues.push(`License ${license} is incompatible with: ${conflicts.join(', ')}`);
                }
            }
        }
        return issues;
    }
    /**
     * Auto-generate citation from source metadata
     */
    static generateCitation(source) {
        return {
            id: source.id,
            type: source.type,
            required: source.required ?? true,
            title: source.title,
            authors: source.authors,
            organization: source.organization,
            url: source.url,
            license: source.license,
            verified: false, // Must be manually verified
        };
    }
    /**
     * Verify citation
     */
    async verifyCitation(citationId, verificationMethod = 'manual') {
        const citation = this.registry.citations.get(citationId);
        if (!citation) {
            return false;
        }
        // In production, this would do actual verification:
        // - Check DOI against registry
        // - Verify URL is accessible
        // - Check license validity
        // - Validate authors/organization
        citation.verified = true;
        citation.verifiedAt = new Date().toISOString();
        citation.verificationMethod = verificationMethod;
        this.registry.citations.set(citationId, citation);
        return true;
    }
    /**
     * Bulk verify citations
     */
    async verifyAllCitations() {
        const results = new Map();
        for (const [id, citation] of this.registry.citations) {
            const verified = await this.verifyCitation(id);
            results.set(id, verified);
        }
        return results;
    }
    /**
     * Export citation registry for sharing
     */
    exportRegistry() {
        const data = {
            registryId: this.registry.id,
            exportedAt: new Date().toISOString(),
            citations: Array.from(this.registry.citations.values()),
        };
        return JSON.stringify(data, null, 2);
    }
    /**
     * Import citation registry
     */
    importRegistry(json) {
        const data = JSON.parse(json);
        for (const citation of data.citations) {
            this.registerCitation(citation);
        }
    }
}
exports.CitationValidator = CitationValidator;
/**
 * Publishing Pipeline with Citation Validation
 */
class PublishingPipeline {
    validator;
    constructor(validator) {
        this.validator = validator;
    }
    /**
     * Pre-publish validation
     */
    async validatePrePublish(manifest) {
        // Validate citations
        const result = this.validator.validateForPublishing(manifest.citations);
        // Additional manifest-level checks
        if (!manifest.metadata.name) {
            result.blockers.push('Manifest missing name');
        }
        if (!manifest.metadata.version) {
            result.blockers.push('Manifest missing version');
        }
        if (!manifest.hashTree || !manifest.hashTree.root) {
            result.blockers.push('Manifest missing valid hash tree');
        }
        if (!manifest.signature) {
            result.warnings.push('Manifest is not signed');
        }
        // Check model cards
        if (manifest.modelCards.length === 0) {
            result.warnings.push('No model cards provided');
        }
        // Update canPublish based on all checks
        result.canPublish = result.blockers.length === 0;
        return result;
    }
    /**
     * Block publishing if validation fails
     */
    async publish(manifest) {
        const validation = await this.validatePrePublish(manifest);
        if (!validation.canPublish) {
            return {
                success: false,
                message: `Publishing blocked: ${validation.blockers.join('; ')}`,
            };
        }
        if (validation.warnings.length > 0) {
            console.warn('Publishing with warnings:', validation.warnings);
        }
        // Proceed with publishing
        // In production, this would:
        // 1. Upload to registry
        // 2. Register with revocation service
        // 3. Update citation registry
        // 4. Emit publishing event
        return {
            success: true,
            message: `Published bundle ${manifest.bundleId} successfully`,
        };
    }
}
exports.PublishingPipeline = PublishingPipeline;
/**
 * Standard licenses library
 */
exports.StandardLicenses = {
    MIT: {
        spdxId: 'MIT',
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT',
        requiresAttribution: true,
        allowsCommercialUse: true,
        allowsModification: true,
        copyleft: false,
    },
    'Apache-2.0': {
        spdxId: 'Apache-2.0',
        name: 'Apache License 2.0',
        url: 'https://www.apache.org/licenses/LICENSE-2.0',
        requiresAttribution: true,
        allowsCommercialUse: true,
        allowsModification: true,
        copyleft: false,
    },
    'GPL-3.0': {
        spdxId: 'GPL-3.0',
        name: 'GNU General Public License v3.0',
        url: 'https://www.gnu.org/licenses/gpl-3.0.html',
        requiresAttribution: true,
        allowsCommercialUse: true,
        allowsModification: true,
        copyleft: true,
    },
    'AGPL-3.0': {
        spdxId: 'AGPL-3.0',
        name: 'GNU Affero General Public License v3.0',
        url: 'https://www.gnu.org/licenses/agpl-3.0.html',
        requiresAttribution: true,
        allowsCommercialUse: true,
        allowsModification: true,
        copyleft: true,
    },
    'BSD-3-Clause': {
        spdxId: 'BSD-3-Clause',
        name: 'BSD 3-Clause License',
        url: 'https://opensource.org/licenses/BSD-3-Clause',
        requiresAttribution: true,
        allowsCommercialUse: true,
        allowsModification: true,
        copyleft: false,
    },
    'CC-BY-4.0': {
        spdxId: 'CC-BY-4.0',
        name: 'Creative Commons Attribution 4.0',
        url: 'https://creativecommons.org/licenses/by/4.0/',
        requiresAttribution: true,
        allowsCommercialUse: true,
        allowsModification: true,
        copyleft: false,
    },
    PROPRIETARY: {
        spdxId: 'PROPRIETARY',
        name: 'Proprietary License',
        requiresAttribution: true,
        allowsCommercialUse: false,
        allowsModification: false,
        copyleft: false,
    },
};
