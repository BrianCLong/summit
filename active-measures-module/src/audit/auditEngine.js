"use strict";
/**
 * Comprehensive Audit Engine for Active Measures
 *
 * Implements immutable audit logging with cryptographic integrity,
 * blockchain-like hash chains, and comprehensive tracking of all
 * operations, decisions, and data access.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEngine = exports.EffortLevel = exports.RecommendationCategory = exports.ViolationStatus = exports.Severity = exports.ViolationType = exports.ConfidentialityLevel = exports.Priority = exports.ComplianceStatus = exports.OutcomeResult = exports.RiskLevel = exports.UrgencyLevel = exports.ResourceType = exports.AuditAction = exports.AuthMethod = exports.ClassificationLevel = exports.UserRole = exports.ActorType = void 0;
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
var ActorType;
(function (ActorType) {
    ActorType["HUMAN_OPERATOR"] = "human_operator";
    ActorType["AI_SYSTEM"] = "ai_system";
    ActorType["AUTOMATED_PROCESS"] = "automated_process";
    ActorType["EXTERNAL_SYSTEM"] = "external_system";
    ActorType["SERVICE_ACCOUNT"] = "service_account";
    ActorType["ADMIN_PROCESS"] = "admin_process";
})(ActorType || (exports.ActorType = ActorType = {}));
var UserRole;
(function (UserRole) {
    UserRole["ANALYST"] = "analyst";
    UserRole["OPERATOR"] = "operator";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["APPROVER"] = "approver";
    UserRole["ADMINISTRATOR"] = "administrator";
    UserRole["AUDITOR"] = "auditor";
    UserRole["SYSTEM_ADMIN"] = "system_admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var ClassificationLevel;
(function (ClassificationLevel) {
    ClassificationLevel["UNCLASSIFIED"] = "unclassified";
    ClassificationLevel["CONFIDENTIAL"] = "confidential";
    ClassificationLevel["SECRET"] = "secret";
    ClassificationLevel["TOP_SECRET"] = "top_secret";
    ClassificationLevel["SCI"] = "sci";
    ClassificationLevel["SAP"] = "sap";
})(ClassificationLevel || (exports.ClassificationLevel = ClassificationLevel = {}));
var AuthMethod;
(function (AuthMethod) {
    AuthMethod["PASSWORD"] = "password";
    AuthMethod["CERTIFICATE"] = "certificate";
    AuthMethod["BIOMETRIC"] = "biometric";
    AuthMethod["MULTI_FACTOR"] = "multi_factor";
    AuthMethod["SMART_CARD"] = "smart_card";
    AuthMethod["OAUTH"] = "oauth";
    AuthMethod["SAML"] = "saml";
})(AuthMethod || (exports.AuthMethod = AuthMethod = {}));
var AuditAction;
(function (AuditAction) {
    // Data Operations
    AuditAction["CREATE"] = "create";
    AuditAction["READ"] = "read";
    AuditAction["UPDATE"] = "update";
    AuditAction["DELETE"] = "delete";
    AuditAction["EXPORT"] = "export";
    AuditAction["IMPORT"] = "import";
    // Authentication & Authorization
    AuditAction["LOGIN"] = "login";
    AuditAction["LOGOUT"] = "logout";
    AuditAction["PERMISSION_GRANTED"] = "permission_granted";
    AuditAction["PERMISSION_DENIED"] = "permission_denied";
    AuditAction["ROLE_ASSUMED"] = "role_assumed";
    // Operations Management
    AuditAction["OPERATION_CREATED"] = "operation_created";
    AuditAction["OPERATION_UPDATED"] = "operation_updated";
    AuditAction["OPERATION_APPROVED"] = "operation_approved";
    AuditAction["OPERATION_REJECTED"] = "operation_rejected";
    AuditAction["OPERATION_EXECUTED"] = "operation_executed";
    AuditAction["OPERATION_PAUSED"] = "operation_paused";
    AuditAction["OPERATION_ABORTED"] = "operation_aborted";
    // Simulation & Analysis
    AuditAction["SIMULATION_STARTED"] = "simulation_started";
    AuditAction["SIMULATION_COMPLETED"] = "simulation_completed";
    AuditAction["MODEL_TRAINED"] = "model_trained";
    AuditAction["ANALYSIS_PERFORMED"] = "analysis_performed";
    // Security Events
    AuditAction["SECURITY_VIOLATION"] = "security_violation";
    AuditAction["ANOMALY_DETECTED"] = "anomaly_detected";
    AuditAction["INTRUSION_ATTEMPT"] = "intrusion_attempt";
    AuditAction["DATA_BREACH_SUSPECTED"] = "data_breach_suspected";
    // Administrative
    AuditAction["CONFIG_CHANGED"] = "config_changed";
    AuditAction["USER_CREATED"] = "user_created";
    AuditAction["USER_MODIFIED"] = "user_modified";
    AuditAction["BACKUP_PERFORMED"] = "backup_performed";
    AuditAction["SYSTEM_MAINTENANCE"] = "system_maintenance";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["OPERATION"] = "operation";
    ResourceType["MEASURE"] = "measure";
    ResourceType["SIMULATION"] = "simulation";
    ResourceType["USER_ACCOUNT"] = "user_account";
    ResourceType["CONFIGURATION"] = "configuration";
    ResourceType["DATA_FILE"] = "data_file";
    ResourceType["REPORT"] = "report";
    ResourceType["LOG_FILE"] = "log_file";
    ResourceType["CERTIFICATE"] = "certificate";
    ResourceType["CRYPTOGRAPHIC_KEY"] = "cryptographic_key";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var UrgencyLevel;
(function (UrgencyLevel) {
    UrgencyLevel["LOW"] = "low";
    UrgencyLevel["NORMAL"] = "normal";
    UrgencyLevel["HIGH"] = "high";
    UrgencyLevel["CRITICAL"] = "critical";
    UrgencyLevel["EMERGENCY"] = "emergency";
})(UrgencyLevel || (exports.UrgencyLevel = UrgencyLevel = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["MINIMAL"] = "minimal";
    RiskLevel["LOW"] = "low";
    RiskLevel["MODERATE"] = "moderate";
    RiskLevel["HIGH"] = "high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var OutcomeResult;
(function (OutcomeResult) {
    OutcomeResult["SUCCESS"] = "success";
    OutcomeResult["PARTIAL_SUCCESS"] = "partial_success";
    OutcomeResult["FAILURE"] = "failure";
    OutcomeResult["ERROR"] = "error";
    OutcomeResult["BLOCKED"] = "blocked";
    OutcomeResult["CANCELLED"] = "cancelled";
})(OutcomeResult || (exports.OutcomeResult = OutcomeResult = {}));
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["COMPLIANT"] = "compliant";
    ComplianceStatus["NON_COMPLIANT"] = "non_compliant";
    ComplianceStatus["UNDER_REVIEW"] = "under_review";
    ComplianceStatus["EXEMPTION_GRANTED"] = "exemption_granted";
})(ComplianceStatus || (exports.ComplianceStatus = ComplianceStatus = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (exports.Priority = Priority = {}));
var ConfidentialityLevel;
(function (ConfidentialityLevel) {
    ConfidentialityLevel["PUBLIC"] = "public";
    ConfidentialityLevel["INTERNAL"] = "internal";
    ConfidentialityLevel["CONFIDENTIAL"] = "confidential";
    ConfidentialityLevel["RESTRICTED"] = "restricted";
    ConfidentialityLevel["TOP_SECRET"] = "top_secret";
})(ConfidentialityLevel || (exports.ConfidentialityLevel = ConfidentialityLevel = {}));
var ViolationType;
(function (ViolationType) {
    ViolationType["UNAUTHORIZED_ACCESS"] = "unauthorized_access";
    ViolationType["DATA_EXFILTRATION"] = "data_exfiltration";
    ViolationType["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    ViolationType["POLICY_VIOLATION"] = "policy_violation";
    ViolationType["ANOMALOUS_BEHAVIOR"] = "anomalous_behavior";
    ViolationType["COMPLIANCE_BREACH"] = "compliance_breach";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
var Severity;
(function (Severity) {
    Severity["LOW"] = "low";
    Severity["MEDIUM"] = "medium";
    Severity["HIGH"] = "high";
    Severity["CRITICAL"] = "critical";
})(Severity || (exports.Severity = Severity = {}));
var ViolationStatus;
(function (ViolationStatus) {
    ViolationStatus["OPEN"] = "open";
    ViolationStatus["INVESTIGATING"] = "investigating";
    ViolationStatus["RESOLVED"] = "resolved";
    ViolationStatus["FALSE_POSITIVE"] = "false_positive";
})(ViolationStatus || (exports.ViolationStatus = ViolationStatus = {}));
var RecommendationCategory;
(function (RecommendationCategory) {
    RecommendationCategory["SECURITY_IMPROVEMENT"] = "security_improvement";
    RecommendationCategory["COMPLIANCE_ENHANCEMENT"] = "compliance_enhancement";
    RecommendationCategory["OPERATIONAL_EFFICIENCY"] = "operational_efficiency";
    RecommendationCategory["RISK_MITIGATION"] = "risk_mitigation";
})(RecommendationCategory || (exports.RecommendationCategory = RecommendationCategory = {}));
var EffortLevel;
(function (EffortLevel) {
    EffortLevel["LOW"] = "low";
    EffortLevel["MEDIUM"] = "medium";
    EffortLevel["HIGH"] = "high";
    EffortLevel["VERY_HIGH"] = "very_high";
})(EffortLevel || (exports.EffortLevel = EffortLevel = {}));
/**
 * Comprehensive Audit Engine
 */
