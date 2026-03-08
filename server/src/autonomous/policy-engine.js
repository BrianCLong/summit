"use strict";
/**
 * Policy Engine - OPA/Rego Integration for Autonomous Operations
 * Addresses P0 safety gaps with comprehensive policy evaluation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POLICY_RULES = exports.PolicyEngine = void 0;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
// Validation schemas
const PolicyContextSchema = zod_1.z.object({
    user: zod_1.z.object({
        id: zod_1.z.string(),
        roles: zod_1.z.array(zod_1.z.string()),
        tenantId: zod_1.z.string(),
        permissions: zod_1.z.array(zod_1.z.string()),
    }),
    resource: zod_1.z.object({
        type: zod_1.z.string(),
        id: zod_1.z.string(),
        tenantId: zod_1.z.string(),
        sensitivity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    }),
    action: zod_1.z.object({
        type: zod_1.z.string(),
        category: zod_1.z.enum(['read', 'write', 'deploy', 'rollback']),
        autonomy: zod_1.z.number().int().min(0).max(5),
        budgets: zod_1.z
            .object({
            tokens: zod_1.z.number().positive(),
            usd: zod_1.z.number().positive(),
            timeMinutes: zod_1.z.number().positive(),
        })
            .optional(),
    }),
    environment: zod_1.z.object({
        name: zod_1.z.string(),
        production: zod_1.z.boolean(),
        region: zod_1.z.string(),
    }),
    time: zod_1.z.object({
        timestamp: zod_1.z.number(),
        timezone: zod_1.z.string(),
        businessHours: zod_1.z.boolean(),
    }),
});
class PolicyEngine {
    opaUrl;
    db;
    logger;
    policyVersion;
    cache = new Map();
    policyCards = [];
    constructor(opaUrl, db, logger, policyVersion = '1.0.0') {
        this.opaUrl = opaUrl;
        this.db = db;
        this.logger = logger;
        this.policyVersion = policyVersion;
        // Load Policy Cards
        this.loadPolicyCards();
        // Clean cache periodically
        setInterval(() => this.cleanCache(), 60000);
    }
    loadPolicyCards() {
        try {
            const cardsDir = path_1.default.join(process.cwd(), 'policy/cards');
            if (fs_1.default.existsSync(cardsDir)) {
                const files = fs_1.default.readdirSync(cardsDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const content = fs_1.default.readFileSync(path_1.default.join(cardsDir, file), 'utf-8');
                        this.policyCards.push(JSON.parse(content));
                    }
                }
                this.logger.info({ count: this.policyCards.length }, 'Loaded policy cards');
            }
        }
        catch (e) {
            this.logger.warn({ error: e.message }, 'Failed to load policy cards');
        }
    }
    checkPolicyCards(context) {
        for (const card of this.policyCards) {
            if (card.effect === 'deny') {
                // Check conditions
                const match = card.conditions.all &&
                    card.conditions.all.every((cond) => {
                        const factValue = this.resolveFact(context, cond.fact);
                        return this.evaluateCondition(factValue, cond.operator, cond.value);
                    });
                if (match) {
                    return {
                        allowed: false,
                        reason: card.reason,
                        requiresApproval: true,
                        riskScore: 90,
                    };
                }
            }
        }
        return null;
    }
    resolveFact(context, factPath) {
        return factPath.split('.').reduce((obj, key) => obj && obj[key], context);
    }
    evaluateCondition(actual, operator, expected) {
        switch (operator) {
            case 'equal':
                return actual === expected;
            case 'greaterThan':
                return actual > expected;
            default:
                return false;
        }
    }
    /**
     * Main policy evaluation method
     */
    async evaluate(subject, action, resource, context) {
        try {
            // Build full context
            const policyContext = await this.buildPolicyContext(subject, action, resource, context);
            // Validate context
            const validation = PolicyContextSchema.safeParse(policyContext);
            if (!validation.success) {
                this.logger.warn({
                    subject,
                    action,
                    resource,
                    error: validation.error,
                }, 'Invalid policy context');
                return { allowed: false, reason: 'Invalid policy context' };
            }
            // Check cache first
            const cacheKey = this.getCacheKey(policyContext);
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                this.logger.debug({ subject, action, resource }, 'Policy decision from cache');
                return cached.decision;
            }
            // Check database cache
            const dbCached = await this.getFromDbCache(cacheKey);
            if (dbCached) {
                this.cache.set(cacheKey, {
                    decision: dbCached,
                    expires: Date.now() + 300000,
                }); // 5 min
                return dbCached;
            }
            // Evaluate with OPA
            const decision = await this.evaluateWithOpa(policyContext);
            // Calculate risk score
            const riskScore = this.calculateRiskScore(policyContext, decision);
            decision.riskScore = riskScore;
            // Determine if approval is required
            decision.requiresApproval = this.requiresApproval(policyContext, decision, riskScore);
            // Cache the decision
            await this.cacheDecision(cacheKey, decision);
            // Log the decision
            await this.logPolicyDecision(subject, action, resource, policyContext, decision);
            return decision;
        }
        catch (error) {
            this.logger.error({
                subject,
                action,
                resource,
                error: error.message,
            }, 'Policy evaluation failed');
            // Fail-safe: deny by default
            return {
                allowed: false,
                reason: 'Policy evaluation error',
                requiresApproval: true,
                riskScore: 100,
            };
        }
    }
    /**
     * Batch policy evaluation for performance
     */
    async evaluateBatch(requests) {
        const results = await Promise.allSettled(requests.map((req) => this.evaluate(req.subject, req.action, req.resource, req.context)));
        return results.map((result) => result.status === 'fulfilled'
            ? result.value
            : {
                allowed: false,
                reason: 'Batch evaluation error',
                requiresApproval: true,
            });
    }
    /**
     * Build comprehensive policy context
     */
    async buildPolicyContext(subject, action, resource, context) {
        // Get user details (would typically come from auth service)
        const user = await this.getUserDetails(subject);
        // Parse resource details
        const [resourceType, resourceId] = resource.split(':');
        const resourceDetails = await this.getResourceDetails(resourceType, resourceId);
        // Determine environment
        const environment = this.getEnvironmentContext();
        // Build time context
        const now = new Date();
        const timeContext = {
            timestamp: now.getTime(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            businessHours: this.isBusinessHours(now),
        };
        return {
            user: {
                id: subject,
                roles: user.roles || [],
                tenantId: user.tenantId || context.tenantId || 'default',
                permissions: user.permissions || [],
            },
            resource: {
                type: resourceType,
                id: resourceId,
                tenantId: resourceDetails.tenantId || context.tenantId || 'default',
                sensitivity: resourceDetails.sensitivity || 'medium',
            },
            action: {
                type: action,
                category: this.getActionCategory(action),
                autonomy: context.autonomy || 0,
                budgets: context.budgets,
            },
            environment,
            time: timeContext,
        };
    }
    /**
     * Evaluate policy with OPA
     */
    async evaluateWithOpa(context) {
        try {
            const response = await axios_1.default.post(`${this.opaUrl}/v1/data/autonomous/allow`, {
                input: context,
            }, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const result = response.data.result;
            return {
                allowed: result.allow === true,
                reason: result.reason,
                conditions: result.conditions || {},
            };
        }
        catch (error) {
            this.logger.error({ error: error.message }, 'OPA evaluation failed');
            // Fallback to local policy evaluation
            return this.evaluateLocalPolicy(context);
        }
    }
    /**
     * Fallback local policy evaluation
     */
    evaluateLocalPolicy(context) {
        // Check Policy Cards first
        const cardDecision = this.checkPolicyCards(context);
        if (cardDecision)
            return cardDecision;
        const { user, resource, action, environment } = context;
        // Production protection
        if (environment.production && action.category !== 'read') {
            if (action.autonomy >= 4) {
                return {
                    allowed: false,
                    reason: 'High autonomy operations not allowed in production',
                    requiresApproval: true,
                };
            }
        }
        // Deployment restrictions
        if (action.category === 'deploy') {
            if (!user.permissions.includes('deploy')) {
                return {
                    allowed: false,
                    reason: 'User lacks deployment permissions',
                    requiresApproval: true,
                };
            }
        }
        // Resource sensitivity checks
        if (resource.sensitivity === 'critical') {
            if (action.autonomy >= 3) {
                return {
                    allowed: false,
                    reason: 'Critical resources require manual approval',
                    requiresApproval: true,
                };
            }
        }
        // Budget checks
        if (action.budgets) {
            if (action.budgets.usd > 100) {
                return {
                    allowed: false,
                    reason: 'Budget exceeds limits',
                    requiresApproval: true,
                };
            }
        }
        // Default allow for read operations
        if (action.category === 'read') {
            return { allowed: true };
        }
        // Default deny with approval required
        return {
            allowed: action.autonomy === 0, // Only allow manual mode by default
            reason: 'Default policy requires manual approval',
            requiresApproval: true,
        };
    }
    /**
     * Calculate risk score based on context
     */
    calculateRiskScore(context, decision) {
        let risk = 0;
        // Base risk from action category
        const categoryRisk = {
            read: 10,
            write: 30,
            deploy: 60,
            rollback: 80,
        };
        risk += categoryRisk[context.action.category] || 50;
        // Autonomy multiplier
        risk += context.action.autonomy * 10;
        // Environment risk
        if (context.environment.production) {
            risk += 20;
        }
        // Resource sensitivity
        const sensitivityRisk = {
            low: 0,
            medium: 10,
            high: 20,
            critical: 40,
        };
        risk += sensitivityRisk[context.resource.sensitivity || 'medium'];
        // Time-based risk (after hours operations are riskier)
        if (!context.time.businessHours && context.action.category !== 'read') {
            risk += 15;
        }
        // Budget risk
        if (context.action.budgets) {
            if (context.action.budgets.usd > 50)
                risk += 10;
            if (context.action.budgets.usd > 100)
                risk += 20;
        }
        return Math.min(100, Math.max(0, risk));
    }
    /**
     * Determine if approval is required
     */
    requiresApproval(context, decision, riskScore) {
        // Always require approval if policy explicitly denies
        if (!decision.allowed)
            return true;
        // High-risk operations always require approval
        if (riskScore >= 70)
            return true;
        // Production deployments require approval
        if (context.environment.production &&
            context.action.category === 'deploy') {
            return true;
        }
        // High autonomy in production requires approval
        if (context.environment.production && context.action.autonomy >= 4) {
            return true;
        }
        // Critical resources always require approval for write operations
        if (context.resource.sensitivity === 'critical' &&
            context.action.category !== 'read') {
            return true;
        }
        return false;
    }
    /**
     * Helper methods
     */
    getCacheKey(context) {
        const key = JSON.stringify(context, Object.keys(context).sort());
        return (0, crypto_1.createHash)('sha256')
            .update(`${this.policyVersion}:${key}`)
            .digest('hex');
    }
    async getFromDbCache(cacheKey) {
        try {
            const result = await this.db.query(`
        SELECT allowed, reason, conditions 
        FROM policy_decisions 
        WHERE subject_hash = $1 AND policy_version = $2 AND expires_at > NOW()
      `, [cacheKey, this.policyVersion]);
            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    allowed: row.allowed,
                    reason: row.reason,
                    conditions: row.conditions || {},
                };
            }
        }
        catch (error) {
            this.logger.warn({ error: error.message }, 'Failed to get cached policy decision');
        }
        return null;
    }
    async cacheDecision(cacheKey, decision) {
        try {
            // Cache in memory
            this.cache.set(cacheKey, {
                decision,
                expires: Date.now() + 300000, // 5 minutes
            });
            // Cache in database
            await this.db.query(`
        INSERT INTO policy_decisions (subject_hash, policy_version, allowed, reason, conditions, expires_at)
        VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')
        ON CONFLICT (subject_hash, policy_version) 
        DO UPDATE SET allowed = $3, reason = $4, conditions = $5, expires_at = NOW() + INTERVAL '5 minutes'
      `, [
                cacheKey,
                this.policyVersion,
                decision.allowed,
                decision.reason,
                JSON.stringify(decision.conditions || {}),
            ]);
        }
        catch (error) {
            this.logger.warn({ error: error.message }, 'Failed to cache policy decision');
        }
    }
    async logPolicyDecision(subject, action, resource, context, decision) {
        this.logger.info({
            subject,
            action,
            resource,
            decision: {
                allowed: decision.allowed,
                reason: decision.reason,
                riskScore: decision.riskScore,
                requiresApproval: decision.requiresApproval,
            },
            context: {
                autonomy: context.action.autonomy,
                environment: context.environment.name,
                production: context.environment.production,
            },
        }, 'Policy decision made');
    }
    async getUserDetails(userId) {
        // In a real implementation, this would query the user service
        return {
            roles: ['developer'],
            permissions: ['read', 'write'],
            tenantId: 'default',
        };
    }
    async getResourceDetails(type, id) {
        // In a real implementation, this would query the resource metadata
        return {
            tenantId: 'default',
            sensitivity: type === 'production' ? 'critical' : 'medium',
        };
    }
    getEnvironmentContext() {
        return {
            name: process.env.NODE_ENV || 'development',
            production: process.env.NODE_ENV === 'production',
            region: process.env.AWS_REGION || 'us-west-2',
        };
    }
    getActionCategory(action) {
        if (action.includes('read') ||
            action.includes('get') ||
            action.includes('list')) {
            return 'read';
        }
        if (action.includes('deploy')) {
            return 'deploy';
        }
        if (action.includes('rollback') || action.includes('revert')) {
            return 'rollback';
        }
        return 'write';
    }
    isBusinessHours(date) {
        const hour = date.getHours();
        const day = date.getDay();
        return day >= 1 && day <= 5 && hour >= 9 && hour <= 17; // Mon-Fri 9-5
    }
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.expires <= now) {
                this.cache.delete(key);
            }
        }
    }
}
exports.PolicyEngine = PolicyEngine;
/**
 * Pre-built policy rules in Rego format
 */
