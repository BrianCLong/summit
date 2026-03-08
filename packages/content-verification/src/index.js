"use strict";
/**
 * Content Authenticity Verification Package
 * Fact-checking, source credibility, and truthfulness assessment
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentVerifier = exports.FactCheckVerdict = exports.VerificationType = void 0;
__exportStar(require("./blockchain/provenance-chain"), exports);
var VerificationType;
(function (VerificationType) {
    VerificationType["FACT_CHECK"] = "fact_check";
    VerificationType["SOURCE_CREDIBILITY"] = "source_credibility";
    VerificationType["CITATION_VERIFICATION"] = "citation_verification";
    VerificationType["SCIENTIFIC_VALIDATION"] = "scientific_validation";
    VerificationType["STATISTICAL_CHECK"] = "statistical_check";
    VerificationType["QUOTE_VERIFICATION"] = "quote_verification";
    VerificationType["CONTEXT_CHECK"] = "context_check";
    VerificationType["SATIRE_DETECTION"] = "satire_detection";
})(VerificationType || (exports.VerificationType = VerificationType = {}));
var FactCheckVerdict;
(function (FactCheckVerdict) {
    FactCheckVerdict["TRUE"] = "true";
    FactCheckVerdict["MOSTLY_TRUE"] = "mostly_true";
    FactCheckVerdict["MIXED"] = "mixed";
    FactCheckVerdict["MOSTLY_FALSE"] = "mostly_false";
    FactCheckVerdict["FALSE"] = "false";
    FactCheckVerdict["UNVERIFIABLE"] = "unverifiable";
})(FactCheckVerdict || (exports.FactCheckVerdict = FactCheckVerdict = {}));
class ContentVerifier {
    /**
     * Comprehensive content verification
     */
    async verifyContent(content) {
        const verifications = [];
        const factChecks = [];
        const recommendations = [];
        // 1. Assess source credibility
        const credibility = await this.assessSourceCredibility(content.source);
        verifications.push({
            type: VerificationType.SOURCE_CREDIBILITY,
            passed: credibility.overall > 0.6,
            confidence: credibility.overall,
            details: `Source credibility: ${(credibility.overall * 100).toFixed(0)}%`,
            evidence: credibility,
        });
        // 2. Fact-check claims
        const claims = content.claims || this.extractClaims(content.text);
        for (const claim of claims.slice(0, 5)) {
            // Limit to top 5
            const factCheck = await this.factCheck(claim);
            factChecks.push(factCheck);
            verifications.push({
                type: VerificationType.FACT_CHECK,
                passed: factCheck.verdict === FactCheckVerdict.TRUE || factCheck.verdict === FactCheckVerdict.MOSTLY_TRUE,
                confidence: factCheck.confidence,
                details: `Claim: "${claim.substring(0, 100)}..." - ${factCheck.verdict}`,
                evidence: factCheck,
            });
        }
        // 3. Check citations
        const citationCheck = await this.verifyCitations(content.text);
        verifications.push(citationCheck);
        // 4. Analyze context
        const contextAnalysis = await this.analyzeContext(content.text, content.metadata);
        // 5. Detect satire/parody
        const satireDetection = await this.detectSatire(content.text, content.source);
        verifications.push(satireDetection);
        // Calculate overall authenticity
        const passedVerifications = verifications.filter((v) => v.passed).length;
        const overallConfidence = verifications.reduce((sum, v) => sum + (v.passed ? v.confidence : 0), 0) / verifications.length;
        const isAuthentic = passedVerifications / verifications.length > 0.6;
        if (!isAuthentic) {
            recommendations.push('Content contains unverified or false information');
            recommendations.push('Cross-check with authoritative sources');
        }
        if (credibility.biasScore > 0.7) {
            recommendations.push('Source shows significant bias - verify independently');
        }
        if (contextAnalysis.misleading) {
            recommendations.push('Content may be misleading due to missing context');
        }
        return {
            isAuthentic,
            confidence: overallConfidence,
            verifications,
            credibility,
            factChecks,
            contextAnalysis,
            recommendations,
        };
    }
    /**
     * Assess source credibility
     */
    async assessSourceCredibility(source) {
        if (!source) {
            return {
                overall: 0.3,
                sourceQuality: 0,
                expertiseLevel: 0,
                biasScore: 0.5,
                trackRecord: 0,
                transparency: 0,
            };
        }
        // Check against known credible sources
        const knownCredibleSources = [
            'reuters.com',
            'apnews.com',
            'bbc.com',
            'nature.com',
            'science.org',
            'scholar.google.com',
        ];
        const knownUnreliableSources = ['fakenews.com', 'conspiracy.net'];
        let sourceQuality = 0.5;
        if (knownCredibleSources.some((s) => source.includes(s))) {
            sourceQuality = 0.9;
        }
        else if (knownUnreliableSources.some((s) => source.includes(s))) {
            sourceQuality = 0.1;
        }
        // Assess domain characteristics
        const domainAge = this.estimateDomainAge(source);
        const hasSecureConnection = source.startsWith('https');
        const expertiseLevel = this.assessExpertise(source);
        const biasScore = this.assessBias(source);
        const transparency = this.assessTransparency(source);
        const overall = sourceQuality * 0.4 +
            expertiseLevel * 0.2 +
            (1 - biasScore) * 0.2 +
            transparency * 0.2;
        return {
            overall,
            sourceQuality,
            expertiseLevel,
            biasScore,
            trackRecord: sourceQuality,
            transparency,
        };
    }
    estimateDomainAge(source) {
        // Estimate domain age (placeholder)
        return 5; // years
    }
    assessExpertise(source) {
        // Check if source is in relevant domain
        const academicDomains = ['.edu', 'scholar', 'research', 'journal'];
        const hasAcademicDomain = academicDomains.some((d) => source.includes(d));
        return hasAcademicDomain ? 0.9 : 0.5;
    }
    assessBias(source) {
        // Assess political/ideological bias
        // 0 = no bias, 1 = extreme bias
        // This would require a bias database in production
        return 0.3;
    }
    assessTransparency(source) {
        // Check for author attribution, editorial standards, etc.
        return 0.7;
    }
    /**
     * Extract verifiable claims from text
     */
    extractClaims(text) {
        // Use NLP to extract factual claims
        // Look for statements that can be verified
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
        // Simple heuristic: look for definitive statements
        const claims = sentences.filter((s) => {
            const lower = s.toLowerCase();
            return (!lower.includes('maybe') &&
                !lower.includes('might') &&
                !lower.includes('could') &&
                !lower.includes('i think') &&
                !lower.includes('in my opinion'));
        });
        return claims.slice(0, 10); // Limit to 10 claims
    }
    /**
     * Fact-check a claim
     */
    async factCheck(claim) {
        // In production, this would:
        // 1. Query fact-checking databases (Snopes, PolitiFact, etc.)
        // 2. Search scholarly sources
        // 3. Use knowledge graphs
        // 4. Consult trusted APIs
        // Simplified implementation
        const sources = [];
        // Check for obvious false patterns
        const falsePatterns = [
            /\d+ million (dead|died|killed)/i,
            /proven to (cure|prevent)/i,
            /scientists confirm/i,
            /studies show/i, // Without citation
        ];
        let verdict = FactCheckVerdict.UNVERIFIABLE;
        let confidence = 0.5;
        if (falsePatterns.some((pattern) => pattern.test(claim))) {
            verdict = FactCheckVerdict.MOSTLY_FALSE;
            confidence = 0.6;
        }
        return {
            claim,
            verdict,
            confidence,
            sources,
            reasoning: 'Based on pattern analysis and available sources',
        };
    }
    /**
     * Verify citations and references
     */
    async verifyCitations(text) {
        // Check for:
        // 1. Presence of citations
        // 2. Valid citation format
        // 3. Accessible sources
        // 4. Relevant citations
        const hasCitations = /\[\d+\]|\(\d{4}\)|et al\./.test(text);
        const citationCount = (text.match(/\[\d+\]/g) || []).length;
        const passed = hasCitations && citationCount >= 2;
        const confidence = passed ? 0.7 : 0.3;
        return {
            type: VerificationType.CITATION_VERIFICATION,
            passed,
            confidence,
            details: `Found ${citationCount} citations`,
            evidence: { citationCount, hasCitations },
        };
    }
    /**
     * Analyze content context
     */
    async analyzeContext(text, metadata) {
        const manipulation = [];
        const missing = [];
        // Check for context manipulation:
        // 1. Cherry-picked data
        // 2. Missing key information
        // 3. Misleading framing
        // 4. Out-of-context quotes
        // Detect selective quoting
        if (text.includes('...') || text.includes('[...]')) {
            manipulation.push({
                type: 'selective_quoting',
                description: 'Quote may be taken out of context',
                severity: 0.5,
            });
        }
        // Check for missing sources
        const hasClaims = text.split(/[.!?]/).length > 5;
        const hasSources = /source:|according to|reported by/i.test(text);
        if (hasClaims && !hasSources) {
            missing.push('Source attribution');
            manipulation.push({
                type: 'missing_attribution',
                description: 'Claims made without source attribution',
                severity: 0.6,
            });
        }
        const misleading = manipulation.some((m) => m.severity > 0.5);
        return {
            inContext: manipulation.length === 0,
            manipulation,
            missing,
            misleading,
        };
    }
    /**
     * Detect satire and parody
     */
    async detectSatire(text, source) {
        // Satire indicators:
        // 1. Known satire sources
        // 2. Absurd claims
        // 3. Exaggeration
        // 4. Humorous tone
        const satireSources = ['theonion.com', 'babylonbee.com', 'clickhole.com'];
        const isKnownSatire = satireSources.some((s) => source?.includes(s));
        const absurdPatterns = [
            /florida man/i,
            /area man/i,
            /local (man|woman) (who|discovers)/i,
            /study finds \d+% of/i,
        ];
        const hasAbsurdPatterns = absurdPatterns.some((pattern) => pattern.test(text));
        const isSatire = isKnownSatire || hasAbsurdPatterns;
        return {
            type: VerificationType.SATIRE_DETECTION,
            passed: !isSatire,
            confidence: isSatire ? 0.8 : 0.6,
            details: isSatire ? 'Content appears to be satire/parody' : 'Not identified as satire',
            evidence: { isKnownSatire, hasAbsurdPatterns },
        };
    }
    /**
     * Verify scientific claims
     */
    async verifyScientificClaim(claim) {
        // Check against:
        // 1. Scientific consensus
        // 2. Peer-reviewed literature
        // 3. Expert opinions
        // 4. Methodology validity
        const evidence = [];
        // Check for red flags in scientific claims
        const redFlags = [
            'proven cure',
            'doctors hate',
            'miracle',
            '100% effective',
            'breakthrough',
        ];
        const hasRedFlags = redFlags.some((flag) => claim.toLowerCase().includes(flag));
        if (hasRedFlags) {
            evidence.push('Contains sensational language uncommon in scientific literature');
        }
        return {
            valid: !hasRedFlags,
            confidence: hasRedFlags ? 0.3 : 0.6,
            evidence,
        };
    }
    /**
     * Verify statistical claims
     */
    async verifyStatisticalClaim(claim) {
        const issues = [];
        // Check for:
        // 1. Suspicious statistics (too round numbers)
        // 2. Impossible percentages
        // 3. Correlation vs causation
        // 4. Sample size issues
        const percentages = claim.match(/(\d+)%/g);
        if (percentages) {
            for (const pct of percentages) {
                const value = parseInt(pct);
                if (value > 100) {
                    issues.push('Invalid percentage over 100%');
                }
                if (value % 10 === 0 && value !== 100) {
                    issues.push('Suspiciously round percentage (may be estimated)');
                }
            }
        }
        // Check for correlation/causation confusion
        if (/causes?|leads? to|results? in/i.test(claim) && /study|research/i.test(claim)) {
            if (!/causal|randomized|controlled/i.test(claim)) {
                issues.push('Possible confusion of correlation with causation');
            }
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
}
exports.ContentVerifier = ContentVerifier;
