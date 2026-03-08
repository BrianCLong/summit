"use strict";
/**
 * Data Integrity Envelope Types
 *
 * Ensures all API responses carry provenance, confidence, and governance metadata
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 *
 * @module data-envelope
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskLevel = exports.PolicyAction = exports.ExportFormat = exports.DataClassification = exports.GovernanceResult = void 0;
exports.createDataEnvelope = createDataEnvelope;
exports.validateDataEnvelope = validateDataEnvelope;
exports.requiresHighConfidence = requiresHighConfidence;
exports.addLineageNode = addLineageNode;
exports.isAIGenerated = isAIGenerated;
exports.getConfidenceLevel = getConfidenceLevel;
const crypto_1 = require("crypto");
/**
 * Governance result enumeration
 */
var GovernanceResult;
(function (GovernanceResult) {
    GovernanceResult["ALLOW"] = "ALLOW";
    GovernanceResult["DENY"] = "DENY";
    GovernanceResult["FLAG"] = "FLAG";
    GovernanceResult["REVIEW_REQUIRED"] = "REVIEW_REQUIRED";
})(GovernanceResult || (exports.GovernanceResult = GovernanceResult = {}));
/**
 * Data classification levels
 */
var DataClassification;
(function (DataClassification) {
    DataClassification["PUBLIC"] = "PUBLIC";
    DataClassification["INTERNAL"] = "INTERNAL";
    DataClassification["CONFIDENTIAL"] = "CONFIDENTIAL";
    DataClassification["RESTRICTED"] = "RESTRICTED";
    DataClassification["HIGHLY_RESTRICTED"] = "HIGHLY_RESTRICTED";
})(DataClassification || (exports.DataClassification = DataClassification = {}));
/**
 * Export format enumeration
 */
var ExportFormat;
(function (ExportFormat) {
    ExportFormat["PDF"] = "PDF";
    ExportFormat["CSV"] = "CSV";
    ExportFormat["JSON"] = "JSON";
    ExportFormat["EXCEL"] = "EXCEL";
    ExportFormat["XML"] = "XML";
})(ExportFormat || (exports.ExportFormat = ExportFormat = {}));
/**
 * Policy action enumeration
 */
var PolicyAction;
(function (PolicyAction) {
    PolicyAction["ALLOW"] = "ALLOW";
    PolicyAction["DENY"] = "DENY";
    PolicyAction["REVIEW"] = "REVIEW";
})(PolicyAction || (exports.PolicyAction = PolicyAction = {}));
/**
 * Risk level enumeration
 */
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["CRITICAL"] = "CRITICAL";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
/**
 * Helper function to create a data envelope
 */
function createDataEnvelope(data, options) {
    // GA ENFORCEMENT: Verify governance verdict is present
    if (!options.governanceVerdict) {
        throw new Error('GA ENFORCEMENT: GovernanceVerdict is required (SOC 2 CC6.1, CC7.2)');
    }
    const provenanceId = generateProvenanceId();
    const generatedAt = new Date();
    // Calculate data hash
    const dataString = JSON.stringify(data);
    const dataHash = (0, crypto_1.createHash)('sha256').update(dataString).digest('hex');
    // Validate confidence score
    if (options.confidence !== undefined) {
        if (options.confidence < 0 || options.confidence > 1) {
            throw new Error('Confidence score must be between 0 and 1');
        }
    }
    // Build provenance
    const provenance = {
        source: options.source,
        generatedAt,
        lineage: options.lineage || [],
        actor: options.actor,
        version: options.version,
        provenanceId,
    };
    return {
        data,
        provenance,
        confidence: options.confidence,
        isSimulated: options.isSimulated || false,
        governanceVerdict: options.governanceVerdict,
        classification: options.classification || DataClassification.INTERNAL,
        dataHash,
        warnings: options.warnings || [],
    };
}
/**
 * Helper function to validate a data envelope
 */
function validateDataEnvelope(envelope) {
    const errors = [];
    // Check required fields
    if (!envelope.provenance) {
        errors.push('Missing provenance metadata');
    }
    if (!envelope.provenance?.source) {
        errors.push('Missing provenance source');
    }
    if (!envelope.provenance?.generatedAt) {
        errors.push('Missing provenance timestamp');
    }
    if (!envelope.provenance?.provenanceId) {
        errors.push('Missing provenance ID');
    }
    if (envelope.isSimulated === undefined || envelope.isSimulated === null) {
        errors.push('Missing isSimulated flag');
    }
    if (!envelope.classification) {
        errors.push('Missing data classification');
    }
    if (!envelope.dataHash) {
        errors.push('Missing data hash');
    }
    if (!envelope.governanceVerdict) {
        errors.push('Missing governance verdict');
    }
    else {
        if (!envelope.governanceVerdict.verdictId) {
            errors.push('Missing verdict ID');
        }
        if (envelope.governanceVerdict.result === undefined) {
            errors.push('Missing governance result');
        }
        if (!envelope.governanceVerdict.decidedAt) {
            errors.push('Missing verdict decision time');
        }
        if (!envelope.governanceVerdict.evaluator) {
            errors.push('Missing verdict evaluator');
        }
        if (!envelope.governanceVerdict.policyId) {
            errors.push('Missing policy ID');
        }
    }
    // Validate confidence score if present
    if (envelope.confidence !== undefined && envelope.confidence !== null) {
        if (envelope.confidence < 0 || envelope.confidence > 1) {
            errors.push('Confidence score must be between 0 and 1');
        }
    }
    // Verify data hash
    const dataString = JSON.stringify(envelope.data);
    const expectedHash = (0, crypto_1.createHash)('sha256').update(dataString).digest('hex');
    if (envelope.dataHash !== expectedHash) {
        errors.push('Data hash mismatch - possible tampering detected');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Helper function to check if data requires high confidence
 */
function requiresHighConfidence(envelope, threshold = 0.8) {
    if (envelope.confidence === undefined || envelope.confidence === null) {
        // Non-AI data passes by default
        return true;
    }
    return envelope.confidence >= threshold;
}
/**
 * Helper function to generate a unique provenance ID
 */
function generateProvenanceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `prov-${timestamp}-${random}`;
}
/**
 * Helper function to add lineage node to envelope
 */
function addLineageNode(envelope, operation, inputs, actor, metadata) {
    const lineageNode = {
        id: `lineage-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        operation,
        inputs,
        timestamp: new Date(),
        actor,
        metadata,
    };
    return {
        ...envelope,
        provenance: {
            ...envelope.provenance,
            lineage: [...envelope.provenance.lineage, lineageNode],
        },
    };
}
/**
 * Helper to check if envelope contains AI-generated content
 */
function isAIGenerated(envelope) {
    return envelope.confidence !== undefined && envelope.confidence !== null;
}
/**
 * Helper to get confidence level category
 */
function getConfidenceLevel(confidence) {
    if (confidence === undefined || confidence === null) {
        return 'none';
    }
    if (confidence >= 0.8) {
        return 'high';
    }
    else if (confidence >= 0.5) {
        return 'medium';
    }
    else {
        return 'low';
    }
}
