"use strict";
/**
 * Lead Scoring Service
 * Manages lead scoring models, rules, and automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadScoringService = exports.LeadScoringService = void 0;
const events_1 = require("events");
class LeadScoringService extends events_1.EventEmitter {
    scoringModels = new Map();
    automationRules = new Map();
    scoreHistory = new Map();
    roundRobinIndex = new Map();
    constructor() {
        super();
        this.initializeDefaultModel();
    }
    initializeDefaultModel() {
        const defaultModel = {
            id: 'model_default',
            name: 'Default Lead Scoring',
            description: 'Standard lead scoring model based on demographics and engagement',
            entityType: 'contact',
            rules: [
                // Demographic rules
                {
                    id: 'rule_title_exec',
                    name: 'Executive Title',
                    category: 'demographic',
                    condition: {
                        operator: 'or',
                        conditions: [
                            { field: 'jobTitle', operator: 'contains', value: 'CEO' },
                            { field: 'jobTitle', operator: 'contains', value: 'CTO' },
                            { field: 'jobTitle', operator: 'contains', value: 'CFO' },
                            { field: 'jobTitle', operator: 'contains', value: 'VP' },
                            { field: 'jobTitle', operator: 'contains', value: 'Director' },
                        ],
                    },
                    points: 20,
                },
                {
                    id: 'rule_title_manager',
                    name: 'Manager Title',
                    category: 'demographic',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'jobTitle', operator: 'contains', value: 'Manager' }],
                    },
                    points: 10,
                },
                {
                    id: 'rule_company_size',
                    name: 'Enterprise Company',
                    category: 'fit',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'companySize', operator: 'in', value: ['large', 'enterprise'] }],
                    },
                    points: 15,
                },
                // Engagement rules
                {
                    id: 'rule_email_open',
                    name: 'Email Opened',
                    category: 'engagement',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'emailOpened', operator: 'equals', value: true }],
                    },
                    points: 5,
                    maxOccurrences: 5,
                    expirationDays: 30,
                },
                {
                    id: 'rule_email_click',
                    name: 'Email Link Clicked',
                    category: 'engagement',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'emailClicked', operator: 'equals', value: true }],
                    },
                    points: 10,
                    maxOccurrences: 3,
                    expirationDays: 30,
                },
                {
                    id: 'rule_meeting',
                    name: 'Meeting Scheduled',
                    category: 'behavioral',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'meetingScheduled', operator: 'equals', value: true }],
                    },
                    points: 25,
                },
                {
                    id: 'rule_demo',
                    name: 'Demo Requested',
                    category: 'behavioral',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'demoRequested', operator: 'equals', value: true }],
                    },
                    points: 30,
                },
                // Source quality
                {
                    id: 'rule_referral',
                    name: 'Referral Source',
                    category: 'fit',
                    condition: {
                        operator: 'and',
                        conditions: [{ field: 'source', operator: 'equals', value: 'referral' }],
                    },
                    points: 15,
                },
            ],
            degradation: {
                enabled: true,
                inactivityDays: 30,
                degradationPercent: 10,
                minimumScore: 0,
            },
            thresholds: [
                { name: 'Hot', minScore: 80, maxScore: 100, color: '#EF4444', action: 'notify_sales' },
                { name: 'Warm', minScore: 50, maxScore: 79, color: '#F59E0B', action: 'nurture' },
                { name: 'Cold', minScore: 20, maxScore: 49, color: '#3B82F6', action: 'monitor' },
                { name: 'Unqualified', minScore: 0, maxScore: 19, color: '#6B7280', action: 'archive' },
            ],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.scoringModels.set(defaultModel.id, defaultModel);
    }
    // Scoring Model Management
    /**
     * Create scoring model
     */
    async createModel(input) {
        const id = this.generateId('model');
        const now = new Date();
        const rules = (input.rules || []).map((r, i) => ({
            ...r,
            id: `rule_${i}`,
        }));
        const model = {
            id,
            name: input.name,
            description: input.description,
            entityType: input.entityType,
            rules,
            degradation: input.degradation || {
                enabled: false,
                inactivityDays: 30,
                degradationPercent: 10,
                minimumScore: 0,
            },
            thresholds: input.thresholds || [],
            isActive: false,
            createdAt: now,
            updatedAt: now,
        };
        this.scoringModels.set(id, model);
        return model;
    }
    /**
     * Get scoring model by ID
     */
    async getModel(id) {
        return this.scoringModels.get(id) || null;
    }
    /**
     * Get active model for entity type
     */
    async getActiveModel(entityType) {
        return (Array.from(this.scoringModels.values()).find((m) => m.entityType === entityType && m.isActive) || null);
    }
    /**
     * Get all models
     */
    async getModels() {
        return Array.from(this.scoringModels.values());
    }
    /**
     * Activate model
     */
    async activateModel(id) {
        const model = this.scoringModels.get(id);
        if (!model) {
            throw new Error(`Model ${id} not found`);
        }
        // Deactivate other models of same entity type
        for (const [otherId, otherModel] of this.scoringModels.entries()) {
            if (otherModel.entityType === model.entityType && otherModel.isActive) {
                otherModel.isActive = false;
                this.scoringModels.set(otherId, otherModel);
            }
        }
        model.isActive = true;
        model.updatedAt = new Date();
        this.scoringModels.set(id, model);
        return model;
    }
    /**
     * Add rule to model
     */
    async addRule(modelId, rule) {
        const model = this.scoringModels.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }
        const newRule = {
            ...rule,
            id: this.generateId('rule'),
        };
        model.rules.push(newRule);
        model.updatedAt = new Date();
        this.scoringModels.set(modelId, model);
        return model;
    }
    /**
     * Remove rule from model
     */
    async removeRule(modelId, ruleId) {
        const model = this.scoringModels.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }
        model.rules = model.rules.filter((r) => r.id !== ruleId);
        model.updatedAt = new Date();
        this.scoringModels.set(modelId, model);
        return model;
    }
    /**
     * Update thresholds
     */
    async updateThresholds(modelId, thresholds) {
        const model = this.scoringModels.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }
        model.thresholds = thresholds;
        model.updatedAt = new Date();
        this.scoringModels.set(modelId, model);
        return model;
    }
    // Score Calculation
    /**
     * Calculate score for entity
     */
    async calculateScore(entityType, entityId, entityData, currentScore = 0) {
        const model = await this.getActiveModel(entityType);
        if (!model) {
            return {
                entityId,
                entityType,
                previousScore: currentScore,
                newScore: currentScore,
                appliedRules: [],
                degradationApplied: 0,
                timestamp: new Date(),
            };
        }
        let score = 0;
        const appliedRules = [];
        // Evaluate each rule
        for (const rule of model.rules) {
            if (this.evaluateCondition(rule.condition, entityData)) {
                const points = this.calculateRulePoints(rule, entityId);
                if (points > 0) {
                    score += points;
                    appliedRules.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        points,
                    });
                }
            }
        }
        // Apply degradation if enabled
        let degradationApplied = 0;
        if (model.degradation.enabled) {
            const lastActivity = entityData.lastActivityAt;
            if (lastActivity) {
                const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceActivity > model.degradation.inactivityDays) {
                    const periods = Math.floor(daysSinceActivity / model.degradation.inactivityDays);
                    degradationApplied = Math.floor(score * (model.degradation.degradationPercent / 100) * periods);
                    score = Math.max(model.degradation.minimumScore, score - degradationApplied);
                }
            }
        }
        // Clamp score to 0-100
        score = Math.max(0, Math.min(100, score));
        // Record history
        const history = {
            id: this.generateId('hist'),
            entityType,
            entityId,
            previousScore: currentScore,
            newScore: score,
            change: score - currentScore,
            reason: appliedRules.map((r) => r.ruleName).join(', ') || 'No rules matched',
            timestamp: new Date(),
        };
        const entityHistory = this.scoreHistory.get(entityId) || [];
        entityHistory.push(history);
        this.scoreHistory.set(entityId, entityHistory);
        // Check thresholds and trigger actions
        const threshold = this.getThreshold(model, score);
        if (threshold && currentScore < threshold.minScore && score >= threshold.minScore) {
            this.emit('score:threshold_crossed', {
                entityType,
                entityId,
                threshold,
                score,
            });
        }
        return {
            entityId,
            entityType,
            previousScore: currentScore,
            newScore: score,
            appliedRules,
            degradationApplied,
            timestamp: new Date(),
        };
    }
    /**
     * Batch calculate scores
     */
    async batchCalculateScores(entityType, entities) {
        const results = [];
        for (const entity of entities) {
            const result = await this.calculateScore(entityType, entity.id, entity.data, entity.currentScore);
            results.push(result);
        }
        return results;
    }
    /**
     * Get score history
     */
    async getScoreHistory(entityId, limit = 50) {
        const history = this.scoreHistory.get(entityId) || [];
        return history.slice(-limit);
    }
    /**
     * Get threshold for score
     */
    getThreshold(model, score) {
        return model.thresholds.find((t) => score >= t.minScore && score <= t.maxScore) || null;
    }
    // Automation Rules
    /**
     * Create automation rule
     */
    async createAutomationRule(input) {
        const id = this.generateId('auto');
        const now = new Date();
        const rule = {
            id,
            name: input.name,
            description: input.description,
            type: input.type,
            trigger: input.trigger,
            conditions: input.conditions || { operator: 'and', conditions: [] },
            actions: input.actions,
            priority: input.priority || 0,
            isActive: false,
            runCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        this.automationRules.set(id, rule);
        return rule;
    }
    /**
     * Get automation rules
     */
    async getAutomationRules(type) {
        let rules = Array.from(this.automationRules.values());
        if (type) {
            rules = rules.filter((r) => r.type === type);
        }
        return rules.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Activate automation rule
     */
    async activateAutomationRule(id) {
        const rule = this.automationRules.get(id);
        if (!rule) {
            throw new Error(`Automation rule ${id} not found`);
        }
        rule.isActive = true;
        rule.updatedAt = new Date();
        this.automationRules.set(id, rule);
        return rule;
    }
    /**
     * Process automation trigger
     */
    async processAutomation(event, entityType, entityId, entityData) {
        const rules = Array.from(this.automationRules.values()).filter((r) => r.isActive && r.trigger.event === event && r.trigger.entityType === entityType);
        for (const rule of rules) {
            // Check conditions
            if (!this.evaluateCondition(rule.conditions, entityData)) {
                continue;
            }
            // Execute actions
            for (const action of rule.actions) {
                await this.executeAutomationAction(action, entityType, entityId, entityData);
            }
            // Update run count
            rule.runCount++;
            rule.lastRunAt = new Date();
            this.automationRules.set(rule.id, rule);
            this.emit('automation:executed', { ruleId: rule.id, entityType, entityId });
        }
    }
    // Lead Routing
    /**
     * Route lead using round robin
     */
    async routeLeadRoundRobin(entityType, entityId, teamId, userIds) {
        if (userIds.length === 0) {
            throw new Error('No users available for routing');
        }
        const key = `${teamId}_round_robin`;
        let index = this.roundRobinIndex.get(key) || 0;
        const assignedTo = userIds[index % userIds.length];
        index = (index + 1) % userIds.length;
        this.roundRobinIndex.set(key, index);
        this.emit('lead:routed', { entityType, entityId, assignedTo });
        return {
            entityId,
            assignedTo,
            method: 'round_robin',
            reason: `Round robin assignment to team ${teamId}`,
        };
    }
    /**
     * Route lead based on score
     */
    async routeLeadByScore(entityType, entityId, score, routingConfig) {
        // Sort by threshold descending to match highest first
        const sortedConfig = [...routingConfig].sort((a, b) => b.threshold - a.threshold);
        for (const config of sortedConfig) {
            if (score >= config.threshold) {
                this.emit('lead:routed', { entityType, entityId, assignedTo: config.userId });
                return {
                    entityId,
                    assignedTo: config.userId,
                    method: 'skill_based',
                    reason: `Score ${score} >= threshold ${config.threshold}`,
                };
            }
        }
        // Default to first user if no threshold matched
        const assignedTo = routingConfig[0]?.userId || 'unassigned';
        return {
            entityId,
            assignedTo,
            method: 'skill_based',
            reason: 'No threshold matched, assigned to default',
        };
    }
    /**
     * Route lead based on territory/region
     */
    async routeLeadByTerritory(entityType, entityId, region, territoryMap) {
        const assignedTo = territoryMap[region] || territoryMap['default'] || 'unassigned';
        this.emit('lead:routed', { entityType, entityId, assignedTo });
        return {
            entityId,
            assignedTo,
            method: 'territory',
            reason: `Territory assignment for region: ${region}`,
        };
    }
    // Helper Methods
    evaluateCondition(condition, data) {
        if (condition.conditions.length === 0 && (!condition.groups || condition.groups.length === 0)) {
            return true;
        }
        const results = condition.conditions.map((c) => {
            const value = data[c.field];
            return this.evaluateSingleCondition(value, c.operator, c.value);
        });
        if (condition.groups) {
            for (const group of condition.groups) {
                results.push(this.evaluateCondition(group, data));
            }
        }
        return condition.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
    }
    evaluateSingleCondition(fieldValue, operator, conditionValue) {
        switch (operator) {
            case 'equals':
                return fieldValue === conditionValue;
            case 'not_equals':
                return fieldValue !== conditionValue;
            case 'contains':
                return String(fieldValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
            case 'greater_than':
                return Number(fieldValue) > Number(conditionValue);
            case 'less_than':
                return Number(fieldValue) < Number(conditionValue);
            case 'is_empty':
                return fieldValue === null || fieldValue === undefined || fieldValue === '';
            case 'is_not_empty':
                return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
            case 'in':
                return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
            default:
                return true;
        }
    }
    calculateRulePoints(rule, entityId) {
        if (!rule.maxOccurrences) {
            return rule.points;
        }
        // Check occurrence count from history
        const history = this.scoreHistory.get(entityId) || [];
        const occurrences = history.filter((h) => h.ruleId === rule.id).length;
        if (occurrences >= rule.maxOccurrences) {
            return 0;
        }
        return rule.points;
    }
    async executeAutomationAction(action, entityType, entityId, entityData) {
        switch (action.type) {
            case 'assign_owner':
                this.emit('automation:assign', { entityType, entityId, userId: action.config.userId });
                break;
            case 'round_robin':
                // Would call routing service
                break;
            case 'update_field':
                this.emit('automation:updateField', {
                    entityType,
                    entityId,
                    field: action.config.field,
                    value: action.config.value,
                });
                break;
            case 'create_task':
                this.emit('automation:createTask', {
                    entityType,
                    entityId,
                    config: action.config,
                });
                break;
            case 'send_email':
                this.emit('automation:sendEmail', {
                    entityType,
                    entityId,
                    templateId: action.config.templateId,
                });
                break;
            case 'send_notification':
                this.emit('automation:notify', {
                    entityType,
                    entityId,
                    message: action.config.message,
                });
                break;
            case 'enroll_sequence':
                this.emit('automation:enrollSequence', {
                    entityType,
                    entityId,
                    sequenceId: action.config.sequenceId,
                });
                break;
            case 'add_tag':
                this.emit('automation:addTag', {
                    entityType,
                    entityId,
                    tags: action.config.tags,
                });
                break;
            case 'webhook':
                this.emit('automation:webhook', {
                    url: action.config.webhookUrl,
                    data: { entityType, entityId, ...entityData },
                });
                break;
        }
    }
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.LeadScoringService = LeadScoringService;
exports.leadScoringService = new LeadScoringService();
