"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceScanner = void 0;
class ComplianceScanner {
    /**
     * Scans a list of files (simulated) for compliance risks.
     * @param files List of filenames and their mock content.
     */
    async scanRepo(files) {
        const results = [];
        for (const [filename, content] of Object.entries(files)) {
            const risks = [];
            let score = 100;
            // Check for shadow risks (simulated)
            if (content.includes('AWS_SECRET_KEY')) {
                risks.push('CRITICAL: Potential AWS credential exposure');
                score -= 50;
            }
            if (content.includes('unencrypted_bucket')) {
                risks.push('HIGH: Unencrypted storage bucket reference');
                score -= 30;
            }
            // Check for GDPR/PII keywords
            if (content.match(/ssn|social security|credit card/i)) {
                risks.push('GDPR: PII detected without redaction flags');
                score -= 20;
            }
            results.push({
                file: filename,
                risks,
                complianceScore: Math.max(0, score)
            });
        }
        return results;
    }
}
exports.ComplianceScanner = ComplianceScanner;
