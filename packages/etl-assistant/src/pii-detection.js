"use strict";
/**
 * PII Detection Module
 *
 * Detects personally identifiable information using regex patterns and heuristics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIIDetection = void 0;
/**
 * PII Detection Patterns
 */
const PII_PATTERNS = {
    email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'email',
    },
    phone: {
        pattern: /\b(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
        type: 'phone',
    },
    ssn: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        type: 'ssn',
    },
    credit_card: {
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        type: 'credit_card',
    },
};
/**
 * Field name heuristics for PII detection
 */
const PII_FIELD_HEURISTICS = {
    email: ['email', 'mail', 'e_mail', 'email_address', 'emailaddress'],
    phone: ['phone', 'mobile', 'tel', 'telephone', 'phone_number', 'phonenumber', 'cell'],
    ssn: ['ssn', 'social_security', 'social_security_number', 'national_id', 'passport', 'passport_number'],
    dob: ['dob', 'date_of_birth', 'birthdate', 'birth_date', 'dateofbirth'],
    address: ['address', 'street', 'street_address', 'home_address', 'mailing_address', 'zip', 'postal_code', 'zipcode'],
    credit_card: ['credit_card', 'cc_number', 'card_number', 'creditcard', 'cc', 'cvv'],
    name: ['name', 'full_name', 'fullname', 'first_name', 'last_name', 'firstname', 'lastname'],
};
/**
 * PII Detection Engine
 */
