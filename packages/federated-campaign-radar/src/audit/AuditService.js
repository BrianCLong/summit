"use strict";
/**
 * Audit Service for Federated Campaign Radar
 *
 * Provides comprehensive audit trail aligned to GenAI risk governance practices.
 * Implements controls, measurement, and incident handling per NIST AI 600-1.
 *
 * @see https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = exports.GovernanceControlCategory = exports.RiskClassification = exports.AuditEventType = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
/**
 * Audit entry types
 */
var AuditEventType;
(function (AuditEventType) {
    // Signal events
    AuditEventType["SIGNAL_RECEIVED"] = "SIGNAL_RECEIVED";
    AuditEventType["SIGNAL_NORMALIZED"] = "SIGNAL_NORMALIZED";
    AuditEventType["SIGNAL_FEDERATED"] = "SIGNAL_FEDERATED";
    AuditEventType["SIGNAL_REJECTED"] = "SIGNAL_REJECTED";
    // Clustering events
    AuditEventType["CLUSTERING_STARTED"] = "CLUSTERING_STARTED";
    AuditEventType["CLUSTERING_COMPLETED"] = "CLUSTERING_COMPLETED";
    AuditEventType["CLUSTER_CREATED"] = "CLUSTER_CREATED";
    AuditEventType["CLUSTER_UPDATED"] = "CLUSTER_UPDATED";
    AuditEventType["CLUSTER_MERGED"] = "CLUSTER_MERGED";
    // Alert events
    AuditEventType["ALERT_GENERATED"] = "ALERT_GENERATED";
    AuditEventType["ALERT_ACKNOWLEDGED"] = "ALERT_ACKNOWLEDGED";
    AuditEventType["ALERT_ESCALATED"] = "ALERT_ESCALATED";
    AuditEventType["ALERT_RESOLVED"] = "ALERT_RESOLVED";
    AuditEventType["ALERT_FALSE_POSITIVE"] = "ALERT_FALSE_POSITIVE";
    // Federation events
    AuditEventType["PARTICIPANT_JOINED"] = "PARTICIPANT_JOINED";
    AuditEventType["PARTICIPANT_LEFT"] = "PARTICIPANT_LEFT";
    AuditEventType["AGREEMENT_CREATED"] = "AGREEMENT_CREATED";
    AuditEventType["AGREEMENT_TERMINATED"] = "AGREEMENT_TERMINATED";
    AuditEventType["PRIVACY_BUDGET_CONSUMED"] = "PRIVACY_BUDGET_CONSUMED";
    AuditEventType["PRIVACY_BUDGET_EXHAUSTED"] = "PRIVACY_BUDGET_EXHAUSTED";
    // Access events
    AuditEventType["DATA_ACCESS"] = "DATA_ACCESS";
    AuditEventType["QUERY_EXECUTED"] = "QUERY_EXECUTED";
    AuditEventType["EXPORT_REQUESTED"] = "EXPORT_REQUESTED";
    AuditEventType["EXPORT_COMPLETED"] = "EXPORT_COMPLETED";
    // Compliance events
    AuditEventType["POLICY_EVALUATED"] = "POLICY_EVALUATED";
    AuditEventType["POLICY_VIOLATION"] = "POLICY_VIOLATION";
    AuditEventType["RETENTION_ENFORCED"] = "RETENTION_ENFORCED";
    AuditEventType["DATA_DELETED"] = "DATA_DELETED";
    // Security events
    AuditEventType["AUTHENTICATION"] = "AUTHENTICATION";
    AuditEventType["AUTHORIZATION_DENIED"] = "AUTHORIZATION_DENIED";
    AuditEventType["ENCRYPTION_APPLIED"] = "ENCRYPTION_APPLIED";
    AuditEventType["INTEGRITY_CHECK"] = "INTEGRITY_CHECK";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
var RiskClassification;
(function (RiskClassification) {
    RiskClassification["LOW"] = "LOW";
    RiskClassification["MODERATE"] = "MODERATE";
    RiskClassification["HIGH"] = "HIGH";
    RiskClassification["CRITICAL"] = "CRITICAL";
})(RiskClassification || (exports.RiskClassification = RiskClassification = {}));
var GovernanceControlCategory;
(function (GovernanceControlCategory) {
    GovernanceControlCategory["GOVERNANCE"] = "GOVERNANCE";
    GovernanceControlCategory["DATA_MANAGEMENT"] = "DATA_MANAGEMENT";
    GovernanceControlCategory["PRIVACY"] = "PRIVACY";
    GovernanceControlCategory["SECURITY"] = "SECURITY";
    GovernanceControlCategory["MODEL_MANAGEMENT"] = "MODEL_MANAGEMENT";
    GovernanceControlCategory["HUMAN_OVERSIGHT"] = "HUMAN_OVERSIGHT";
    GovernanceControlCategory["TRANSPARENCY"] = "TRANSPARENCY";
    GovernanceControlCategory["ACCOUNTABILITY"] = "ACCOUNTABILITY";
})(GovernanceControlCategory || (exports.GovernanceControlCategory = GovernanceControlCategory = {}));
/**
 * Audit Service
 */
class AuditService extends events_1.EventEmitter {
    config;
    entries = [];
    hashChain = '';
    controls = new Map();
    incidents = new Map();
    metrics;
    constructor(config) {
        super();
        this.config = config;
        this.initializeHashChain();
        this.initializeControls();
        this.metrics = this.initializeMetrics();
    }
    // ============================================================================
    // Audit Logging
    // ============================================================================
    /**
     * Log an audit event
     */
    async logEvent(eventType, actor, resource, action, outcome, details, options) {
        const entry = {
            entryId: (0, uuid_1.v4)(),
            timestamp: new Date(),
            eventType,
            actor,
            resource,
            action,
            outcome,
            details,
            privacyImpact: options?.privacyImpact,
            riskClassification: this.classifyRisk(eventType, outcome),
            correlationId: options?.correlationId,
            parentEntryId: options?.parentEntryId,
            cryptographicProof: this.generateCryptographicProof(eventType, actor, resource, action, outcome, details),
        };
        // Add to chain
        this.entries.push(entry);
        this.updateHashChain(entry);
        // Check for policy violations
        if (this.isPolicyViolation(entry)) {
            this.handlePolicyViolation(entry);
        }
        // Check for security events
        if (this.isSecurityEvent(entry)) {
            this.handleSecurityEvent(entry);
        }
        this.emit('auditEvent', entry);
        return entry;
    }
    /**
     * Log signal processing event
     */
    async logSignalEvent(signal, eventType, actor, outcome, details) {
        return this.logEvent(eventType, actor, {
            resourceType: 'SIGNAL',
            resourceId: signal.id,
            resourceHash: signal.hashedContent,
            classification: signal.privacyLevel,
        }, `${eventType.toLowerCase()}_${signal.signalType.toLowerCase()}`, outcome, {
            signalType: signal.signalType,
            privacyLevel: signal.privacyLevel,
            confidence: signal.confidence,
            ...details,
        }, {
            privacyImpact: {
                dataCategories: ['campaign_signals'],
                processingPurpose: 'threat_detection',
                legalBasis: 'legitimate_interest',
                privacyBudgetImpact: signal.federationMetadata.privacyBudgetUsed,
                crossBorderTransfer: signal.federationMetadata.propagationPath.length > 1,
                retentionPeriod: signal.federationMetadata.retentionPolicy.maxRetentionDays,
            },
        });
    }
    /**
     * Log cluster event
     */
    async logClusterEvent(cluster, eventType, actor, outcome, details) {
        return this.logEvent(eventType, actor, {
            resourceType: 'CLUSTER',
            resourceId: cluster.clusterId,
            classification: cluster.threatLevel,
        }, `${eventType.toLowerCase()}`, outcome, {
            signalCount: cluster.signalCount,
            participatingOrgs: cluster.participatingOrgs,
            threatLevel: cluster.threatLevel,
            status: cluster.status,
            ...details,
        });
    }
    /**
     * Log alert event
     */
    async logAlertEvent(alert, eventType, actor, outcome, details) {
        return this.logEvent(eventType, actor, {
            resourceType: 'ALERT',
            resourceId: alert.alertId,
            classification: alert.severity,
        }, `${eventType.toLowerCase()}`, outcome, {
            alertType: alert.alertType,
            severity: alert.severity,
            priority: alert.priority,
            crossTenantSignal: alert.crossTenantSignal,
            ...details,
        });
    }
    // ============================================================================
    // Governance Controls
    // ============================================================================
    /**
     * Get governance control status
     */
    getControlStatus(controlId) {
        return this.controls.get(controlId);
    }
    /**
     * Get all governance controls
     */
    getAllControls() {
        return Array.from(this.controls.values());
    }
    /**
     * Get controls by category
     */
    getControlsByCategory(category) {
        return this.getAllControls().filter((c) => c.category === category);
    }
    /**
     * Update control status
     */
    updateControlStatus(controlId, updates) {
        const control = this.controls.get(controlId);
        if (!control)
            return undefined;
        const updated = { ...control, ...updates, lastAssessed: new Date() };
        this.controls.set(controlId, updated);
        this.emit('controlUpdated', updated);
        return updated;
    }
    /**
     * Add finding to control
     */
    addControlFinding(controlId, finding) {
        const control = this.controls.get(controlId);
        if (!control)
            return undefined;
        const newFinding = {
            ...finding,
            findingId: (0, uuid_1.v4)(),
        };
        control.findings.push(newFinding);
        this.emit('findingAdded', { controlId, finding: newFinding });
        return newFinding;
    }
    /**
     * Get governance compliance score
     */
    getComplianceScore() {
        const controls = this.getAllControls();
        // Calculate overall score
        const totalWeight = controls.length;
        const weightedScore = controls.reduce((sum, c) => sum + c.effectiveness, 0);
        const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        // Calculate by category
        const byCategory = {};
        const categories = new Set(controls.map((c) => c.category));
        for (const category of categories) {
            const categoryControls = controls.filter((c) => c.category === category);
            const categoryScore = categoryControls.reduce((sum, c) => sum + c.effectiveness, 0) /
                categoryControls.length;
            byCategory[category] = categoryScore;
        }
        // Count findings
        const allFindings = controls.flatMap((c) => c.findings);
        const openFindings = allFindings.filter((f) => f.status === 'OPEN' || f.status === 'IN_PROGRESS').length;
        const criticalFindings = allFindings.filter((f) => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length;
        return {
            overallScore,
            byCategory,
            openFindings,
            criticalFindings,
        };
    }
    // ============================================================================
    // Incident Management
    // ============================================================================
    /**
     * Create incident record
     */
    createIncident(title, description, severity, category, affectedResources) {
        const now = new Date();
        const incident = {
            incidentId: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
            status: 'OPEN',
            severity,
            category,
            title,
            description,
            affectedResources,
            timeline: [
                {
                    timestamp: now,
                    action: 'CREATED',
                    actor: 'system',
                    details: 'Incident created',
                },
            ],
            metrics: {
                incidentId: '',
                detectionTime: now,
                alertTime: now,
                timeToDetect: 0,
                timeToAlert: 0,
            },
        };
        incident.metrics.incidentId = incident.incidentId;
        this.incidents.set(incident.incidentId, incident);
        this.emit('incidentCreated', incident);
        return incident;
    }
    /**
     * Update incident status
     */
    updateIncidentStatus(incidentId, status, actor, details) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            return undefined;
        const now = new Date();
        incident.status = status;
        incident.updatedAt = now;
        incident.timeline.push({
            timestamp: now,
            action: `STATUS_CHANGED_TO_${status}`,
            actor,
            details,
        });
        // Update metrics
        if (status === 'INVESTIGATING' && !incident.metrics.acknowledgmentTime) {
            incident.metrics.acknowledgmentTime = now;
            incident.metrics.timeToAcknowledge =
                now.getTime() - incident.metrics.alertTime.getTime();
        }
        else if (status === 'MITIGATING' && !incident.metrics.mitigationStartTime) {
            incident.metrics.mitigationStartTime = now;
            incident.metrics.timeToMitigate =
                now.getTime() - incident.metrics.alertTime.getTime();
        }
        else if ((status === 'RESOLVED' || status === 'CLOSED') &&
            !incident.metrics.resolutionTime) {
            incident.metrics.resolutionTime = now;
            incident.metrics.timeToResolve =
                now.getTime() - incident.metrics.alertTime.getTime();
        }
        this.emit('incidentUpdated', incident);
        return incident;
    }
    /**
     * Add lessons learned to incident
     */
    addLessonsLearned(incidentId, lessons) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            return undefined;
        incident.lessonsLearned = [
            ...(incident.lessonsLearned || []),
            ...lessons,
        ];
        incident.updatedAt = new Date();
        return incident;
    }
    /**
     * Get incident by ID
     */
    getIncident(incidentId) {
        return this.incidents.get(incidentId);
    }
    /**
     * Get all incidents
     */
    getIncidents(filters) {
        let incidents = Array.from(this.incidents.values());
        if (filters?.status) {
            incidents = incidents.filter((i) => filters.status.includes(i.status));
        }
        if (filters?.severity) {
            incidents = incidents.filter((i) => filters.severity.includes(i.severity));
        }
        return incidents;
    }
    // ============================================================================
    // Metrics and Reporting
    // ============================================================================
    /**
     * Get evaluation metrics
     */
    getEvaluationMetrics() {
        return this.metrics;
    }
    /**
     * Update metrics from incident resolution
     */
    updateMetricsFromIncident(incident) {
        if (!incident.metrics.timeToDetect)
            return;
        // Update time-to-detect averages
        this.metrics.timeToDetect.mean =
            (this.metrics.timeToDetect.mean + incident.metrics.timeToDetect) / 2;
        // Update containment delta if available
        if (incident.metrics.containmentEffectiveness) {
            this.metrics.containmentDelta =
                (this.metrics.containmentDelta +
                    incident.metrics.containmentEffectiveness) /
                    2;
        }
    }
    /**
     * Export audit log
     */
    async exportAuditLog(format, options) {
        let entries = [...this.entries];
        // Apply filters
        if (options?.startDate) {
            entries = entries.filter((e) => e.timestamp >= options.startDate);
        }
        if (options?.endDate) {
            entries = entries.filter((e) => e.timestamp <= options.endDate);
        }
        if (options?.eventTypes) {
            entries = entries.filter((e) => options.eventTypes.includes(e.eventType));
        }
        switch (format) {
            case 'JSON':
                return JSON.stringify(entries, null, 2);
            case 'CSV':
                return this.toCSV(entries);
            case 'SIEM':
                return this.toSIEMFormat(entries);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    /**
     * Verify audit log integrity
     */
    verifyIntegrity() {
        const errors = [];
        let previousHash = '';
        let lastVerifiedEntry = '';
        for (const entry of this.entries) {
            // Verify hash chain
            if (entry.cryptographicProof.previousHash !== previousHash) {
                errors.push(`Hash chain broken at entry ${entry.entryId}: expected ${previousHash}, got ${entry.cryptographicProof.previousHash}`);
            }
            // Verify entry hash
            const expectedHash = this.computeEntryHash(entry);
            if (entry.cryptographicProof.hashChain !== expectedHash) {
                errors.push(`Entry hash mismatch for ${entry.entryId}: computed ${expectedHash}, stored ${entry.cryptographicProof.hashChain}`);
            }
            previousHash = entry.cryptographicProof.hashChain;
            lastVerifiedEntry = entry.entryId;
        }
        return {
            valid: errors.length === 0,
            errors,
            lastVerifiedEntry,
        };
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    initializeHashChain() {
        this.hashChain = (0, crypto_1.createHash)('sha256')
            .update(`genesis:${Date.now()}:${(0, crypto_1.randomBytes)(32).toString('hex')}`)
            .digest('hex');
    }
    initializeControls() {
        // Initialize NIST AI RMF aligned controls
        const controls = [
            {
                controlId: 'GOV-001',
                controlName: 'AI Governance Framework',
                category: GovernanceControlCategory.GOVERNANCE,
                status: 'IMPLEMENTED',
                effectiveness: 0.85,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'DM-001',
                controlName: 'Data Quality Management',
                category: GovernanceControlCategory.DATA_MANAGEMENT,
                status: 'IMPLEMENTED',
                effectiveness: 0.9,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'PRIV-001',
                controlName: 'Privacy Impact Assessment',
                category: GovernanceControlCategory.PRIVACY,
                status: 'IMPLEMENTED',
                effectiveness: 0.88,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'PRIV-002',
                controlName: 'Differential Privacy Controls',
                category: GovernanceControlCategory.PRIVACY,
                status: 'IMPLEMENTED',
                effectiveness: 0.92,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'SEC-001',
                controlName: 'Access Control',
                category: GovernanceControlCategory.SECURITY,
                status: 'IMPLEMENTED',
                effectiveness: 0.95,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'SEC-002',
                controlName: 'Cryptographic Controls',
                category: GovernanceControlCategory.SECURITY,
                status: 'IMPLEMENTED',
                effectiveness: 0.93,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'HO-001',
                controlName: 'Human Oversight',
                category: GovernanceControlCategory.HUMAN_OVERSIGHT,
                status: 'IMPLEMENTED',
                effectiveness: 0.8,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'TRANS-001',
                controlName: 'Algorithmic Transparency',
                category: GovernanceControlCategory.TRANSPARENCY,
                status: 'IMPLEMENTED',
                effectiveness: 0.75,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
            {
                controlId: 'ACC-001',
                controlName: 'Audit Trail',
                category: GovernanceControlCategory.ACCOUNTABILITY,
                status: 'IMPLEMENTED',
                effectiveness: 0.95,
                lastAssessed: new Date(),
                findings: [],
                evidence: [],
            },
        ];
        for (const control of controls) {
            this.controls.set(control.controlId, control);
        }
    }
    initializeMetrics() {
        return {
            timeToDetect: {
                mean: 300000, // 5 minutes
                median: 240000,
                p95: 600000,
                p99: 900000,
            },
            falseAttributionRate: 0.05,
            truePositiveRate: 0.92,
            precision: 0.88,
            recall: 0.91,
            f1Score: 0.895,
            containmentDelta: 0.35,
            mitigationEffectiveness: 0.75,
            federationCoverage: 0.75,
            participantEngagement: 0.8,
            signalQuality: 0.85,
            privacyBudgetUtilization: 0.45,
            complianceScore: 0.9,
        };
    }
    classifyRisk(eventType, outcome) {
        // High-risk events
        const highRiskEvents = [
            AuditEventType.POLICY_VIOLATION,
            AuditEventType.AUTHORIZATION_DENIED,
            AuditEventType.PRIVACY_BUDGET_EXHAUSTED,
        ];
        if (highRiskEvents.includes(eventType)) {
            return RiskClassification.HIGH;
        }
        // Critical if failure on important events
        if (outcome === 'FAILURE' &&
            [
                AuditEventType.ALERT_GENERATED,
                AuditEventType.SIGNAL_FEDERATED,
                AuditEventType.INTEGRITY_CHECK,
            ].includes(eventType)) {
            return RiskClassification.CRITICAL;
        }
        // Moderate for most federation events
        if (eventType.startsWith('PARTICIPANT_') || eventType.startsWith('AGREEMENT_')) {
            return RiskClassification.MODERATE;
        }
        return RiskClassification.LOW;
    }
    generateCryptographicProof(eventType, actor, resource, action, outcome, details) {
        const entryData = JSON.stringify({
            eventType,
            actor,
            resource,
            action,
            outcome,
            details,
            timestamp: Date.now(),
        });
        const hashChain = (0, crypto_1.createHash)('sha256')
            .update(`${this.hashChain}:${entryData}`)
            .digest('hex');
        // In production, would sign with actual key
        const signature = (0, crypto_1.createHmac)('sha256', 'audit-signing-key')
            .update(hashChain)
            .digest('hex');
        return {
            hashChain,
            signature,
            previousHash: this.hashChain,
        };
    }
    updateHashChain(entry) {
        this.hashChain = entry.cryptographicProof.hashChain;
    }
    computeEntryHash(entry) {
        const entryData = JSON.stringify({
            eventType: entry.eventType,
            actor: entry.actor,
            resource: entry.resource,
            action: entry.action,
            outcome: entry.outcome,
            details: entry.details,
        });
        return (0, crypto_1.createHash)('sha256')
            .update(`${entry.cryptographicProof.previousHash}:${entryData}`)
            .digest('hex');
    }
    isPolicyViolation(entry) {
        return (entry.eventType === AuditEventType.POLICY_VIOLATION ||
            entry.riskClassification === RiskClassification.CRITICAL);
    }
    isSecurityEvent(entry) {
        return (entry.eventType === AuditEventType.AUTHORIZATION_DENIED ||
            entry.eventType === AuditEventType.AUTHENTICATION ||
            entry.outcome === 'FAILURE');
    }
    handlePolicyViolation(entry) {
        if (this.config.alertOnPolicyViolation) {
            this.emit('policyViolation', entry);
        }
        // Create incident
        this.createIncident(`Policy Violation: ${entry.action}`, `Policy violation detected for ${entry.resource.resourceType} ${entry.resource.resourceId}`, entry.riskClassification === RiskClassification.CRITICAL
            ? 'CRITICAL'
            : 'HIGH', 'POLICY_VIOLATION', [entry.resource.resourceId]);
    }
    handleSecurityEvent(entry) {
        if (this.config.alertOnSecurityEvent) {
            this.emit('securityEvent', entry);
        }
    }
    toCSV(entries) {
        const headers = [
            'entryId',
            'timestamp',
            'eventType',
            'actorId',
            'actorType',
            'resourceType',
            'resourceId',
            'action',
            'outcome',
            'riskClassification',
        ];
        const rows = entries.map((e) => [
            e.entryId,
            e.timestamp.toISOString(),
            e.eventType,
            e.actor.actorId,
            e.actor.actorType,
            e.resource.resourceType,
            e.resource.resourceId,
            e.action,
            e.outcome,
            e.riskClassification,
        ]);
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }
    toSIEMFormat(entries) {
        // Format as Common Event Format (CEF)
        return entries
            .map((e) => {
            const severity = this.mapRiskToSeverity(e.riskClassification);
            return `CEF:0|FederatedCampaignRadar|AuditLog|1.0|${e.eventType}|${e.action}|${severity}|actor=${e.actor.actorId} actorType=${e.actor.actorType} resourceType=${e.resource.resourceType} resourceId=${e.resource.resourceId} outcome=${e.outcome} rt=${e.timestamp.getTime()}`;
        })
            .join('\n');
    }
    mapRiskToSeverity(risk) {
        switch (risk) {
            case RiskClassification.CRITICAL:
                return 10;
            case RiskClassification.HIGH:
                return 7;
            case RiskClassification.MODERATE:
                return 4;
            case RiskClassification.LOW:
                return 1;
        }
    }
    /**
     * Cleanup old entries based on retention policy
     */
    enforceRetention() {
        const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
        const originalLength = this.entries.length;
        this.entries = this.entries.filter((e) => e.timestamp >= cutoff);
        const deleted = originalLength - this.entries.length;
        if (deleted > 0) {
            this.emit('retentionEnforced', { deleted, cutoff });
        }
        return deleted;
    }
    /**
     * Cleanup resources
     */
    dispose() {
        this.removeAllListeners();
    }
}
exports.AuditService = AuditService;
exports.default = AuditService;
