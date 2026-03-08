"use strict";
/**
 * Citation Validator
 *
 * Validates citations and blocks publication when citation requirements are not met.
 * Ensures all evidence is properly cited with sources, timestamps, and integrity hashes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitationValidator = void 0;
const types_js_1 = require("./types.js");
/**
 * Citation Validator
 */
class CitationValidator {
    /**
     * Validate citations for evidence
     */
    static validateCitations(evidence, citations, requirements = {}) {
        const errors = [];
        const warnings = [];
        const { minCitationsPerEvidence = 1, requireSourceLinks = true, requireTimestamps = true, requireAuthors = false, requireHashes = true, } = requirements;
        // Stats
        let totalCitations = 0;
        let validCitations = 0;
        let missingUrls = 0;
        let missingTimestamps = 0;
        let missingAuthors = 0;
        let brokenHashes = 0;
        // Build citation map
        const citationMap = new Map();
        for (const citation of citations) {
            citationMap.set(citation.id, citation);
        }
        // Validate each piece of evidence
        for (const ev of evidence) {
            if (ev.citations.length < minCitationsPerEvidence) {
                errors.push(`Evidence ${ev.id} (${ev.type}) has only ${ev.citations.length} citation(s), requires at least ${minCitationsPerEvidence}`);
            }
            // Validate each citation
            for (const citation of ev.citations) {
                totalCitations++;
                const citationErrors = [];
                // Check if citation exists in the main citation list
                if (!citationMap.has(citation.id)) {
                    citationErrors.push(`Citation ${citation.id} not found in citation list`);
                }
                // Validate source
                if (!citation.source || citation.source.trim() === '') {
                    citationErrors.push(`Citation ${citation.id} missing source`);
                }
                // Validate URL if required
                if (requireSourceLinks && (!citation.url || citation.url.trim() === '')) {
                    citationErrors.push(`Citation ${citation.id} missing URL`);
                    missingUrls++;
                }
                // Validate timestamp if required
                if (requireTimestamps && !citation.timestamp) {
                    citationErrors.push(`Citation ${citation.id} missing timestamp`);
                    missingTimestamps++;
                }
                // Validate author if required
                if (requireAuthors && (!citation.author || citation.author.trim() === '')) {
                    citationErrors.push(`Citation ${citation.id} missing author`);
                    missingAuthors++;
                }
                // Validate hash if required
                if (requireHashes) {
                    if (!citation.hash) {
                        citationErrors.push(`Citation ${citation.id} missing integrity hash`);
                        brokenHashes++;
                    }
                    else {
                        // Verify hash integrity
                        const expectedHash = (0, types_js_1.createCitationHash)(citation);
                        if (citation.hash !== expectedHash) {
                            citationErrors.push(`Citation ${citation.id} has invalid hash (integrity check failed)`);
                            brokenHashes++;
                        }
                    }
                }
                if (citationErrors.length === 0) {
                    validCitations++;
                }
                else {
                    errors.push(...citationErrors);
                }
            }
        }
        // Check for uncited evidence
        const uncitedEvidence = evidence.filter((ev) => ev.citations.length === 0);
        if (uncitedEvidence.length > 0) {
            errors.push(`Found ${uncitedEvidence.length} piece(s) of evidence without citations: ${uncitedEvidence.map((e) => e.id).join(', ')}`);
        }
        // Generate warnings
        if (missingAuthors > 0 && !requireAuthors) {
            warnings.push(`${missingAuthors} citation(s) missing author information (recommended but not required)`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            stats: {
                totalCitations,
                validCitations,
                missingUrls,
                missingTimestamps,
                missingAuthors,
                brokenHashes,
            },
        };
    }
    /**
     * Determine if publication should be blocked based on citation validation
     */
    static shouldBlockPublication(validationResult) {
        if (validationResult.valid) {
            return { blocked: false, reasons: [] };
        }
        return {
            blocked: true,
            reasons: validationResult.errors,
        };
    }
    /**
     * Create a citation from a source
     */
    static createCitation(source, url, author, metadata) {
        const citation = {
            id: `cite-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            source,
            url,
            timestamp: new Date(),
            author,
            accessedAt: new Date(),
            metadata,
        };
        const hash = (0, types_js_1.createCitationHash)(citation);
        return {
            ...citation,
            hash,
        };
    }
    /**
     * Validate citation format
     */
    static validateCitationFormat(citation) {
        const errors = [];
        // Basic validation
        if (!citation.id) {
            errors.push('Citation missing ID');
        }
        if (!citation.source || citation.source.trim() === '') {
            errors.push('Citation missing source');
        }
        if (citation.url) {
            // Validate URL format
            try {
                new URL(citation.url);
            }
            catch (e) {
                errors.push(`Invalid URL format: ${citation.url}`);
            }
        }
        if (!citation.timestamp) {
            errors.push('Citation missing timestamp');
        }
        if (!citation.accessedAt) {
            errors.push('Citation missing accessedAt timestamp');
        }
        // Validate timestamp ordering
        if (citation.timestamp && citation.accessedAt && citation.accessedAt < citation.timestamp) {
            errors.push('Citation accessedAt must be >= timestamp');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Generate a citation report
     */
    static generateCitationReport(evidence, citations) {
        const lines = [];
        lines.push('=== CITATION REPORT ===');
        lines.push('');
        lines.push(`Total Evidence: ${evidence.length}`);
        lines.push(`Total Citations: ${citations.length}`);
        lines.push('');
        // Group citations by evidence
        for (const ev of evidence) {
            lines.push(`Evidence: ${ev.id} (${ev.type})`);
            lines.push(`  Collected: ${ev.collectedAt.toISOString()}`);
            lines.push(`  Citations: ${ev.citations.length}`);
            for (const citation of ev.citations) {
                lines.push(`    - [${citation.id}] ${citation.source}`);
                if (citation.url) {
                    lines.push(`      URL: ${citation.url}`);
                }
                if (citation.author) {
                    lines.push(`      Author: ${citation.author}`);
                }
                lines.push(`      Timestamp: ${citation.timestamp.toISOString()}`);
                if (citation.hash) {
                    lines.push(`      Hash: ${citation.hash.substring(0, 16)}...`);
                }
            }
            lines.push('');
        }
        return lines.join('\n');
    }
}
exports.CitationValidator = CitationValidator;
