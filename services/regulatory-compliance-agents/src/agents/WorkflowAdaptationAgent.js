"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowAdaptationAgent = void 0;
const events_1 = require("events");
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createAgentLogger)('WorkflowAdaptationAgent');
/**
 * WorkflowAdaptationAgent - Automatically generates and applies workflow
 * modifications, policy updates, and system configurations to maintain
 * compliance with new regulations.
 */
class WorkflowAdaptationAgent extends events_1.EventEmitter {
    pg;
    pendingAdaptations = new Map();
    autoApproveThreshold = 30; // Risk score below which auto-approval is allowed
    constructor(pgPool) {
        super();
        this.pg = pgPool || new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    /**
     * Generate adaptations based on impact assessment
     */
    async generateAdaptations(regulation, assessment) {
        logger.info({ regulationId: regulation.id }, 'Generating workflow adaptations');
        const adaptations = [];
        // Generate policy updates
        for (const gap of assessment.complianceGaps) {
            const policyAdaptation = await this.generatePolicyAdaptation(regulation, assessment, gap);
            if (policyAdaptation) {
                adaptations.push(policyAdaptation);
            }
        }
        // Generate workflow modifications
        for (const area of assessment.impactAreas) {
            const workflowAdaptation = await this.generateWorkflowAdaptation(regulation, assessment, area);
            if (workflowAdaptation) {
                adaptations.push(workflowAdaptation);
            }
        }
        // Generate notification rules
        const notificationAdaptation = this.generateNotificationAdaptation(regulation, assessment);
        adaptations.push(notificationAdaptation);
        // Store and emit
        for (const adaptation of adaptations) {
            this.pendingAdaptations.set(adaptation.id, adaptation);
            this.emitAdaptationCreated(regulation, adaptation);
        }
        logger.info({
            regulationId: regulation.id,
            adaptationCount: adaptations.length,
        }, 'Adaptations generated');
        return adaptations;
    }
    /**
     * Generate OPA policy adaptation
     */
    async generatePolicyAdaptation(regulation, assessment, gap) {
        const gapLower = gap.description.toLowerCase();
        // Generate appropriate OPA policy based on gap type
        let opaPolicy = null;
        if (gapLower.includes('consent')) {
            opaPolicy = this.generateConsentPolicy(regulation);
        }
        else if (gapLower.includes('retention')) {
            opaPolicy = this.generateRetentionPolicy(regulation);
        }
        else if (gapLower.includes('access') || gapLower.includes('authorization')) {
            opaPolicy = this.generateAccessPolicy(regulation);
        }
        else if (gapLower.includes('audit')) {
            opaPolicy = this.generateAuditPolicy(regulation);
        }
        if (!opaPolicy) {
            return null;
        }
        return {
            id: (0, uuid_1.v4)(),
            regulationId: regulation.id,
            assessmentId: assessment.id,
            adaptationType: 'policy_update',
            targetSystem: 'opa-policy-engine',
            changes: [{
                    changeType: 'add',
                    component: `policies/${opaPolicy.package}.rego`,
                    after: opaPolicy,
                    rationale: `Compliance requirement for ${regulation.title}: ${gap.description}`,
                }],
            status: assessment.riskScore < this.autoApproveThreshold ? 'approved' : 'pending',
            requiresApproval: assessment.riskScore >= this.autoApproveThreshold,
            createdAt: new Date(),
        };
    }
    /**
     * Generate consent management policy
     */
    generateConsentPolicy(regulation) {
        return {
            package: `compliance.consent.${regulation.jurisdiction.toLowerCase()}`,
            rules: [
                {
                    name: 'valid_consent',
                    body: `
            valid_consent {
              input.consent.granted == true
              input.consent.timestamp != null
              time.now_ns() - input.consent.timestamp < consent_validity_ns
              input.consent.purpose in allowed_purposes
            }

            consent_validity_ns = 31536000000000000  # 1 year in nanoseconds

            allowed_purposes = {"marketing", "analytics", "service_delivery", "legal_obligation"}
          `,
                },
                {
                    name: 'consent_required',
                    body: `
            consent_required {
              input.data_category in ["personal_data", "sensitive_data"]
              not input.legal_basis in ["legal_obligation", "vital_interests"]
            }
          `,
                },
            ],
        };
    }
    /**
     * Generate data retention policy
     */
    generateRetentionPolicy(regulation) {
        return {
            package: `compliance.retention.${regulation.jurisdiction.toLowerCase()}`,
            rules: [
                {
                    name: 'retention_compliant',
                    body: `
            retention_compliant {
              input.data_age_days <= max_retention_days[input.data_category]
            }

            max_retention_days = {
              "personal_data": 1095,      # 3 years
              "financial_data": 2555,      # 7 years
              "audit_logs": 2555,          # 7 years
              "marketing_data": 365,       # 1 year
              "session_data": 30,          # 30 days
            }
          `,
                },
                {
                    name: 'deletion_required',
                    body: `
            deletion_required {
              input.data_age_days > max_retention_days[input.data_category]
              not input.legal_hold
            }
          `,
                },
            ],
        };
    }
    /**
     * Generate access control policy
     */
    generateAccessPolicy(regulation) {
        return {
            package: `compliance.access.${regulation.jurisdiction.toLowerCase()}`,
            rules: [
                {
                    name: 'access_allowed',
                    body: `
            access_allowed {
              user_has_role
              purpose_is_valid
              data_classification_allowed
            }

            user_has_role {
              input.user.roles[_] == required_role[input.resource.type]
            }

            purpose_is_valid {
              input.purpose in allowed_purposes[input.resource.classification]
            }

            data_classification_allowed {
              input.user.clearance >= min_clearance[input.resource.classification]
            }

            required_role = {
              "personal_data": "data_handler",
              "sensitive_data": "data_admin",
              "financial_data": "finance_user",
            }

            allowed_purposes = {
              "personal_data": ["service_delivery", "support", "legal"],
              "sensitive_data": ["legal", "audit"],
            }

            min_clearance = {
              "public": 0,
              "internal": 1,
              "confidential": 2,
              "restricted": 3,
            }
          `,
                },
            ],
        };
    }
    /**
     * Generate audit policy
     */
    generateAuditPolicy(regulation) {
        return {
            package: `compliance.audit.${regulation.jurisdiction.toLowerCase()}`,
            rules: [
                {
                    name: 'audit_required',
                    body: `
            audit_required {
              input.action in auditable_actions
            }

            audit_required {
              input.resource.classification in ["confidential", "restricted", "sensitive_data"]
            }

            auditable_actions = {
              "read", "write", "delete", "export", "share",
              "access_grant", "access_revoke", "config_change"
            }
          `,
                },
                {
                    name: 'audit_entry_valid',
                    body: `
            audit_entry_valid {
              input.audit.timestamp != null
              input.audit.user_id != null
              input.audit.action != null
              input.audit.resource_id != null
              input.audit.outcome in ["success", "failure", "denied"]
            }
          `,
                },
            ],
        };
    }
    /**
     * Generate workflow adaptation
     */
    async generateWorkflowAdaptation(regulation, assessment, area) {
        if (area.area !== 'Business Workflows') {
            return null;
        }
        const workflowChanges = area.requiredActions.map(action => ({
            changeType: 'modify',
            component: `workflows/${area.affectedSystems[0]?.replace(/\s+/g, '_').toLowerCase() || 'default'}`,
            after: {
                step: {
                    type: 'compliance_checkpoint',
                    name: `compliance_check_${regulation.jurisdiction.toLowerCase()}`,
                    action,
                    regulation: regulation.id,
                },
            },
            rationale: `Add compliance checkpoint: ${action}`,
        }));
        return {
            id: (0, uuid_1.v4)(),
            regulationId: regulation.id,
            assessmentId: assessment.id,
            adaptationType: 'workflow_modification',
            targetSystem: 'workflow-engine',
            changes: workflowChanges,
            status: 'pending',
            requiresApproval: true,
            createdAt: new Date(),
        };
    }
    /**
     * Generate notification rule adaptation
     */
    generateNotificationAdaptation(regulation, assessment) {
        const notificationRule = {
            id: (0, uuid_1.v4)(),
            name: `${regulation.jurisdiction}_compliance_notification`,
            trigger: 'compliance_event',
            conditions: {
                regulation_id: regulation.id,
                severity: ['critical', 'high'],
            },
            actions: [
                {
                    type: 'email',
                    recipients: ['compliance-team@company.com'],
                    template: 'compliance_alert',
                },
                {
                    type: 'slack',
                    channel: '#compliance-alerts',
                    mention: assessment.severity === 'critical' ? '@compliance-lead' : undefined,
                },
            ],
        };
        return {
            id: (0, uuid_1.v4)(),
            regulationId: regulation.id,
            assessmentId: assessment.id,
            adaptationType: 'notification_rule',
            targetSystem: 'notification-service',
            changes: [{
                    changeType: 'add',
                    component: 'notification-rules',
                    after: notificationRule,
                    rationale: `Automated alerting for ${regulation.title} compliance events`,
                }],
            status: 'approved', // Notifications auto-approved
            requiresApproval: false,
            createdAt: new Date(),
        };
    }
    /**
     * Apply approved adaptations
     */
    async applyAdaptation(adaptationId) {
        const adaptation = this.pendingAdaptations.get(adaptationId);
        if (!adaptation) {
            logger.warn({ adaptationId }, 'Adaptation not found');
            return false;
        }
        if (adaptation.status !== 'approved') {
            logger.warn({ adaptationId, status: adaptation.status }, 'Adaptation not approved');
            return false;
        }
        try {
            logger.info({ adaptationId, type: adaptation.adaptationType }, 'Applying adaptation');
            // Apply based on type
            switch (adaptation.adaptationType) {
                case 'policy_update':
                    await this.applyPolicyUpdate(adaptation);
                    break;
                case 'workflow_modification':
                    await this.applyWorkflowModification(adaptation);
                    break;
                case 'notification_rule':
                    await this.applyNotificationRule(adaptation);
                    break;
                default:
                    logger.warn({ type: adaptation.adaptationType }, 'Unknown adaptation type');
            }
            adaptation.status = 'applied';
            adaptation.appliedAt = new Date();
            logger.info({ adaptationId }, 'Adaptation applied successfully');
            return true;
        }
        catch (error) {
            adaptation.status = 'failed';
            logger.error({ adaptationId, error }, 'Failed to apply adaptation');
            return false;
        }
    }
    /**
     * Apply policy update to OPA
     */
    async applyPolicyUpdate(adaptation) {
        // In production, this would push to OPA bundle server
        for (const change of adaptation.changes) {
            logger.info({
                component: change.component,
                changeType: change.changeType,
            }, 'Applying policy update');
            // Store policy in database for OPA bundle generation
            await this.pg.query(`INSERT INTO compliance_policies (id, regulation_id, policy_path, policy_content, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (policy_path) DO UPDATE SET policy_content = $4, updated_at = NOW()`, [(0, uuid_1.v4)(), adaptation.regulationId, change.component, JSON.stringify(change.after)]).catch(() => {
                // Table might not exist in dev
                logger.debug('Policy storage skipped - table not available');
            });
        }
    }
    /**
     * Apply workflow modification
     */
    async applyWorkflowModification(adaptation) {
        for (const change of adaptation.changes) {
            logger.info({
                component: change.component,
                changeType: change.changeType,
            }, 'Applying workflow modification');
            // Store workflow change for workflow engine
            await this.pg.query(`INSERT INTO workflow_adaptations (id, regulation_id, workflow_path, changes, created_at)
         VALUES ($1, $2, $3, $4, NOW())`, [(0, uuid_1.v4)(), adaptation.regulationId, change.component, JSON.stringify(change.after)]).catch(() => {
                logger.debug('Workflow storage skipped - table not available');
            });
        }
    }
    /**
     * Apply notification rule
     */
    async applyNotificationRule(adaptation) {
        for (const change of adaptation.changes) {
            logger.info({ component: change.component }, 'Applying notification rule');
            await this.pg.query(`INSERT INTO notification_rules (id, regulation_id, rule_config, created_at)
         VALUES ($1, $2, $3, NOW())`, [(0, uuid_1.v4)(), adaptation.regulationId, JSON.stringify(change.after)]).catch(() => {
                logger.debug('Notification rule storage skipped - table not available');
            });
        }
    }
    /**
     * Approve an adaptation
     */
    approveAdaptation(adaptationId, approvedBy) {
        const adaptation = this.pendingAdaptations.get(adaptationId);
        if (!adaptation || adaptation.status !== 'pending') {
            return false;
        }
        adaptation.status = 'approved';
        adaptation.approvedBy = approvedBy;
        logger.info({ adaptationId, approvedBy }, 'Adaptation approved');
        return true;
    }
    /**
     * Emit adaptation created event
     */
    emitAdaptationCreated(regulation, adaptation) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: 'adaptation_created',
            payload: { regulation, adaptation },
            timestamp: new Date(),
            agentId: 'WorkflowAdaptationAgent',
        };
        this.emit('adaptation_created', event);
    }
    /**
     * Get pending adaptations
     */
    getPendingAdaptations() {
        return Array.from(this.pendingAdaptations.values())
            .filter(a => a.status === 'pending');
    }
}
exports.WorkflowAdaptationAgent = WorkflowAdaptationAgent;
