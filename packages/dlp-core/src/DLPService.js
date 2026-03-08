"use strict";
/**
 * DLP Service
 *
 * Main service orchestrating content inspection, barrier enforcement,
 * redaction, and policy evaluation.
 *
 * @package dlp-core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLPService = void 0;
const DetectionEngine_1 = require("./DetectionEngine");
const RedactionEngine_1 = require("./RedactionEngine");
const BarrierEnforcer_1 = require("./BarrierEnforcer");
const crypto_1 = require("crypto");
class DLPService {
    detectionEngine;
    redactionEngine;
    barrierEnforcer;
    config;
    constructor(config) {
        this.config = {
            cacheEnabled: true,
            cacheTtl: 300000,
            asyncThreshold: 10 * 1024 * 1024, // 10MB
            samplingRate: 1.0,
            auditEnabled: true,
            ...config,
        };
        this.detectionEngine = new DetectionEngine_1.DetectionEngine();
        this.redactionEngine = new RedactionEngine_1.RedactionEngine();
        this.barrierEnforcer = new BarrierEnforcer_1.BarrierEnforcer({
            opaEndpoint: config.opaEndpoint,
        });
    }
    /**
     * Scan content for sensitive data and policy violations
     */
    async scan(request) {
        const startTime = Date.now();
        const auditEventId = this.generateAuditId();
        // Convert content to string if Buffer
        const contentString = typeof request.content === 'string'
            ? request.content
            : request.content.toString('utf-8');
        // Run detection
        const detection = await this.detectionEngine.detect(contentString, request.context);
        // Evaluate policy
        const policyResult = await this.evaluateContentPolicy(request, detection);
        // Generate audit event
        if (this.config.auditEnabled) {
            await this.logAuditEvent({
                eventId: auditEventId,
                timestamp: new Date().toISOString(),
                eventType: this.getEventType(request),
                actor: {
                    userId: request.context.actor?.id || 'unknown',
                    tenantId: request.context.actor?.tenantId || 'unknown',
                    roles: request.context.actor?.roles || [],
                },
                content: {
                    resourceType: request.contentType,
                    resourceId: request.metadata?.resourceId || 'unknown',
                    contentHash: this.hashContent(contentString),
                    size: contentString.length,
                    classification: detection.classification,
                },
                detection: {
                    patternsMatched: detection.detections.map((d) => ({
                        pattern: d.pattern,
                        confidence: d.confidence,
                        redacted: false,
                    })),
                    riskScore: detection.riskScore,
                },
                policy: {
                    rules: [],
                    finalDecision: policyResult.action,
                },
                outcome: {
                    action: policyResult.action,
                },
                auditChain: {
                    previousHash: '',
                    currentHash: '',
                },
            });
        }
        return {
            allowed: policyResult.allowed,
            action: policyResult.action,
            detection,
            violations: policyResult.violations,
            obligations: policyResult.obligations,
            auditEventId,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Check if data flow is allowed across information barriers
     */
    async checkBarrier(request) {
        return this.barrierEnforcer.check(request);
    }
    /**
     * Redact sensitive data from content
     */
    async redact(request) {
        return this.redactionEngine.redact(request);
    }
    /**
     * Evaluate content against DLP policies
     */
    async evaluateContentPolicy(request, detection) {
        const violations = [];
        const obligations = [];
        let action = 'ALLOW';
        // Check for high-risk data types
        const highRiskTypes = ['SSN', 'CREDIT_CARD', 'API_KEY', 'PASSWORD', 'PHI'];
        const hasHighRisk = detection.detections.some((d) => highRiskTypes.includes(d.type));
        // Check for moderate-risk data types
        const moderateRiskTypes = ['EMAIL', 'PHONE', 'DATE_OF_BIRTH', 'ADDRESS'];
        const hasModerateRisk = detection.detections.some((d) => moderateRiskTypes.includes(d.type));
        // Determine action based on context and detection
        const operation = request.context.purpose || 'READ';
        const isExport = ['EXPORT', 'DOWNLOAD', 'EXTERNAL_TRANSFER'].includes(operation);
        const isBulk = request.metadata?.recordCount > 100;
        if (hasHighRisk) {
            if (isExport) {
                action = 'BLOCK';
                violations.push({
                    type: 'HIGH_RISK_EXPORT',
                    message: 'Export of high-risk data types is blocked by default',
                    severity: 'CRITICAL',
                    remediation: 'Request an exception or redact sensitive data before export',
                });
            }
            else {
                action = 'REDACT';
                obligations.push({
                    type: 'REDACT',
                    config: { strategy: 'FULL_MASK' },
                });
            }
        }
        else if (hasModerateRisk) {
            if (isExport && isBulk) {
                action = 'REQUIRE_JUSTIFICATION';
                obligations.push({
                    type: 'JUSTIFICATION_REQUIRED',
                    message: 'Bulk export of PII requires justification',
                });
            }
            else if (isExport) {
                action = 'WARN';
                obligations.push({
                    type: 'USER_ACKNOWLEDGMENT',
                    message: 'You are exporting data that may contain personal information',
                    timeout: 30,
                });
            }
            else {
                action = 'ALLOW';
            }
        }
        // Add audit obligation for any detected sensitive data
        if (detection.hasDetections) {
            obligations.push({
                type: 'AUDIT_ENHANCED',
            });
        }
        return {
            allowed: !['BLOCK'].includes(action),
            action,
            violations,
            obligations,
        };
    }
    /**
     * Get event type based on request context
     */
    getEventType(request) {
        const purpose = request.context.purpose?.toUpperCase() || '';
        if (purpose.includes('EXPORT') || purpose.includes('DOWNLOAD')) {
            return 'EGRESS_SCAN';
        }
        if (purpose.includes('TRANSFER')) {
            return 'TRANSFER_SCAN';
        }
        return 'INGESTION_SCAN';
    }
    /**
     * Generate audit event ID
     */
    generateAuditId() {
        return `DLP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
    /**
     * Hash content for audit
     */
    hashContent(content) {
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    /**
     * Log audit event (placeholder - would integrate with audit service)
     */
    async logAuditEvent(event) {
        // In production, this would send to audit service
        if (process.env.NODE_ENV === 'development') {
            console.log('[DLP Audit]', JSON.stringify(event, null, 2));
        }
    }
}
exports.DLPService = DLPService;
exports.default = DLPService;
