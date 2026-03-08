"use strict";
/**
 * Intervention Planner Algorithm
 * Plans preventive actions based on anomaly predictions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterventionPlanner = void 0;
const PreventiveIntervention_js_1 = require("../models/PreventiveIntervention.js");
const AnomalyPrediction_js_1 = require("../models/AnomalyPrediction.js");
class InterventionPlanner {
    config;
    actionTemplates;
    constructor(config) {
        this.config = config;
        this.actionTemplates = this.initializeActionTemplates();
    }
    /**
     * Plan intervention for a predicted anomaly
     */
    async plan(prediction, precursorSignals) {
        // Calculate action window
        const actionWindow = this.calculateActionWindow(prediction, precursorSignals);
        // Select appropriate actions
        const recommendedActions = this.selectActions(prediction, precursorSignals, actionWindow);
        // Estimate prevention probability
        const estimatedPreventionProbability = this.estimatePreventionProbability(prediction, actionWindow, recommendedActions);
        return {
            anomalyPredictionId: prediction.id,
            actionWindow,
            recommendedActions,
            estimatedPreventionProbability,
        };
    }
    /**
     * Calculate action window based on prediction and precursors
     */
    calculateActionWindow(prediction, precursorSignals) {
        const now = new Date();
        // Start: Immediately or when first precursor detected
        const start = now;
        // End: Earliest onset time (must complete before anomaly occurs)
        let end = prediction.onsetWindow.earliest;
        // Adjust based on precursor signals - if we have early warnings, use them
        if (precursorSignals.length > 0) {
            // Find precursor with longest lead time
            const maxLeadTime = Math.max(...precursorSignals.map((s) => s.leadTimeMs));
            // If we have significant lead time, we can plan further ahead
            const precursorEnd = new Date(prediction.predictedOnsetTime.getTime() - maxLeadTime);
            // But never extend beyond earliest onset
            end = new Date(Math.min(end.getTime(), precursorEnd.getTime()));
        }
        const durationMs = end.getTime() - start.getTime();
        const remainingTimeMs = Math.max(0, durationMs);
        // Determine urgency
        const urgencyLevel = this.determineUrgency(remainingTimeMs);
        return {
            start,
            end,
            durationMs,
            remainingTimeMs,
            urgencyLevel,
        };
    }
    /**
     * Determine urgency level based on remaining time
     */
    determineUrgency(remainingTimeMs) {
        const fiveMinutes = 5 * 60 * 1000;
        const fifteenMinutes = 15 * 60 * 1000;
        const oneHour = 60 * 60 * 1000;
        if (remainingTimeMs < fiveMinutes)
            return PreventiveIntervention_js_1.UrgencyLevel.CRITICAL;
        if (remainingTimeMs < fifteenMinutes)
            return PreventiveIntervention_js_1.UrgencyLevel.HIGH;
        if (remainingTimeMs < oneHour)
            return PreventiveIntervention_js_1.UrgencyLevel.MEDIUM;
        return PreventiveIntervention_js_1.UrgencyLevel.LOW;
    }
    /**
     * Select appropriate actions for intervention
     */
    selectActions(prediction, precursorSignals, actionWindow) {
        const selectedActions = [];
        // Filter templates by severity
        const applicableTemplates = this.actionTemplates.filter((template) => template.applicableSeverities.includes(prediction.expectedSeverity));
        // Filter by time constraints
        const feasibleTemplates = applicableTemplates.filter((template) => template.estimatedDurationMs <= actionWindow.durationMs);
        // Sort by priority
        const sortedTemplates = feasibleTemplates.sort((a, b) => a.priority - b.priority);
        // Build action chain with prerequisites
        const selectedTypes = new Set();
        for (const template of sortedTemplates) {
            // Check if we have time for this action
            const totalDuration = this.calculateTotalDuration([
                ...selectedActions,
                this.templateToAction(template),
            ]);
            if (totalDuration > actionWindow.durationMs) {
                continue; // Skip if would exceed window
            }
            // Check if automatable (if automatic actions are disabled)
            if (!this.config.enableAutomaticActions && template.automatable) {
                continue;
            }
            // Add action
            selectedActions.push(this.templateToAction(template));
            selectedTypes.add(template.actionType);
            // Add prerequisites if not already selected
            for (const prereq of template.prerequisites) {
                if (!selectedTypes.has(prereq)) {
                    const prereqTemplate = this.actionTemplates.find((t) => t.actionType === prereq);
                    if (prereqTemplate) {
                        selectedActions.push(this.templateToAction(prereqTemplate));
                        selectedTypes.add(prereq);
                    }
                }
            }
        }
        // Sort final list by priority
        return selectedActions.sort((a, b) => a.priority - b.priority);
    }
    /**
     * Convert action template to intervention action
     */
    templateToAction(template) {
        return {
            actionType: template.actionType,
            priority: template.priority,
            estimatedDurationMs: template.estimatedDurationMs,
            prerequisites: template.prerequisites,
            successCriteria: template.successCriteria,
            status: PreventiveIntervention_js_1.ActionStatus.PENDING,
            automatable: template.automatable,
        };
    }
    /**
     * Calculate total duration of action sequence
     */
    calculateTotalDuration(actions) {
        // Assume sequential execution (conservative estimate)
        return actions.reduce((sum, action) => sum + action.estimatedDurationMs, 0);
    }
    /**
     * Estimate probability of preventing anomaly
     */
    estimatePreventionProbability(prediction, actionWindow, actions) {
        // Base probability from prediction confidence
        let probability = prediction.confidence;
        // Adjust for action window size
        const timeBuffer = actionWindow.durationMs / (60 * 60 * 1000); // hours
        const timeBufferFactor = Math.min(timeBuffer / 2, 1.0); // Max at 2+ hours
        probability *= timeBufferFactor;
        // Adjust for number and quality of actions
        const actionFactor = Math.min(actions.length / 3, 1.0); // Max at 3+ actions
        probability *= 0.7 + actionFactor * 0.3; // 70-100% based on actions
        // Adjust for automatable actions (more reliable)
        const automatableCount = actions.filter((a) => a.automatable).length;
        const automatableFactor = automatableCount / Math.max(actions.length, 1);
        probability *= 0.8 + automatableFactor * 0.2; // 80-100% based on automation
        // Adjust for urgency (critical urgency reduces confidence)
        const urgencyPenalty = {
            [PreventiveIntervention_js_1.UrgencyLevel.LOW]: 1.0,
            [PreventiveIntervention_js_1.UrgencyLevel.MEDIUM]: 0.95,
            [PreventiveIntervention_js_1.UrgencyLevel.HIGH]: 0.85,
            [PreventiveIntervention_js_1.UrgencyLevel.CRITICAL]: 0.7,
        };
        probability *= urgencyPenalty[actionWindow.urgencyLevel];
        // Ensure within bounds
        return Math.min(Math.max(probability, 0), 1);
    }
    /**
     * Initialize action templates library
     */
    initializeActionTemplates() {
        return [
            // === MONITORING & ALERTING ===
            {
                actionType: 'ALERT_SOC',
                priority: 1,
                estimatedDurationMs: 30 * 1000, // 30 seconds
                prerequisites: [],
                successCriteria: ['SOC team notified', 'Ticket created'],
                automatable: true,
                applicableSeverities: [
                    AnomalyPrediction_js_1.Severity.MEDIUM,
                    AnomalyPrediction_js_1.Severity.HIGH,
                    AnomalyPrediction_js_1.Severity.CRITICAL,
                ],
                resourceRequirements: ['notification_system'],
            },
            {
                actionType: 'INCREASE_MONITORING',
                priority: 2,
                estimatedDurationMs: 2 * 60 * 1000, // 2 minutes
                prerequisites: [],
                successCriteria: [
                    'Logging level increased',
                    'Metric collection frequency increased',
                ],
                automatable: true,
                applicableSeverities: [
                    AnomalyPrediction_js_1.Severity.LOW,
                    AnomalyPrediction_js_1.Severity.MEDIUM,
                    AnomalyPrediction_js_1.Severity.HIGH,
                    AnomalyPrediction_js_1.Severity.CRITICAL,
                ],
                resourceRequirements: ['observability_system'],
            },
            // === NETWORK DEFENSES ===
            {
                actionType: 'ENABLE_RATE_LIMITING',
                priority: 3,
                estimatedDurationMs: 1 * 60 * 1000, // 1 minute
                prerequisites: [],
                successCriteria: ['Rate limits activated', 'Traffic throttled'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.MEDIUM, AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['api_gateway'],
            },
            {
                actionType: 'ACTIVATE_WAF_RULES',
                priority: 3,
                estimatedDurationMs: 2 * 60 * 1000, // 2 minutes
                prerequisites: [],
                successCriteria: ['WAF rules deployed', 'Suspicious patterns blocked'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['waf'],
            },
            {
                actionType: 'BLOCK_SUSPICIOUS_IPS',
                priority: 4,
                estimatedDurationMs: 3 * 60 * 1000, // 3 minutes
                prerequisites: ['ALERT_SOC'],
                successCriteria: ['IP blacklist updated', 'Traffic blocked'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['firewall'],
            },
            // === RESOURCE SCALING ===
            {
                actionType: 'SCALE_UP_INSTANCES',
                priority: 5,
                estimatedDurationMs: 5 * 60 * 1000, // 5 minutes
                prerequisites: [],
                successCriteria: [
                    'New instances provisioned',
                    'Load balancer updated',
                ],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.MEDIUM, AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['orchestrator', 'cloud_provider'],
            },
            {
                actionType: 'ACTIVATE_CACHE',
                priority: 4,
                estimatedDurationMs: 2 * 60 * 1000, // 2 minutes
                prerequisites: [],
                successCriteria: ['Cache warmed', 'Hit rate increased'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.MEDIUM, AnomalyPrediction_js_1.Severity.HIGH],
                resourceRequirements: ['cache_system'],
            },
            // === DATABASE ACTIONS ===
            {
                actionType: 'SCALE_DATABASE_REPLICAS',
                priority: 6,
                estimatedDurationMs: 8 * 60 * 1000, // 8 minutes
                prerequisites: [],
                successCriteria: ['Read replicas added', 'Load distributed'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['database', 'orchestrator'],
            },
            {
                actionType: 'OPTIMIZE_SLOW_QUERIES',
                priority: 7,
                estimatedDurationMs: 15 * 60 * 1000, // 15 minutes
                prerequisites: ['ALERT_SOC'],
                successCriteria: ['Query plans reviewed', 'Indexes created'],
                automatable: false,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.MEDIUM, AnomalyPrediction_js_1.Severity.HIGH],
                resourceRequirements: ['dba'],
            },
            // === ACCESS CONTROLS ===
            {
                actionType: 'REQUIRE_MFA',
                priority: 5,
                estimatedDurationMs: 1 * 60 * 1000, // 1 minute
                prerequisites: [],
                successCriteria: ['MFA enforcement enabled', 'Users notified'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['identity_provider'],
            },
            {
                actionType: 'REVOKE_SUSPICIOUS_SESSIONS',
                priority: 6,
                estimatedDurationMs: 2 * 60 * 1000, // 2 minutes
                prerequisites: ['ALERT_SOC'],
                successCriteria: ['Sessions terminated', 'Re-authentication required'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['session_manager'],
            },
            // === CIRCUIT BREAKERS ===
            {
                actionType: 'ENABLE_CIRCUIT_BREAKER',
                priority: 4,
                estimatedDurationMs: 1 * 60 * 1000, // 1 minute
                prerequisites: [],
                successCriteria: ['Circuit breaker armed', 'Fallback ready'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.MEDIUM, AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['service_mesh'],
            },
            {
                actionType: 'ISOLATE_AFFECTED_SERVICE',
                priority: 8,
                estimatedDurationMs: 5 * 60 * 1000, // 5 minutes
                prerequisites: ['ALERT_SOC', 'ENABLE_CIRCUIT_BREAKER'],
                successCriteria: ['Service isolated', 'Traffic rerouted'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['service_mesh', 'load_balancer'],
            },
            // === INVESTIGATION ===
            {
                actionType: 'CAPTURE_DIAGNOSTIC_SNAPSHOT',
                priority: 2,
                estimatedDurationMs: 3 * 60 * 1000, // 3 minutes
                prerequisites: [],
                successCriteria: [
                    'Heap dump collected',
                    'Thread dump collected',
                    'Logs archived',
                ],
                automatable: true,
                applicableSeverities: [
                    AnomalyPrediction_js_1.Severity.MEDIUM,
                    AnomalyPrediction_js_1.Severity.HIGH,
                    AnomalyPrediction_js_1.Severity.CRITICAL,
                ],
                resourceRequirements: ['observability_system'],
            },
            {
                actionType: 'INITIATE_DEEP_INVESTIGATION',
                priority: 9,
                estimatedDurationMs: 30 * 60 * 1000, // 30 minutes
                prerequisites: ['ALERT_SOC', 'CAPTURE_DIAGNOSTIC_SNAPSHOT'],
                successCriteria: [
                    'Investigation team assembled',
                    'Root cause analysis started',
                ],
                automatable: false,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['incident_response_team'],
            },
            // === ROLLBACK & RECOVERY ===
            {
                actionType: 'ROLLBACK_RECENT_DEPLOYMENT',
                priority: 10,
                estimatedDurationMs: 10 * 60 * 1000, // 10 minutes
                prerequisites: ['ALERT_SOC'],
                successCriteria: ['Previous version deployed', 'Health checks passed'],
                automatable: true,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['ci_cd_system'],
            },
            {
                actionType: 'RESTORE_FROM_BACKUP',
                priority: 11,
                estimatedDurationMs: 20 * 60 * 1000, // 20 minutes
                prerequisites: ['ALERT_SOC', 'ISOLATE_AFFECTED_SERVICE'],
                successCriteria: ['Backup restored', 'Data integrity verified'],
                automatable: false,
                applicableSeverities: [AnomalyPrediction_js_1.Severity.CRITICAL],
                resourceRequirements: ['backup_system', 'dba'],
            },
        ];
    }
    /**
     * Get recommended actions for specific scenario
     */
    getActionsForScenario(scenario, severity) {
        const scenarioMapping = {
            network_intrusion: [
                'ALERT_SOC',
                'ENABLE_RATE_LIMITING',
                'ACTIVATE_WAF_RULES',
                'BLOCK_SUSPICIOUS_IPS',
            ],
            database_degradation: [
                'ALERT_SOC',
                'SCALE_DATABASE_REPLICAS',
                'ACTIVATE_CACHE',
                'OPTIMIZE_SLOW_QUERIES',
            ],
            service_overload: [
                'INCREASE_MONITORING',
                'SCALE_UP_INSTANCES',
                'ENABLE_CIRCUIT_BREAKER',
                'ACTIVATE_CACHE',
            ],
            insider_threat: [
                'ALERT_SOC',
                'REQUIRE_MFA',
                'REVOKE_SUSPICIOUS_SESSIONS',
                'INITIATE_DEEP_INVESTIGATION',
            ],
            data_corruption: [
                'ALERT_SOC',
                'ISOLATE_AFFECTED_SERVICE',
                'CAPTURE_DIAGNOSTIC_SNAPSHOT',
                'RESTORE_FROM_BACKUP',
            ],
        };
        const actionTypes = scenarioMapping[scenario] || [];
        return this.actionTemplates.filter((template) => actionTypes.includes(template.actionType) &&
            template.applicableSeverities.includes(severity));
    }
}
exports.InterventionPlanner = InterventionPlanner;
