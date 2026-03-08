"use strict";
/**
 * Remediation Prioritizer
 *
 * ML-powered prioritization of compliance remediation actions.
 * Ranks remediation tasks by risk, impact, effort, and deadline.
 *
 * SOC 2 Controls: CC3.3 (Risk Mitigation), CC5.2 (Change Management)
 *
 * @module analytics/compliance/RemediationPrioritizer
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemediationPrioritizer = void 0;
exports.getRemediationPrioritizer = getRemediationPrioritizer;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'remediation-prioritizer-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'RemediationPrioritizer',
    };
}
function effortToHours(effort) {
    const mapping = {
        minimal: 4,
        moderate: 16,
        significant: 40,
        major: 80,
    };
    return mapping[effort];
}
function riskToScore(risk) {
    const mapping = {
        critical: 100,
        high: 75,
        medium: 50,
        low: 25,
    };
    return mapping[risk];
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    riskWeight: 0.35,
    impactWeight: 0.25,
    effortWeight: 0.2,
    urgencyWeight: 0.2,
    weeklyCapacityHours: 40,
    planningHorizonWeeks: 12,
    quickWinsBonus: true,
};
// ============================================================================
// Priority Calculator
// ============================================================================
class PriorityCalculator {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Calculate priority score for a remediation item
     */
    calculate(item) {
        const factors = [];
        // Risk score (higher risk = higher priority)
        const riskScore = riskToScore(item.riskLevel);
        factors.push({
            name: 'Risk Level',
            value: riskScore,
            weight: this.config.riskWeight,
            contribution: riskScore * this.config.riskWeight,
            explanation: `${item.riskLevel} risk level contributes ${(riskScore * this.config.riskWeight).toFixed(1)} to priority`,
        });
        // Impact score (based on control importance)
        const impactScore = this.calculateImpactScore(item);
        factors.push({
            name: 'Business Impact',
            value: impactScore,
            weight: this.config.impactWeight,
            contribution: impactScore * this.config.impactWeight,
            explanation: `Impact on compliance and operations`,
        });
        // Effort score (lower effort = higher priority for quick wins)
        const effortScore = this.calculateEffortScore(item);
        factors.push({
            name: 'Effort Efficiency',
            value: effortScore,
            weight: this.config.effortWeight,
            contribution: effortScore * this.config.effortWeight,
            explanation: this.config.quickWinsBonus
                ? 'Lower effort items get priority boost'
                : 'Effort normalized',
        });
        // Urgency score (deadline proximity)
        const urgencyScore = this.calculateUrgencyScore(item);
        factors.push({
            name: 'Urgency',
            value: urgencyScore,
            weight: this.config.urgencyWeight,
            contribution: urgencyScore * this.config.urgencyWeight,
            explanation: item.deadline
                ? `Deadline in ${Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
                : 'No explicit deadline',
        });
        // Calculate final priority score
        const priorityScore = factors.reduce((sum, f) => sum + f.contribution, 0);
        return {
            priorityScore,
            riskScore,
            impactScore,
            effortScore,
            urgencyScore,
            factors,
        };
    }
    calculateImpactScore(item) {
        let score = 50; // Base score
        // Type-based impact
        const typeImpact = {
            control_implementation: 30,
            technical_fix: 25,
            process_change: 20,
            policy_update: 15,
            evidence_collection: 10,
            documentation: 5,
            training: 10,
        };
        score += typeImpact[item.type] || 0;
        // Dependency impact (more dependents = higher impact)
        score += Math.min(20, item.dependencies.length * 5);
        return Math.min(100, score);
    }
    calculateEffortScore(item) {
        // Invert effort for quick wins bonus
        if (this.config.quickWinsBonus) {
            const effortScores = {
                minimal: 100,
                moderate: 70,
                significant: 40,
                major: 20,
            };
            return effortScores[item.effort];
        }
        // Otherwise, normalize effort
        return 50;
    }
    calculateUrgencyScore(item) {
        if (!item.deadline) {
            return 30; // Low urgency if no deadline
        }
        const daysUntilDeadline = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDeadline <= 0)
            return 100; // Overdue
        if (daysUntilDeadline <= 7)
            return 90;
        if (daysUntilDeadline <= 14)
            return 75;
        if (daysUntilDeadline <= 30)
            return 60;
        if (daysUntilDeadline <= 60)
            return 40;
        return 20;
    }
}
// ============================================================================
// Schedule Optimizer
// ============================================================================
class ScheduleOptimizer {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Generate optimized timeline for remediation items
     */
    generateTimeline(prioritizedItems) {
        const timeline = [];
        const now = new Date();
        // Initialize weeks
        for (let week = 0; week < this.config.planningHorizonWeeks; week++) {
            const startDate = new Date(now.getTime() + week * 7 * 24 * 60 * 60 * 1000);
            const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
            timeline.push({
                weekNumber: week + 1,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                items: [],
                totalEffortHours: 0,
                capacityUtilization: 0,
            });
        }
        // Assign items to weeks based on priority and capacity
        const remainingCapacity = timeline.map(() => this.config.weeklyCapacityHours);
        for (const prioritizedItem of prioritizedItems) {
            const item = prioritizedItem.item;
            const hoursNeeded = item.estimatedHours || effortToHours(item.effort);
            // Find first week with capacity
            let assignedWeek = -1;
            for (let week = 0; week < timeline.length; week++) {
                // Check deadline constraint
                if (item.deadline) {
                    const weekEnd = new Date(timeline[week].endDate);
                    const deadline = new Date(item.deadline);
                    if (weekEnd > deadline)
                        continue; // Past deadline
                }
                // Check capacity
                if (remainingCapacity[week] >= hoursNeeded) {
                    assignedWeek = week;
                    break;
                }
                // Allow overflow for critical items
                if (item.riskLevel === 'critical' && remainingCapacity[week] >= hoursNeeded * 0.5) {
                    assignedWeek = week;
                    break;
                }
            }
            if (assignedWeek >= 0) {
                timeline[assignedWeek].items.push({
                    itemId: item.id,
                    title: item.title,
                    effort: item.effort,
                });
                timeline[assignedWeek].totalEffortHours += hoursNeeded;
                remainingCapacity[assignedWeek] -= hoursNeeded;
                // Update suggested dates on the prioritized item
                prioritizedItem.suggestedStartDate = timeline[assignedWeek].startDate;
                prioritizedItem.suggestedCompletionDate = timeline[assignedWeek].endDate;
            }
        }
        // Calculate capacity utilization
        for (const week of timeline) {
            week.capacityUtilization = week.totalEffortHours / this.config.weeklyCapacityHours;
        }
        return timeline;
    }
    /**
     * Calculate resource requirements
     */
    calculateResources(items) {
        const totalHours = items.reduce((sum, item) => sum + (item.estimatedHours || effortToHours(item.effort)), 0);
        const technicalTypes = ['technical_fix', 'control_implementation'];
        const technicalItems = items.filter(i => technicalTypes.includes(i.type));
        const technicalResources = new Set(technicalItems.map(i => `${i.type}: ${i.controlName}`));
        return {
            totalHoursRequired: totalHours,
            hoursPerWeek: Math.ceil(totalHours / this.config.planningHorizonWeeks),
            teamMembersNeeded: Math.ceil(totalHours / (this.config.planningHorizonWeeks * 40)),
            technicalResources: Array.from(technicalResources),
            estimatedCost: totalHours * 100, // Rough estimate at $100/hour
        };
    }
}
// ============================================================================
// Risk Projector
// ============================================================================
class RiskProjector {
    /**
     * Project risk reduction over time as items are completed
     */
    project(timeline, items, initialRiskScore, initialComplianceScore) {
        const projections = [];
        let currentRiskScore = initialRiskScore;
        let currentComplianceScore = initialComplianceScore;
        let itemsCompleted = 0;
        // Initial state
        projections.push({
            date: new Date().toISOString(),
            riskScore: currentRiskScore,
            complianceScore: currentComplianceScore,
            itemsCompleted: 0,
        });
        // Project for each week
        for (const week of timeline) {
            const weekItems = week.items.map(wi => items.find(i => i.id === wi.itemId)).filter(Boolean);
            for (const item of weekItems) {
                // Risk reduction based on item risk level
                const riskReduction = riskToScore(item.riskLevel) * 0.1;
                currentRiskScore = Math.max(0, currentRiskScore - riskReduction);
                // Compliance score increase
                const complianceIncrease = riskReduction * 0.3;
                currentComplianceScore = Math.min(100, currentComplianceScore + complianceIncrease);
                itemsCompleted++;
            }
            if (weekItems.length > 0) {
                projections.push({
                    date: week.endDate,
                    riskScore: Math.round(currentRiskScore),
                    complianceScore: Math.round(currentComplianceScore),
                    itemsCompleted,
                });
            }
        }
        return projections;
    }
}
// ============================================================================
// Remediation Prioritizer
// ============================================================================
class RemediationPrioritizer extends events_1.EventEmitter {
    config;
    priorityCalculator;
    scheduleOptimizer;
    riskProjector;
    items = new Map();
    stats;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.priorityCalculator = new PriorityCalculator(this.config);
        this.scheduleOptimizer = new ScheduleOptimizer(this.config);
        this.riskProjector = new RiskProjector();
        this.stats = {
            totalItemsPrioritized: 0,
            itemsCompleted: 0,
            averageTimeToComplete: 0,
            riskReductionAchieved: 0,
            lastPrioritizationAt: null,
        };
        logger_js_1.default.info({ config: this.config }, 'RemediationPrioritizer initialized');
    }
    /**
     * Add remediation items for prioritization
     */
    addItems(tenantId, items) {
        const existing = this.items.get(tenantId) || [];
        const newItems = items.filter(item => !existing.some(e => e.id === item.id));
        this.items.set(tenantId, [...existing, ...newItems]);
        logger_js_1.default.info({ tenantId, newItemCount: newItems.length, totalItems: existing.length + newItems.length }, 'Remediation items added');
    }
    /**
     * Prioritize remediation items
     */
    async prioritize(tenantId) {
        const items = this.items.get(tenantId) || [];
        const activeItems = items.filter(i => i.status !== 'completed' && i.status !== 'verified');
        const prioritized = [];
        for (const item of activeItems) {
            const scores = this.priorityCalculator.calculate(item);
            const resourceRequirements = this.estimateResources(item);
            prioritized.push({
                item,
                priorityScore: scores.priorityScore,
                priorityRank: 0, // Will be set after sorting
                riskScore: scores.riskScore,
                impactScore: scores.impactScore,
                effortScore: scores.effortScore,
                urgencyScore: scores.urgencyScore,
                factors: scores.factors,
                suggestedStartDate: '', // Will be set by scheduler
                suggestedCompletionDate: '',
                resourceRequirements,
                governanceVerdict: createVerdict(item.riskLevel === 'critical' ? data_envelope_js_1.GovernanceResult.FLAG :
                    item.riskLevel === 'high' ? data_envelope_js_1.GovernanceResult.REVIEW_REQUIRED :
                        data_envelope_js_1.GovernanceResult.ALLOW, `Priority score: ${scores.priorityScore.toFixed(1)}`),
            });
        }
        // Sort by priority score descending
        prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
        // Assign ranks
        prioritized.forEach((p, index) => {
            p.priorityRank = index + 1;
        });
        // Update stats
        this.stats.totalItemsPrioritized += prioritized.length;
        this.stats.lastPrioritizationAt = new Date().toISOString();
        logger_js_1.default.info({ tenantId, itemCount: prioritized.length }, 'Remediation items prioritized');
        return (0, data_envelope_js_1.createDataEnvelope)(prioritized, {
            source: 'RemediationPrioritizer',
            governanceVerdict: createVerdict(prioritized.some(p => p.item.riskLevel === 'critical')
                ? data_envelope_js_1.GovernanceResult.FLAG
                : data_envelope_js_1.GovernanceResult.ALLOW, `Prioritized ${prioritized.length} remediation items`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Generate a comprehensive remediation plan
     */
    async generatePlan(tenantId, framework, currentRiskScore = 50, currentComplianceScore = 75) {
        // Get prioritized items
        const prioritizedResult = await this.prioritize(tenantId);
        const prioritized = prioritizedResult.data || [];
        // Filter by framework
        const frameworkItems = prioritized.filter(p => p.item.framework === framework);
        // Generate timeline
        const timeline = this.scheduleOptimizer.generateTimeline(frameworkItems);
        // Calculate resource summary
        const resourceSummary = this.scheduleOptimizer.calculateResources(frameworkItems.map(p => p.item));
        // Project risk reduction
        const riskProjection = this.riskProjector.project(timeline, frameworkItems.map(p => p.item), currentRiskScore, currentComplianceScore);
        // Calculate estimated completion
        const lastNonEmptyWeek = [...timeline].reverse().find(w => w.items.length > 0);
        const estimatedCompletionDate = lastNonEmptyWeek
            ? lastNonEmptyWeek.endDate
            : new Date().toISOString();
        // Project final compliance score
        const finalProjection = riskProjection[riskProjection.length - 1];
        const complianceScoreProjection = finalProjection?.complianceScore || currentComplianceScore;
        const plan = {
            id: (0, uuid_1.v4)(),
            tenantId,
            framework,
            createdAt: new Date().toISOString(),
            planHorizon: `${this.config.planningHorizonWeeks} weeks`,
            items: frameworkItems,
            timeline,
            resourceSummary,
            riskReductionProjection: riskProjection,
            complianceScoreProjection,
            estimatedCompletionDate,
            governanceVerdict: createVerdict(frameworkItems.some(p => p.item.riskLevel === 'critical')
                ? data_envelope_js_1.GovernanceResult.FLAG
                : data_envelope_js_1.GovernanceResult.ALLOW, `Plan generated: ${frameworkItems.length} items, ${resourceSummary.totalHoursRequired} hours`),
        };
        logger_js_1.default.info({
            planId: plan.id,
            tenantId,
            framework,
            itemCount: frameworkItems.length,
            totalHours: resourceSummary.totalHoursRequired,
            completionDate: estimatedCompletionDate,
        }, 'Remediation plan generated');
        return (0, data_envelope_js_1.createDataEnvelope)(plan, {
            source: 'RemediationPrioritizer',
            governanceVerdict: plan.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Update item status
     */
    updateItemStatus(tenantId, itemId, status) {
        const items = this.items.get(tenantId) || [];
        const item = items.find(i => i.id === itemId);
        if (!item) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'RemediationPrioritizer',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Item not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        item.status = status;
        item.updatedAt = new Date().toISOString();
        if (status === 'completed' || status === 'verified') {
            item.completedAt = new Date().toISOString();
            this.stats.itemsCompleted++;
            // Calculate time to complete
            const created = new Date(item.createdAt).getTime();
            const completed = new Date(item.completedAt).getTime();
            const daysToComplete = (completed - created) / (1000 * 60 * 60 * 24);
            // Update average
            const n = this.stats.itemsCompleted;
            this.stats.averageTimeToComplete =
                ((this.stats.averageTimeToComplete * (n - 1)) + daysToComplete) / n;
            // Track risk reduction
            this.stats.riskReductionAchieved += riskToScore(item.riskLevel) * 0.1;
            this.emit('item:completed', item);
        }
        logger_js_1.default.info({ itemId, tenantId, status }, 'Remediation item status updated');
        return (0, data_envelope_js_1.createDataEnvelope)(item, {
            source: 'RemediationPrioritizer',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Status updated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get items for a tenant
     */
    getItems(tenantId, status) {
        let items = this.items.get(tenantId) || [];
        if (status) {
            items = items.filter(i => i.status === status);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(items, {
            source: 'RemediationPrioritizer',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Items retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'RemediationPrioritizer',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clear tenant data
     */
    clearTenant(tenantId) {
        this.items.delete(tenantId);
        logger_js_1.default.info({ tenantId }, 'Tenant data cleared from remediation prioritizer');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    estimateResources(item) {
        const requirements = [];
        // Human resources
        requirements.push({
            type: 'human',
            description: `${item.effort} effort - ${this.getRequiredRole(item.type)}`,
            quantity: item.effort === 'major' ? 2 : 1,
            estimated: true,
        });
        // Technical resources for technical items
        if (item.type === 'technical_fix' || item.type === 'control_implementation') {
            requirements.push({
                type: 'technical',
                description: 'System access and tooling required',
                estimated: true,
            });
        }
        // Financial for major items
        if (item.effort === 'major') {
            requirements.push({
                type: 'financial',
                description: 'Budget allocation may be required',
                estimated: true,
            });
        }
        return requirements;
    }
    getRequiredRole(type) {
        const roleMap = {
            control_implementation: 'Security Engineer',
            evidence_collection: 'Compliance Analyst',
            policy_update: 'Policy Owner',
            process_change: 'Process Owner',
            technical_fix: 'Developer/Engineer',
            training: 'Training Coordinator',
            documentation: 'Technical Writer',
        };
        return roleMap[type];
    }
}
exports.RemediationPrioritizer = RemediationPrioritizer;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getRemediationPrioritizer(config) {
    if (!instance) {
        instance = new RemediationPrioritizer(config);
    }
    return instance;
}
exports.default = RemediationPrioritizer;