class PIIDetection {
    /**
     * Detect PII in sample records
     */
    detectPII(samples) {
        if (samples.length === 0) {
            return {
                piiFields: [],
                riskLevel: 'none',
                recommendations: [],
                summary: 'No PII detected (no samples provided)',
            };
        }
        const piiFields = [];
        // Get all field names
        const allFields = new Set();
        samples.forEach((sample) => {
            Object.keys(sample).forEach((key) => allFields.add(key));
        });
        // Analyze each field
        for (const field of allFields) {
            const piiResult = this.analyzeField(field, samples);
            if (piiResult) {
                piiFields.push(piiResult);
            }
        }
        // Calculate risk level
        const riskLevel = this.calculateRiskLevel(piiFields);
        // Generate recommendations
        const recommendations = this.generateRecommendations(piiFields);
        return {
            piiFields,
            riskLevel,
            recommendations,
            summary: this.generateSummary(piiFields, riskLevel),
        };
    }
    /**
     * Analyze a single field for PII
     */
    analyzeField(field, samples) {
        const values = samples
            .map((s) => s[field])
            .filter((v) => v !== null && v !== undefined && typeof v === 'string');
        if (values.length === 0)
            return null;
        // Check field name heuristics first
        const heuristicResult = this.checkFieldNameHeuristics(field);
        // Check pattern matching
        const patternResult = this.checkPatterns(values);
        // Combine results
        if (heuristicResult || patternResult) {
            const piiType = patternResult?.type || heuristicResult?.type || 'other';
            const detectionMethod = patternResult && heuristicResult
                ? 'combined'
                : patternResult
                    ? 'pattern'
                    : 'heuristic';
            const confidence = this.calculatePIIConfidence(detectionMethod, heuristicResult?.confidence || 0, patternResult?.confidence || 0);
            const sampleMatches = patternResult?.matches?.slice(0, 3) || values.slice(0, 3);
            return {
                field,
                piiType,
                confidence,
                detectionMethod,
                sampleMatches,
                recommendedStrategy: this.recommendStrategy(piiType, confidence),
            };
        }
        return null;
    }
    /**
     * Check field name against heuristics
     */
    checkFieldNameHeuristics(field) {
        const fieldLower = field.toLowerCase();
        for (const [piiType, keywords] of Object.entries(PII_FIELD_HEURISTICS)) {
            for (const keyword of keywords) {
                if (fieldLower === keyword) {
                    // Exact match
                    return {
                        type: piiType,
                        confidence: 0.9,
                    };
                }
                if (fieldLower.includes(keyword) || keyword.includes(fieldLower)) {
                    // Partial match
                    return {
                        type: piiType,
                        confidence: 0.7,
                    };
                }
            }
        }
        return null;
    }
    /**
     * Check values against PII patterns
     */
    checkPatterns(values) {
        for (const [patternName, patternDef] of Object.entries(PII_PATTERNS)) {
            const matches = [];
            for (const value of values) {
                const valueMatches = value.match(patternDef.pattern);
                if (valueMatches) {
                    matches.push(...valueMatches);
                }
            }
            if (matches.length > 0) {
                // Calculate confidence based on match rate
                const matchRate = matches.length / values.length;
                const confidence = Math.min(1.0, matchRate * 1.2);
                return {
                    type: patternDef.type,
                    confidence,
                    matches,
                };
            }
        }
        return null;
    }
    /**
     * Calculate PII confidence
     */
    calculatePIIConfidence(method, heuristicConfidence, patternConfidence) {
        if (method === 'combined') {
            // Average with bonus for agreement
            return Math.min(1.0, (heuristicConfidence + patternConfidence) / 2 + 0.1);
        }
        else if (method === 'pattern') {
            return patternConfidence;
        }
        else {
            return heuristicConfidence;
        }
    }
    /**
     * Recommend redaction strategy
     */
    recommendStrategy(piiType, confidence) {
        // High-risk PII: DROP or HASH
        if (piiType === 'ssn' || piiType === 'credit_card') {
            return confidence > 0.8 ? 'DROP' : 'HASH';
        }
        // Medium-risk PII: MASK or HASH
        if (piiType === 'email' || piiType === 'phone') {
            return confidence > 0.8 ? 'MASK' : 'HASH';
        }
        // Low-risk PII: MASK
        return 'MASK';
    }
    /**
     * Calculate overall risk level
     */
    calculateRiskLevel(piiFields) {
        if (piiFields.length === 0)
            return 'none';
        // Check for critical PII
        const hasCriticalPII = piiFields.some((f) => (f.piiType === 'ssn' || f.piiType === 'credit_card') && f.confidence > 0.7);
        if (hasCriticalPII)
            return 'critical';
        // Check for high-risk PII
        const hasHighRiskPII = piiFields.some((f) => (f.piiType === 'ssn' || f.piiType === 'credit_card' || f.piiType === 'dob') &&
            f.confidence > 0.5);
        if (hasHighRiskPII || piiFields.length >= 5)
            return 'high';
        // Check for medium-risk PII
        const hasMediumRiskPII = piiFields.some((f) => (f.piiType === 'email' || f.piiType === 'phone' || f.piiType === 'address') && f.confidence > 0.7);
        if (hasMediumRiskPII || piiFields.length >= 3)
            return 'medium';
        // Low-risk
        return piiFields.length > 0 ? 'low' : 'none';
    }
    /**
     * Generate redaction recommendations
     */
    generateRecommendations(piiFields) {
        return piiFields.map((field) => ({
            field: field.field,
            strategy: field.recommendedStrategy,
            reason: this.generateRecommendationReason(field),
        }));
    }
    /**
     * Generate recommendation reason
     */
    generateRecommendationReason(field) {
        const strategyDescriptions = {
            MASK: 'Partially obscure to preserve format while protecting privacy',
            DROP: 'Remove entirely due to high sensitivity',
            HASH: 'One-way hash to enable matching without revealing original value',
        };
        return `${field.piiType.toUpperCase()} detected with ${(field.confidence * 100).toFixed(0)}% confidence. ${strategyDescriptions[field.recommendedStrategy]}.`;
    }
    /**
     * Generate summary text
     */
    generateSummary(piiFields, riskLevel) {
        if (piiFields.length === 0) {
            return 'No PII detected in sample records.';
        }
        const piiTypes = Array.from(new Set(piiFields.map((f) => f.piiType)));
        return `Detected ${piiFields.length} PII field(s) containing: ${piiTypes.join(', ')}. Overall risk level: ${riskLevel.toUpperCase()}.`;
    }
    /**
     * Apply redaction to a value
     */
    static redact(value, strategy) {
        switch (strategy) {
            case 'MASK':
                return this.maskValue(value);
            case 'DROP':
                return '[REDACTED]';
            case 'HASH':
                return this.hashValue(value);
            default:
                return value;
        }
    }
    /**
     * Mask a value (preserve first and last chars, or parts)
     */
    static maskValue(value) {
        if (value.length <= 4) {
            return '*'.repeat(value.length);
        }
        // For emails: preserve first char and domain
        if (value.includes('@')) {
            const [local, domain] = value.split('@');
            const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(0, local.length - 1));
            const domainParts = domain.split('.');
            const maskedDomain = domainParts.length > 1
                ? domainParts[0].charAt(0) + '*'.repeat(Math.max(0, domainParts[0].length - 1)) + '.' + domainParts.slice(1).join('.')
                : domain;
            return `${maskedLocal}@${maskedDomain}`;
        }
        // For other values: preserve first 2 and last 2 chars
        return value.slice(0, 2) + '*'.repeat(Math.max(0, value.length - 4)) + value.slice(-2);
    }
    /**
     * Hash a value (simple hash for demonstration)
     */
    static hashValue(value) {
        // Simple hash (in production, use crypto.createHash)
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            const char = value.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `HASH_${Math.abs(hash).toString(16).padStart(8, '0')}`;
    }
}
exports.PIIDetection = PIIDetection;
