"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskScorerService = void 0;
const uuid_1 = require("uuid");
const db_js_1 = require("../utils/db.js");
const logger_js_1 = require("../utils/logger.js");
// PII patterns for detection
const PII_PATTERNS = {
    email: /email|e-mail|mail_address/i,
    phone: /phone|mobile|tel|telephone/i,
    ssn: /ssn|social_security|social_sec/i,
    address: /address|street|city|zip|postal/i,
    name: /first_name|last_name|full_name|name/i,
    dob: /date_of_birth|dob|birth_date|birthday/i,
    financial: /credit_card|card_number|account_number|bank/i,
    health: /diagnosis|medical|health|prescription|patient/i,
    biometric: /fingerprint|face_id|retina|biometric/i,
    ip: /ip_address|ip_addr/i,
};
const CLASSIFICATION_WEIGHTS = {
    public: 10,
    internal: 30,
    confidential: 60,
    restricted: 80,
    top_secret: 100,
};
const REGULATION_WEIGHTS = {
    GDPR: 25,
    CCPA: 20,
    HIPAA: 35,
    SOX: 30,
    PCI_DSS: 30,
    FERPA: 20,
    GLBA: 25,
};
exports.riskScorerService = {
    async assess(product) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // Calculate component scores
        const piiScore = assessPIIRisk(product);
        const sensitivityScore = assessSensitivity(product);
        const regulatoryScore = assessRegulatoryComplexity(product);
        const technicalScore = assessTechnicalControls(product);
        // Weighted average
        const weights = {
            pii: 0.35,
            sensitivity: 0.25,
            regulatory: 0.25,
            technical: 0.15,
        };
        const overallScore = Math.round(piiScore * weights.pii +
            sensitivityScore * weights.sensitivity +
            regulatoryScore * weights.regulatory +
            technicalScore * weights.technical);
        const riskLevel = getRiskLevel(overallScore);
        // Generate findings and recommendations
        const findings = generateFindings(product, {
            piiScore,
            sensitivityScore,
            regulatoryScore,
        });
        const recommendations = generateRecommendations(product, findings);
        const automatedChecks = runAutomatedChecks(product);
        const assessment = {
            id,
            productId: product.id,
            overallScore,
            riskLevel,
            piiScore,
            sensitivityScore,
            regulatoryScore,
            reputationScore: 50, // Default - would come from provider history
            technicalScore,
            findings,
            recommendations,
            automatedChecks,
            assessedAt: now,
            assessedBy: 'system',
        };
        // Store assessment
        await db_js_1.db.query(`INSERT INTO risk_assessments (
        id, product_id, overall_score, risk_level,
        pii_score, sensitivity_score, regulatory_score,
        reputation_score, technical_score, findings,
        recommendations, automated_checks, assessed_at, assessed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
            assessment.id,
            assessment.productId,
            assessment.overallScore,
            assessment.riskLevel,
            assessment.piiScore,
            assessment.sensitivityScore,
            assessment.regulatoryScore,
            assessment.reputationScore,
            assessment.technicalScore,
            JSON.stringify(assessment.findings),
            JSON.stringify(assessment.recommendations),
            JSON.stringify(assessment.automatedChecks),
            assessment.assessedAt,
            assessment.assessedBy,
        ]);
        logger_js_1.logger.info('Risk assessment completed', {
            productId: product.id,
            overallScore,
            riskLevel,
        });
        return assessment;
    },
    async getByProductId(productId) {
        const result = await db_js_1.db.query('SELECT * FROM risk_assessments WHERE product_id = $1 ORDER BY assessed_at DESC LIMIT 1', [productId]);
        return result.rows[0] ? mapRowToAssessment(result.rows[0]) : null;
    },
};
function assessPIIRisk(product) {
    let score = 0;
    const schemaFields = Object.keys(product.schemaDefinition);
    const declaredPII = product.piiFields;
    // Check schema for PII patterns
    for (const field of schemaFields) {
        for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
            if (pattern.test(field)) {
                score += piiType === 'ssn' || piiType === 'financial' ? 20 : 10;
                break;
            }
        }
    }
    // Higher score if PII declared but not properly documented
    if (declaredPII.length === 0 && score > 0) {
        score += 15; // Undocumented PII is worse
    }
    return Math.min(score, 100);
}
function assessSensitivity(product) {
    return CLASSIFICATION_WEIGHTS[product.classification] || 50;
}
function assessRegulatoryComplexity(product) {
    let score = 0;
    for (const reg of product.regulations) {
        score += REGULATION_WEIGHTS[reg] || 15;
    }
    return Math.min(score, 100);
}
function assessTechnicalControls(product) {
    // Base score - would be improved with actual technical assessment
    let score = 40;
    // Higher classification should have better controls
    if (product.classification === 'public') {
        score = 20;
    }
    else if (product.classification === 'restricted') {
        score = 60;
    }
    return score;
}
function getRiskLevel(score) {
    if (score <= 25) {
        return 'low';
    }
    if (score <= 50) {
        return 'medium';
    }
    if (score <= 75) {
        return 'high';
    }
    return 'critical';
}
function generateFindings(product, scores) {
    const findings = {
        piiDetected: [],
        complianceGaps: [],
    };
    // Detect PII in schema
    const piiDetected = [];
    for (const field of Object.keys(product.schemaDefinition)) {
        for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
            if (pattern.test(field)) {
                piiDetected.push({
                    field,
                    type: piiType,
                    confidence: 0.85,
                });
                break;
            }
        }
    }
    findings.piiDetected = piiDetected;
    // Check compliance gaps
    const gaps = [];
    if (product.regulations.includes('GDPR') && product.piiFields.length === 0) {
        gaps.push('GDPR requires documented PII fields');
    }
    if (product.regulations.includes('HIPAA') &&
        product.classification !== 'restricted') {
        gaps.push('HIPAA data should be classified as restricted');
    }
    findings.complianceGaps = gaps;
    return findings;
}
function generateRecommendations(product, findings) {
    const recommendations = [];
    const piiDetected = findings.piiDetected;
    if (piiDetected.length > 0) {
        recommendations.push('Document all PII fields in the product metadata');
        recommendations.push('Consider anonymization or pseudonymization for PII fields');
    }
    const gaps = findings.complianceGaps;
    if (gaps.length > 0) {
        recommendations.push('Address identified compliance gaps before publishing');
    }
    if (product.classification === 'confidential' || product.classification === 'restricted') {
        recommendations.push('Enable encryption at rest for sensitive data');
        recommendations.push('Implement access logging for audit trail');
    }
    return recommendations;
}
function runAutomatedChecks(product) {
    return [
        {
            name: 'schema_defined',
            passed: Object.keys(product.schemaDefinition).length > 0,
            details: 'Data schema must be defined',
        },
        {
            name: 'classification_set',
            passed: Boolean(product.classification),
            details: 'Data classification must be specified',
        },
        {
            name: 'pii_documented',
            passed: product.piiFields.length > 0 || assessPIIRisk(product) === 0,
            details: 'PII fields should be documented if present',
        },
        {
            name: 'pricing_valid',
            passed: product.basePriceCents > 0,
            details: 'Valid pricing must be set',
        },
        {
            name: 'regulations_applicable',
            passed: true, // Would check if regulations match data type
            details: 'Applicable regulations identified',
        },
    ];
}
function mapRowToAssessment(row) {
    return {
        id: row.id,
        productId: row.product_id,
        overallScore: row.overall_score,
        riskLevel: row.risk_level,
        piiScore: row.pii_score,
        sensitivityScore: row.sensitivity_score,
        regulatoryScore: row.regulatory_score,
        reputationScore: row.reputation_score,
        technicalScore: row.technical_score,
        findings: row.findings,
        recommendations: row.recommendations,
        automatedChecks: row.automated_checks,
        assessedAt: row.assessed_at,
        assessedBy: row.assessed_by,
    };
}