class AuditEngine {
    config;
    auditStore = [];
    hashChain = [];
    currentBlockHeight = 0;
    signingKey;
    constructor(config, signingKey) {
        this.config = config;
        this.signingKey =
            signingKey || process.env.AUDIT_SIGNING_KEY || 'default-key';
        // Initialize genesis hash
        if (config.enableHashChains && this.hashChain.length === 0) {
            this.hashChain.push(this.generateGenesisHash());
        }
    }
    /**
     * Log an audit entry with full integrity checking
     */
    async logEntry(actor, action, resource, context, outcome, metadata) {
        const entry = {
            id: this.generateEntryId(),
            timestamp: new Date(),
            actor,
            action,
            resource,
            context,
            outcome,
            metadata: {
                version: '1.0',
                schema: 'active-measures-audit-v1',
                correlationId: this.generateCorrelationId(),
                traceId: this.generateTraceId(),
                priority: Priority.MEDIUM,
                confidentiality: this.determineConfidentiality(resource.classification),
                ...metadata,
            },
            integrity: await this.generateIntegrityData(entry),
        };
        // Validate entry before storing
        this.validateEntry(entry);
        // Add to hash chain if enabled
        if (this.config.enableHashChains) {
            entry.integrity.previousHash = this.getLastHash();
            entry.integrity.hash = this.calculateEntryHash(entry);
            entry.integrity.blockHeight = this.currentBlockHeight++;
            this.hashChain.push(entry.integrity.hash);
        }
        // Digital signature if enabled
        if (this.config.enableDigitalSigning) {
            entry.integrity.digitalSignature = this.signEntry(entry);
        }
        // Store entry
        await this.storeEntry(entry);
        // Check for security violations
        await this.checkForViolations(entry);
        return entry.id;
    }
    /**
     * Query audit entries with advanced filtering
     */
    async query(query) {
        const filteredEntries = this.auditStore.filter((entry) => this.matchesQuery(entry, query));
        // Sort results
        if (query.sortBy) {
            filteredEntries.sort((a, b) => {
                const aVal = this.getNestedValue(a, query.sortBy);
                const bVal = this.getNestedValue(b, query.sortBy);
                if (query.sortOrder === 'desc') {
                    return bVal > aVal ? 1 : -1;
                }
                return aVal > bVal ? 1 : -1;
            });
        }
        const totalCount = filteredEntries.length;
        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || 100;
        const paginatedEntries = filteredEntries.slice(offset, offset + limit);
        // Generate aggregations
        const aggregations = this.generateAggregations(filteredEntries);
        return {
            entries: paginatedEntries,
            totalCount,
            hasMore: offset + limit < totalCount,
            aggregations,
        };
    }
    /**
     * Generate comprehensive audit report
     */
    async generateReport(title, description, timeRange, filters, generatedBy) {
        const queryResult = await this.query({
            ...filters,
            timeRange,
            limit: 10000, // Get all entries for report
        });
        const summary = this.generateSummary(queryResult.entries);
        const violations = await this.detectViolations(queryResult.entries);
        const recommendations = this.generateRecommendations(summary, violations);
        return {
            id: this.generateReportId(),
            title,
            description,
            timeRange,
            filters,
            summary,
            violations,
            recommendations,
            generatedAt: new Date(),
            generatedBy,
        };
    }
    /**
     * Verify audit log integrity
     */
    async verifyIntegrity() {
        const issues = [];
        let verifiedEntries = 0;
        // Verify hash chain
        if (this.config.enableHashChains) {
            for (let i = 1; i < this.auditStore.length; i++) {
                const entry = this.auditStore[i];
                const previousEntry = this.auditStore[i - 1];
                if (entry.integrity.previousHash !== previousEntry.integrity.hash) {
                    issues.push(`Hash chain broken at entry ${entry.id}`);
                }
                const calculatedHash = this.calculateEntryHash(entry);
                if (entry.integrity.hash !== calculatedHash) {
                    issues.push(`Hash mismatch for entry ${entry.id}`);
                }
                else {
                    verifiedEntries++;
                }
            }
        }
        // Verify digital signatures
        if (this.config.enableDigitalSigning) {
            for (const entry of this.auditStore) {
                if (entry.integrity.digitalSignature) {
                    const isValid = this.verifySignature(entry);
                    if (!isValid) {
                        issues.push(`Invalid digital signature for entry ${entry.id}`);
                    }
                    else {
                        verifiedEntries++;
                    }
                }
            }
        }
        return {
            valid: issues.length === 0,
            issues,
            totalEntries: this.auditStore.length,
            verifiedEntries,
        };
    }
    /**
     * Export audit logs for external systems
     */
    async exportLogs(format, query, encryption) {
        const queryResult = await this.query(query || {});
        let exportData;
        switch (format) {
            case 'json':
                exportData = JSON.stringify(queryResult.entries, null, 2);
                break;
            case 'csv':
                exportData = this.convertToCSV(queryResult.entries);
                break;
            case 'xml':
                exportData = this.convertToXML(queryResult.entries);
                break;
            case 'siem':
                exportData = this.convertToSIEM(queryResult.entries);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
        let buffer = Buffer.from(exportData);
        if (encryption && this.config.encryptionEnabled) {
            buffer = this.encryptData(buffer);
        }
        return buffer;
    }
    /**
     * Archive old audit entries
     */
    async archiveEntries(beforeDate) {
        const entriesToArchive = this.auditStore.filter((entry) => entry.timestamp < beforeDate);
        // Export to archive format
        const archiveData = await this.exportLogs('json', {
            timeRange: { start: new Date(0), end: beforeDate },
        }, true);
        // Generate archive filename
        const archiveLocation = `audit-archive-${beforeDate.toISOString().split('T')[0]}.json.enc`;
        // Remove archived entries from active store
        this.auditStore = this.auditStore.filter((entry) => entry.timestamp >= beforeDate);
        // Log the archival operation
        await this.logEntry({
            id: 'system',
            type: ActorType.AUTOMATED_PROCESS,
            name: 'Archive Process',
            role: UserRole.SYSTEM_ADMIN,
            clearanceLevel: ClassificationLevel.TOP_SECRET,
            authentication: {
                method: AuthMethod.CERTIFICATE,
                strength: 1.0,
                mfaUsed: false,
                certificateUsed: true,
                biometricUsed: false,
            },
        }, AuditAction.BACKUP_PERFORMED, {
            id: archiveLocation,
            type: ResourceType.LOG_FILE,
            classification: ClassificationLevel.TOP_SECRET,
            size: archiveData.length,
        }, {
            businessJustification: 'Automated audit log archival for retention compliance',
            urgencyLevel: UrgencyLevel.LOW,
            riskLevel: RiskLevel.MINIMAL,
            complianceFramework: ['SOX', 'GDPR', 'NIST'],
            tags: ['archive', 'retention', 'compliance'],
        }, {
            result: OutcomeResult.SUCCESS,
            duration: 0,
            dataModified: true,
            recordsAffected: entriesToArchive.length,
            complianceStatus: ComplianceStatus.COMPLIANT,
        });
        return {
            archivedCount: entriesToArchive.length,
            archiveLocation,
        };
    }
    // Private helper methods
    generateEntryId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCorrelationId() {
        return `corr_${Math.random().toString(36).substr(2, 16)}`;
    }
    generateTraceId() {
        return `trace_${Math.random().toString(36).substr(2, 16)}`;
    }
    generateReportId() {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateGenesisHash() {
        return crypto
            .createHash('sha256')
            .update('ACTIVE_MEASURES_AUDIT_GENESIS')
            .digest('hex');
    }
    getLastHash() {
        return (this.hashChain[this.hashChain.length - 1] || this.generateGenesisHash());
    }
    calculateEntryHash(entry) {
        const entryData = {
            ...entry,
            integrity: {
                ...entry.integrity,
                hash: undefined,
                digitalSignature: undefined,
            },
        };
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(entryData))
            .digest('hex');
    }
    signEntry(entry) {
        const entryData = {
            ...entry,
            integrity: { ...entry.integrity, digitalSignature: undefined },
        };
        return jwt.sign(entryData, this.signingKey, { algorithm: 'HS256' });
    }
    verifySignature(entry) {
        if (!entry.integrity.digitalSignature) {
            return false;
        }
        try {
            const entryData = {
                ...entry,
                integrity: { ...entry.integrity, digitalSignature: undefined },
            };
            const decoded = jwt.verify(entry.integrity.digitalSignature, this.signingKey);
            return JSON.stringify(decoded) === JSON.stringify(entryData);
        }
        catch {
            return false;
        }
    }
    determineConfidentiality(classification) {
        const mapping = {
            [ClassificationLevel.UNCLASSIFIED]: ConfidentialityLevel.PUBLIC,
            [ClassificationLevel.CONFIDENTIAL]: ConfidentialityLevel.CONFIDENTIAL,
            [ClassificationLevel.SECRET]: ConfidentialityLevel.RESTRICTED,
            [ClassificationLevel.TOP_SECRET]: ConfidentialityLevel.TOP_SECRET,
            [ClassificationLevel.SCI]: ConfidentialityLevel.TOP_SECRET,
            [ClassificationLevel.SAP]: ConfidentialityLevel.TOP_SECRET,
        };
        return mapping[classification] || ConfidentialityLevel.INTERNAL;
    }
    async generateIntegrityData(entry) {
        return {
            hash: '',
            previousHash: '',
            digitalSignature: undefined,
            merkleRoot: undefined,
            blockHeight: this.currentBlockHeight,
            witnessSignatures: undefined,
        };
    }
    validateEntry(entry) {
        if (!entry.id || !entry.timestamp || !entry.actor || !entry.action) {
            throw new Error('Invalid audit entry: missing required fields');
        }
        if (entry.actor.clearanceLevel === undefined) {
            throw new Error('Invalid audit entry: actor clearance level required');
        }
        if (entry.resource.classification === undefined) {
            throw new Error('Invalid audit entry: resource classification required');
        }
    }
    async storeEntry(entry) {
        // In a real implementation, this would persist to a database
        this.auditStore.push(entry);
        // Optional: Compress old entries
        if (this.config.compressionEnabled && this.auditStore.length > 1000) {
            // Implement compression logic
        }
    }
    async checkForViolations(entry) {
        // Check for suspicious patterns
        if (entry.action === AuditAction.LOGIN &&
            entry.outcome.result === OutcomeResult.FAILURE) {
            // Multiple failed login attempts
            const recentFailures = this.auditStore.filter((e) => e.actor.id === entry.actor.id &&
                e.action === AuditAction.LOGIN &&
                e.outcome.result === OutcomeResult.FAILURE &&
                entry.timestamp.getTime() - e.timestamp.getTime() < 300000);
            if (recentFailures.length >= 3) {
                // Log security violation
                await this.logSecurityViolation({
                    type: ViolationType.UNAUTHORIZED_ACCESS,
                    severity: Severity.MEDIUM,
                    description: `Multiple failed login attempts for user ${entry.actor.id}`,
                    actor: entry.actor.id,
                    relatedEntries: [entry.id, ...recentFailures.map((e) => e.id)],
                });
            }
        }
        // Check for unauthorized access to classified resources
        if (entry.resource.classification === ClassificationLevel.TOP_SECRET &&
            entry.actor.clearanceLevel !== ClassificationLevel.TOP_SECRET) {
            await this.logSecurityViolation({
                type: ViolationType.PRIVILEGE_ESCALATION,
                severity: Severity.CRITICAL,
                description: `Unauthorized access to TOP SECRET resource by user with ${entry.actor.clearanceLevel} clearance`,
                actor: entry.actor.id,
                relatedEntries: [entry.id],
            });
        }
    }
    async logSecurityViolation(violation) {
        const securityViolation = {
            id: this.generateEntryId(),
            timestamp: new Date(),
            status: ViolationStatus.OPEN,
            ...violation,
        };
        // In a real implementation, this would be stored separately and trigger alerts
        console.warn('Security violation detected:', securityViolation);
    }
    matchesQuery(entry, query) {
        if (query.actorId && entry.actor.id !== query.actorId)
            return false;
        if (query.action && entry.action !== query.action)
            return false;
        if (query.resourceType && entry.resource.type !== query.resourceType)
            return false;
        if (query.classification &&
            entry.resource.classification !== query.classification)
            return false;
        if (query.operationId && entry.context.operationId !== query.operationId)
            return false;
        if (query.riskLevel && entry.context.riskLevel !== query.riskLevel)
            return false;
        if (query.complianceStatus &&
            entry.outcome.complianceStatus !== query.complianceStatus)
            return false;
        if (query.timeRange) {
            if (entry.timestamp < query.timeRange.start ||
                entry.timestamp > query.timeRange.end) {
                return false;
            }
        }
        return true;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }
    generateAggregations(entries) {
        const actionCounts = {};
        const actorCounts = {};
        const riskDistribution = {};
        const complianceDistribution = {};
        entries.forEach((entry) => {
            actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
            actorCounts[entry.actor.id] = (actorCounts[entry.actor.id] || 0) + 1;
            riskDistribution[entry.context.riskLevel] =
                (riskDistribution[entry.context.riskLevel] || 0) + 1;
            complianceDistribution[entry.outcome.complianceStatus] =
                (complianceDistribution[entry.outcome.complianceStatus] || 0) + 1;
        });
        // Generate time distribution (hourly buckets)
        const timeDistribution = this.generateTimeDistribution(entries);
        return {
            actionCounts,
            actorCounts,
            timeDistribution,
            riskDistribution,
            complianceDistribution,
        };
    }
    generateTimeDistribution(entries) {
        const hourlyBuckets = new Map();
        entries.forEach((entry) => {
            const hourBucket = new Date(entry.timestamp);
            hourBucket.setMinutes(0, 0, 0);
            const key = hourBucket.toISOString();
            hourlyBuckets.set(key, (hourlyBuckets.get(key) || 0) + 1);
        });
        return Array.from(hourlyBuckets.entries())
            .map(([time, count]) => ({ time: new Date(time), count }))
            .sort((a, b) => a.time.getTime() - b.time.getTime());
    }
    generateSummary(entries) {
        const uniqueActors = new Set(entries.map((e) => e.actor.id)).size;
        const uniqueOperations = new Set(entries.map((e) => e.context.operationId).filter(Boolean)).size;
        const successCount = entries.filter((e) => e.outcome.result === OutcomeResult.SUCCESS).length;
        const errorCount = entries.filter((e) => e.outcome.result === OutcomeResult.ERROR).length;
        const securityViolations = entries.filter((e) => e.action === AuditAction.SECURITY_VIOLATION ||
            e.action === AuditAction.INTRUSION_ATTEMPT).length;
        const complianceViolations = entries.filter((e) => e.outcome.complianceStatus === ComplianceStatus.NON_COMPLIANT).length;
        const totalDuration = entries.reduce((sum, e) => sum + e.outcome.duration, 0);
        const averageResponseTime = entries.length > 0 ? totalDuration / entries.length : 0;
        return {
            totalEntries: entries.length,
            uniqueActors,
            uniqueOperations,
            successRate: entries.length > 0 ? successCount / entries.length : 0,
            errorRate: entries.length > 0 ? errorCount / entries.length : 0,
            securityViolations,
            complianceViolations,
            averageResponseTime,
        };
    }
    async detectViolations(entries) {
        const violations = [];
        // Detect multiple failed logins
        const failedLogins = entries.filter((e) => e.action === AuditAction.LOGIN &&
            e.outcome.result === OutcomeResult.FAILURE);
        const userFailures = new Map();
        failedLogins.forEach((entry) => {
            const userId = entry.actor.id;
            if (!userFailures.has(userId)) {
                userFailures.set(userId, []);
            }
            userFailures.get(userId).push(entry);
        });
        userFailures.forEach((failures, userId) => {
            if (failures.length >= 5) {
                violations.push({
                    id: this.generateEntryId(),
                    type: ViolationType.UNAUTHORIZED_ACCESS,
                    severity: Severity.HIGH,
                    description: `User ${userId} had ${failures.length} failed login attempts`,
                    actor: userId,
                    timestamp: failures[failures.length - 1].timestamp,
                    relatedEntries: failures.map((f) => f.id),
                    status: ViolationStatus.OPEN,
                });
            }
        });
        return violations;
    }
    generateRecommendations(summary, violations) {
        const recommendations = [];
        if (summary.errorRate > 0.1) {
            recommendations.push({
                id: this.generateEntryId(),
                category: RecommendationCategory.OPERATIONAL_EFFICIENCY,
                priority: Priority.HIGH,
                title: 'High Error Rate Detected',
                description: `Error rate of ${(summary.errorRate * 100).toFixed(1)}% exceeds acceptable threshold of 10%`,
                impact: 'Reduced system reliability and user experience',
                effort: EffortLevel.MEDIUM,
                timeline: '2-4 weeks',
            });
        }
        if (violations.length > 0) {
            recommendations.push({
                id: this.generateEntryId(),
                category: RecommendationCategory.SECURITY_IMPROVEMENT,
                priority: Priority.CRITICAL,
                title: 'Security Violations Require Immediate Attention',
                description: `${violations.length} security violations detected`,
                impact: 'Potential security breach or compromise',
                effort: EffortLevel.HIGH,
                timeline: 'Immediate',
            });
        }
        if (summary.complianceViolations > 0) {
            recommendations.push({
                id: this.generateEntryId(),
                category: RecommendationCategory.COMPLIANCE_ENHANCEMENT,
                priority: Priority.HIGH,
                title: 'Compliance Violations Need Remediation',
                description: `${summary.complianceViolations} compliance violations identified`,
                impact: 'Regulatory penalties and audit findings',
                effort: EffortLevel.MEDIUM,
                timeline: '1-2 weeks',
            });
        }
        return recommendations;
    }
    // Export format converters
    convertToCSV(entries) {
        const headers = [
            'ID',
            'Timestamp',
            'Actor',
            'Action',
            'Resource',
            'Outcome',
            'Duration',
        ];
        const rows = entries.map((entry) => [
            entry.id,
            entry.timestamp.toISOString(),
            entry.actor.name,
            entry.action,
            entry.resource.id,
            entry.outcome.result,
            entry.outcome.duration.toString(),
        ]);
        return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }
    convertToXML(entries) {
        const xmlEntries = entries
            .map((entry) => `
      <entry id="${entry.id}">
        <timestamp>${entry.timestamp.toISOString()}</timestamp>
        <actor>${entry.actor.name}</actor>
        <action>${entry.action}</action>
        <resource>${entry.resource.id}</resource>
        <outcome>${entry.outcome.result}</outcome>
      </entry>
    `)
            .join('');
        return `<?xml version="1.0" encoding="UTF-8"?>
    <audit-log>
      ${xmlEntries}
    </audit-log>`;
    }
    convertToSIEM(entries) {
        return entries
            .map((entry) => JSON.stringify({
            timestamp: entry.timestamp.toISOString(),
            source: 'active-measures',
            event_type: entry.action,
            user: entry.actor.name,
            resource: entry.resource.id,
            outcome: entry.outcome.result,
            risk_level: entry.context.riskLevel,
            classification: entry.resource.classification,
        }))
            .join('\n');
    }
    encryptData(data) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(this.signingKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        return Buffer.concat([iv, encrypted]);
    }
    /**
     * Get audit statistics
     */
    getStatistics() {
        return {
            totalEntries: this.auditStore.length,
            oldestEntry: this.auditStore.length > 0 ? this.auditStore[0].timestamp : undefined,
            newestEntry: this.auditStore.length > 0
                ? this.auditStore[this.auditStore.length - 1].timestamp
                : undefined,
            integrityStatus: this.config.enableHashChains &&
                this.hashChain.length === this.auditStore.length + 1,
        };
    }
}
exports.AuditEngine = AuditEngine;
