"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbookOrchestrator = exports.PlaybookOrchestrator = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const yaml_1 = require("yaml");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const RemediationExecutionLogger_js_1 = require("./RemediationExecutionLogger.js");
class PlaybookOrchestrator {
    static instance;
    playbooks = new Map();
    executions = new Map();
    logger;
    playbookDir;
    constructor() {
        this.logger = RemediationExecutionLogger_js_1.RemediationExecutionLogger.getInstance();
        this.playbookDir = (0, path_1.join)(process.cwd(), 'config/playbooks');
        this.loadPlaybooks();
    }
    static getInstance() {
        if (!PlaybookOrchestrator.instance) {
            PlaybookOrchestrator.instance = new PlaybookOrchestrator();
        }
        return PlaybookOrchestrator.instance;
    }
    /**
     * Load all playbook definitions from YAML files
     */
    loadPlaybooks() {
        try {
            const files = (0, fs_1.readdirSync)(this.playbookDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
            for (const file of files) {
                const content = (0, fs_1.readFileSync)((0, path_1.join)(this.playbookDir, file), 'utf-8');
                const playbook = (0, yaml_1.parse)(content);
                this.playbooks.set(playbook.id, playbook);
                logger_js_1.default.info({ playbookId: playbook.id, name: playbook.name }, 'Loaded remediation playbook');
            }
            logger_js_1.default.info({ count: this.playbooks.size }, 'Playbook orchestrator initialized');
        }
        catch (error) {
            logger_js_1.default.warn({ error: error.message }, 'Failed to load playbooks - directory may not exist yet');
        }
    }
    /**
     * Find matching playbook for an incident
     */
    findPlaybook(incident) {
        for (const playbook of this.playbooks.values()) {
            // Check severity match
            if (!playbook.severity.includes(incident.severity)) {
                continue;
            }
            // Check trigger pattern match
            const matchesTrigger = playbook.triggerPatterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(incident.impact) || regex.test(incident.mitigations);
            });
            if (matchesTrigger) {
                logger_js_1.default.info({
                    incidentId: incident.id,
                    playbookId: playbook.id
                }, 'Matched playbook for incident');
                return playbook;
            }
        }
        logger_js_1.default.warn({ incidentId: incident.id }, 'No matching playbook found for incident');
        return null;
    }
    /**
     * Execute a playbook for an incident
     */
    async executePlaybook(incident, playbook) {
        const execution = {
            playbookId: playbook.id,
            incidentId: incident.id,
            startedAt: new Date(),
            status: 'running',
            executedSteps: [],
            failedSteps: []
        };
        this.executions.set(incident.id, execution);
        logger_js_1.default.info({
            incidentId: incident.id,
            playbookId: playbook.id,
            stepCount: playbook.steps.length
        }, 'Starting playbook execution');
        try {
            for (const step of playbook.steps) {
                // Evaluate condition if present
                if (step.condition && !this.evaluateCondition(step.condition, incident)) {
                    logger_js_1.default.info({ stepName: step.name }, 'Skipping step due to condition');
                    continue;
                }
                const success = await this.executeStep(incident, playbook, step);
                if (success) {
                    execution.executedSteps.push(step.name);
                }
                else {
                    execution.failedSteps.push(step.name);
                    // Handle failure based on strategy
                    if (step.onFailure === 'abort') {
                        logger_js_1.default.error({ stepName: step.name }, 'Step failed - aborting playbook');
                        execution.status = 'failed';
                        break;
                    }
                    else if (step.onFailure === 'rollback') {
                        logger_js_1.default.warn({ stepName: step.name }, 'Step failed - initiating rollback');
                        await this.rollback(incident, playbook, execution);
                        execution.status = 'rolled_back';
                        break;
                    }
                    // 'continue' - just log and move on
                }
            }
            if (execution.status === 'running') {
                execution.status = 'completed';
            }
            execution.completedAt = new Date();
            logger_js_1.default.info({
                incidentId: incident.id,
                playbookId: playbook.id,
                status: execution.status,
                executedSteps: execution.executedSteps.length,
                failedSteps: execution.failedSteps.length
            }, 'Playbook execution completed');
        }
        catch (error) {
            logger_js_1.default.error({
                error: error.message,
                incidentId: incident.id,
                playbookId: playbook.id
            }, 'Playbook execution failed with exception');
            execution.status = 'failed';
            execution.completedAt = new Date();
        }
        return execution;
    }
    /**
     * Execute a single playbook step
     */
    async executeStep(incident, playbook, step) {
        logger_js_1.default.info({
            incidentId: incident.id,
            stepName: step.name,
            actionType: step.actionType
        }, 'Executing remediation step');
        try {
            // Simulate action execution (in real implementation, this would call actual remediation logic)
            const outcome = await this.performAction(step.actionType, step.parameters);
            // Log the action with signature
            await this.logger.logAction({
                incidentId: incident.id,
                playbookId: playbook.id,
                actionType: step.actionType,
                actionPayload: step.parameters,
                executedBy: 'system',
                outcome: outcome ? 'success' : 'failure'
            });
            return outcome;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error.message,
                stepName: step.name
            }, 'Step execution failed');
            await this.logger.logAction({
                incidentId: incident.id,
                playbookId: playbook.id,
                actionType: step.actionType,
                actionPayload: step.parameters,
                executedBy: 'system',
                outcome: 'failure',
                errorMessage: error.message
            });
            return false;
        }
    }
    /**
     * Perform the actual remediation action
     */
    async performAction(actionType, parameters) {
        // Mock implementation - in production, this would integrate with actual systems
        logger_js_1.default.info({ actionType, parameters }, 'Performing remediation action');
        switch (actionType) {
            case 'scale_pods':
                logger_js_1.default.info({ replicas: parameters.replicas }, 'Scaling pods');
                return true;
            case 'restart_service':
                logger_js_1.default.info({ service: parameters.service }, 'Restarting service');
                return true;
            case 'enable_rate_limit':
                logger_js_1.default.info({ limit: parameters.limit }, 'Enabling rate limit');
                return true;
            case 'clear_cache':
                logger_js_1.default.info({ cache: parameters.cache }, 'Clearing cache');
                return true;
            case 'kill_connections':
                logger_js_1.default.info({ threshold: parameters.threshold }, 'Killing idle connections');
                return true;
            default:
                logger_js_1.default.warn({ actionType }, 'Unknown action type');
                return false;
        }
    }
    /**
     * Rollback executed steps
     */
    async rollback(incident, playbook, execution) {
        if (!playbook.rollbackSteps || playbook.rollbackSteps.length === 0) {
            logger_js_1.default.warn({ playbookId: playbook.id }, 'No rollback steps defined');
            return;
        }
        logger_js_1.default.info({
            incidentId: incident.id,
            playbookId: playbook.id
        }, 'Executing rollback steps');
        for (const step of playbook.rollbackSteps) {
            await this.executeStep(incident, playbook, step);
        }
    }
    /**
     * Evaluate a condition expression
     */
    evaluateCondition(condition, incident) {
        // Simple condition evaluation - in production, use a proper expression evaluator
        try {
            // Example: "severity == 'critical'" or "impact.includes('database')"
            const context = {
                severity: incident.severity,
                impact: incident.impact,
                statusPageCadence: incident.statusPageCadence
            };
            // Very basic evaluation - replace with proper parser in production
            return condition.includes(incident.severity) || condition.includes('true');
        }
        catch (error) {
            logger_js_1.default.error({ condition, error }, 'Failed to evaluate condition');
            return false;
        }
    }
    /**
     * Get execution status
     */
    getExecution(incidentId) {
        return this.executions.get(incidentId);
    }
    /**
     * List all loaded playbooks
     */
    listPlaybooks() {
        return Array.from(this.playbooks.values());
    }
}
exports.PlaybookOrchestrator = PlaybookOrchestrator;
exports.playbookOrchestrator = PlaybookOrchestrator.getInstance();
