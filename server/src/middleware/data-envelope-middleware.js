"use strict";
// @ts-nocheck
/**
 * Data Envelope Middleware for REST API
 *
 * Wraps REST API responses in DataEnvelope with provenance and integrity metadata
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataEnvelopeMiddleware = dataEnvelopeMiddleware;
exports.validateEnvelopeMiddleware = validateEnvelopeMiddleware;
exports.enforceConfidenceThreshold = enforceConfidenceThreshold;
exports.rejectSimulatedDataMiddleware = rejectSimulatedDataMiddleware;
exports.auditProvenanceMiddleware = auditProvenanceMiddleware;
const data_envelope_js_1 = require("../types/data-envelope.js");
const crypto_1 = require("crypto");
/**
 * Middleware to wrap responses in DataEnvelope
 */
function dataEnvelopeMiddleware(config) {
    return (req, res, next) => {
        // Check if path should be excluded
        if (config.excludePaths?.some((path) => req.path.startsWith(path))) {
            return next();
        }
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json method to wrap response
        res.json = function (data) {
            // Don't wrap if already wrapped
            if (data && data.provenance && data.dataHash) {
                return originalJson(data);
            }
            // Extract metadata from request
            const userId = req.userId || req.user?.id || 'anonymous';
            const tenantId = req.tenantId || req.user?.tenantId;
            // Determine if this is AI-generated content
            const isAIEndpoint = req.path.includes('/ai/') ||
                req.path.includes('/copilot/') ||
                req.path.includes('/hypothesis') ||
                req.path.includes('/narrative') ||
                req.path.includes('/risk');
            const confidence = isAIEndpoint && data.confidence ? data.confidence : undefined;
            // Determine classification based on path
            const classification = determineClassification(req.path, config.defaultClassification);
            // Create envelope
            const envelope = (0, data_envelope_js_1.createDataEnvelope)(data, {
                source: config.source,
                actor: userId,
                version: config.version,
                confidence,
                isSimulated: config.simulationMode || false,
                classification,
                lineage: [
                    {
                        id: (0, crypto_1.randomUUID)(),
                        operation: `${req.method} ${req.path}`,
                        inputs: Object.keys(req.body || {}),
                        timestamp: new Date(),
                        actor: userId,
                        metadata: {
                            method: req.method,
                            path: req.path,
                            tenantId,
                            requestId: req.requestId || (0, crypto_1.randomUUID)(),
                        },
                    },
                ],
                warnings: [],
            });
            // Add response header with envelope metadata
            res.setHeader('X-Data-Provenance-Id', envelope.provenance.provenanceId);
            res.setHeader('X-Data-Hash', envelope.dataHash);
            res.setHeader('X-Is-Simulated', envelope.isSimulated.toString());
            if (envelope.confidence !== undefined) {
                res.setHeader('X-AI-Confidence', envelope.confidence.toString());
            }
            return originalJson(envelope);
        };
        next();
    };
}
/**
 * Determine data classification based on path
 */
function determineClassification(path, defaultClassification) {
    // Highly restricted paths
    if (path.includes('/admin/') || path.includes('/security/')) {
        return data_envelope_js_1.DataClassification.HIGHLY_RESTRICTED;
    }
    // Restricted paths
    if (path.includes('/risk/') || path.includes('/pii/') || path.includes('/financial/')) {
        return data_envelope_js_1.DataClassification.RESTRICTED;
    }
    // Confidential paths
    if (path.includes('/investigation/') ||
        path.includes('/case/') ||
        path.includes('/intelligence/')) {
        return data_envelope_js_1.DataClassification.CONFIDENTIAL;
    }
    // Internal paths
    if (path.includes('/api/')) {
        return data_envelope_js_1.DataClassification.INTERNAL;
    }
    // Public paths
    if (path.includes('/public/') || path.includes('/health')) {
        return data_envelope_js_1.DataClassification.PUBLIC;
    }
    return defaultClassification || data_envelope_js_1.DataClassification.INTERNAL;
}
/**
 * Express middleware to validate incoming envelopes (for inter-service calls)
 */
function validateEnvelopeMiddleware(req, res, next) {
    // Only validate if content-type is JSON and body exists
    if (!req.body || !req.is('application/json')) {
        return next();
    }
    // Check if body is an envelope
    const possibleEnvelope = req.body;
    if (possibleEnvelope.provenance && possibleEnvelope.dataHash) {
        // Validate the envelope
        const { validateDataEnvelope } = require('../types/data-envelope');
        const validation = validateDataEnvelope(possibleEnvelope);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid data envelope',
                errors: validation.errors,
                code: 'ENVELOPE_VALIDATION_FAILED',
            });
        }
        // Attach validated envelope to request for downstream use
        req.envelope = possibleEnvelope;
        req.envelopeData = possibleEnvelope.data;
    }
    next();
}
/**
 * Middleware to enforce confidence thresholds
 */
function enforceConfidenceThreshold(threshold = 0.7) {
    return (req, res, next) => {
        const envelope = req.envelope;
        if (!envelope) {
            return next();
        }
        // Check if AI-generated content meets confidence threshold
        if (envelope.confidence !== undefined && envelope.confidence < threshold) {
            return res.status(422).json({
                error: 'AI confidence below acceptable threshold',
                confidence: envelope.confidence,
                threshold,
                code: 'LOW_CONFIDENCE',
                recommendation: 'Manual review required',
            });
        }
        next();
    };
}
/**
 * Middleware to reject simulated data in production
 */
function rejectSimulatedDataMiddleware(req, res, next) {
    const envelope = req.envelope;
    if (!envelope) {
        return next();
    }
    // Check if this is simulated data
    if (envelope.isSimulated && process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'Simulated data not allowed in production',
            code: 'SIMULATED_DATA_REJECTED',
            provenanceId: envelope.provenance.provenanceId,
        });
    }
    next();
}
/**
 * Middleware to log provenance for audit trail
 */
function auditProvenanceMiddleware(req, res, next) {
    const envelope = req.envelope;
    if (envelope) {
        // Log to audit system
        const auditEntry = {
            timestamp: new Date(),
            provenanceId: envelope.provenance.provenanceId,
            source: envelope.provenance.source,
            actor: envelope.provenance.actor,
            operation: req.envelope?.provenance?.lineage?.[0]?.operation,
            classification: envelope.classification,
            confidence: envelope.confidence,
            isSimulated: envelope.isSimulated,
            dataHash: envelope.dataHash,
            requestPath: req.path,
            method: req.method,
            userId: req.userId,
            tenantId: req.tenantId,
        };
        // Log to audit log (replace with actual audit logging system)
        console.log('[AUDIT] Data Envelope Processed:', JSON.stringify(auditEntry));
    }
    next();
}
