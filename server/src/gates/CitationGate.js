"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitationGate = void 0;
const FeatureFlagService_js_1 = require("../services/FeatureFlagService.js");
class CitationGate {
    /**
     * Validate citations in export payload.
     * If CITATION_GATE feature flag is enabled:
     *  - Checks 'findings' and known narrative sections for uncited statements.
     *  - Moves uncited statements to a 'gaps' array or 'gaps_appendix' section.
     *  - Throws error if strict mode is enabled and gaps are found.
     */
    static async validateCitations(payload, options) {
        const featureFlagService = (0, FeatureFlagService_js_1.getFeatureFlagService)();
        // Construct user context for feature flag
        const userContext = {
            key: options.userId || 'system',
            custom: {
                tenantId: options.tenantId
            }
        };
        const isEnabled = await featureFlagService.isEnabled('CITATION_GATE', userContext);
        if (!isEnabled) {
            return payload;
        }
        const gaps = [];
        const newPayload = { ...payload };
        // Helper to process a list
        const processList = (list) => {
            const validItems = [];
            for (const item of list) {
                if (this.isUncited(item)) {
                    gaps.push(this.toStatement(item));
                }
                else {
                    validItems.push(item);
                }
            }
            return validItems;
        };
        // Process 'findings' (ReportService style)
        if (newPayload.findings && Array.isArray(newPayload.findings)) {
            newPayload.findings = processList(newPayload.findings);
        }
        // Process 'sections' (ReportingService style)
        if (newPayload.sections && Array.isArray(newPayload.sections)) {
            for (const section of newPayload.sections) {
                // Check specific known fields in section data that contain narrative text
                if (section.data && section.data.keyInsights) {
                    const validInsights = [];
                    for (const insight of section.data.keyInsights) {
                        // Check if insight has citations.
                        // We assume insight object needs a 'citations' array.
                        if (!insight.citations || insight.citations.length === 0) {
                            gaps.push({
                                text: insight.description || JSON.stringify(insight),
                                citations: []
                            });
                        }
                        else {
                            validInsights.push(insight);
                        }
                    }
                    section.data.keyInsights = validInsights;
                }
                // Add more section types here as needed
            }
        }
        // If gaps found
        if (gaps.length > 0) {
            if (options.strict) {
                throw new Error(`Export blocked: ${gaps.length} uncited statements found.`);
            }
            // Add Gaps Appendix
            // For ReportService structure
            if (newPayload.findings) {
                // Since ReportService renders 'findings' and 'evidence' specifically,
                // we'll just expose gaps in the payload so the renderer can optionally use it.
                // We'll also append it to 'evidence' as a text block if we want it to show up without renderer changes,
                // but the prompt implies "Route uncited statements into a “Gaps Appendix”".
                // We'll add a 'gaps' property.
                newPayload.gaps = gaps;
            }
            // For ReportingService structure
            if (newPayload.sections && Array.isArray(newPayload.sections)) {
                newPayload.sections.push({
                    name: 'gaps_appendix',
                    title: 'Gaps Appendix (Uncited Statements)',
                    data: { gaps },
                    generatedAt: new Date()
                });
            }
        }
        return newPayload;
    }
    static isUncited(item) {
        if (typeof item === 'string')
            return true; // Strings are uncited by definition in this new world
        return !item.citations || item.citations.length === 0;
    }
    static toStatement(item) {
        if (typeof item === 'string')
            return { text: item, citations: [] };
        return item;
    }
}
exports.CitationGate = CitationGate;