exports.DEFAULT_POLICY_RULES = `
package autonomous

import future.keywords.if
import future.keywords.in

# Default allow decision
allow := decision if {
    decision := {
        "allow": allow_decision,
        "reason": reason,
        "conditions": conditions
    }
}

# Core allow logic
allow_decision if {
    # Read operations are generally allowed
    input.action.category == "read"
    not high_risk_read
}

allow_decision if {
    # Low autonomy operations with approval
    input.action.autonomy <= 2
    input.action.category in ["write", "deploy"]
    not production_restriction
}

allow_decision if {
    # Non-production environments are more permissive
    not input.environment.production
    input.action.autonomy <= 4
    approved_user
}

# Risk assessments
high_risk_read if {
    input.resource.sensitivity == "critical"
    not business_hours
}

production_restriction if {
    input.environment.production
    input.action.autonomy >= 4
}

business_hours if {
    input.time.businessHours == true
}

approved_user if {
    "developer" in input.user.roles
    input.action.type != "admin"
}

# Conditions that must be met
conditions := {
    "approval_required": requires_approval,
    "max_budget": max_allowed_budget,
    "monitoring_required": true
}

requires_approval if {
    input.action.category in ["deploy", "rollback"]
    input.environment.production
}

requires_approval if {
    input.resource.sensitivity == "critical"
    input.action.category != "read"
}

max_allowed_budget := 100 if {
    input.environment.production
} else := 500

# Denial reasons
reason := "Production operations require approval" if {
    input.environment.production
    input.action.autonomy >= 4
}

reason := "Critical resource access restricted" if {
    input.resource.sensitivity == "critical"
    input.action.autonomy >= 3
}

reason := "User lacks required permissions" if {
    not approved_user
}

reason := "Budget exceeds limits" if {
    input.action.budgets.usd > max_allowed_budget
}

reason := "Operation allowed" if allow_decision
`;
