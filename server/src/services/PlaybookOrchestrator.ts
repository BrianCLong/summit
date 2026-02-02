import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import logger from '../utils/logger.js';
import { RemediationExecutionLogger, RemediationAction } from './RemediationExecutionLogger.js';
import type { Incident } from '../trust-center/service.js';

export interface PlaybookStep {
    name: string;
    actionType: string;
    parameters: Record<string, any>;
    condition?: string;
    onFailure?: 'continue' | 'abort' | 'rollback';
}

export interface Playbook {
    id: string;
    name: string;
    description: string;
    triggerPatterns: string[];
    severity: string[];
    steps: PlaybookStep[];
    rollbackSteps?: PlaybookStep[];
}

export interface PlaybookExecution {
    playbookId: string;
    incidentId: string;
    startedAt: Date;
    completedAt?: Date;
    status: 'running' | 'completed' | 'failed' | 'rolled_back';
    executedSteps: string[];
    failedSteps: string[];
}

export class PlaybookOrchestrator {
    private static instance: PlaybookOrchestrator;
    private playbooks: Map<string, Playbook> = new Map();
    private executions: Map<string, PlaybookExecution> = new Map();
    private logger: RemediationExecutionLogger;
    private playbookDir: string;

    private constructor() {
        this.logger = RemediationExecutionLogger.getInstance();
        this.playbookDir = join(process.cwd(), 'config/playbooks');
        this.loadPlaybooks();
    }

    public static getInstance(): PlaybookOrchestrator {
        if (!PlaybookOrchestrator.instance) {
            PlaybookOrchestrator.instance = new PlaybookOrchestrator();
        }
        return PlaybookOrchestrator.instance;
    }

    /**
     * Load all playbook definitions from YAML files
     */
    private loadPlaybooks(): void {
        try {
            const files = readdirSync(this.playbookDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

            for (const file of files) {
                const content = readFileSync(join(this.playbookDir, file), 'utf-8');
                const playbook = parseYaml(content) as Playbook;
                this.playbooks.set(playbook.id, playbook);
                logger.info({ playbookId: playbook.id, name: playbook.name }, 'Loaded remediation playbook');
            }

            logger.info({ count: this.playbooks.size }, 'Playbook orchestrator initialized');
        } catch (error: any) {
            logger.warn({ error: error.message }, 'Failed to load playbooks - directory may not exist yet');
        }
    }

    /**
     * Find matching playbook for an incident
     */
    public findPlaybook(incident: Incident): Playbook | null {
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
                logger.info({
                    incidentId: incident.id,
                    playbookId: playbook.id
                }, 'Matched playbook for incident');
                return playbook;
            }
        }

        logger.warn({ incidentId: incident.id }, 'No matching playbook found for incident');
        return null;
    }

    /**
     * Execute a playbook for an incident
     */
    public async executePlaybook(incident: Incident, playbook: Playbook): Promise<PlaybookExecution> {
        const execution: PlaybookExecution = {
            playbookId: playbook.id,
            incidentId: incident.id,
            startedAt: new Date(),
            status: 'running',
            executedSteps: [],
            failedSteps: []
        };

        this.executions.set(incident.id, execution);

        logger.info({
            incidentId: incident.id,
            playbookId: playbook.id,
            stepCount: playbook.steps.length
        }, 'Starting playbook execution');

        try {
            for (const step of playbook.steps) {
                // Evaluate condition if present
                if (step.condition && !this.evaluateCondition(step.condition, incident)) {
                    logger.info({ stepName: step.name }, 'Skipping step due to condition');
                    continue;
                }

                const success = await this.executeStep(incident, playbook, step);

                if (success) {
                    execution.executedSteps.push(step.name);
                } else {
                    execution.failedSteps.push(step.name);

                    // Handle failure based on strategy
                    if (step.onFailure === 'abort') {
                        logger.error({ stepName: step.name }, 'Step failed - aborting playbook');
                        execution.status = 'failed';
                        break;
                    } else if (step.onFailure === 'rollback') {
                        logger.warn({ stepName: step.name }, 'Step failed - initiating rollback');
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

            logger.info({
                incidentId: incident.id,
                playbookId: playbook.id,
                status: execution.status,
                executedSteps: execution.executedSteps.length,
                failedSteps: execution.failedSteps.length
            }, 'Playbook execution completed');

        } catch (error: any) {
            logger.error({
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
    private async executeStep(incident: Incident, playbook: Playbook, step: PlaybookStep): Promise<boolean> {
        logger.info({
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
        } catch (error: any) {
            logger.error({
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
    private async performAction(actionType: string, parameters: Record<string, any>): Promise<boolean> {
        // Mock implementation - in production, this would integrate with actual systems
        logger.info({ actionType, parameters }, 'Performing remediation action');

        switch (actionType) {
            case 'scale_pods':
                logger.info({ replicas: parameters.replicas }, 'Scaling pods');
                return true;
            case 'restart_service':
                logger.info({ service: parameters.service }, 'Restarting service');
                return true;
            case 'enable_rate_limit':
                logger.info({ limit: parameters.limit }, 'Enabling rate limit');
                return true;
            case 'clear_cache':
                logger.info({ cache: parameters.cache }, 'Clearing cache');
                return true;
            case 'kill_connections':
                logger.info({ threshold: parameters.threshold }, 'Killing idle connections');
                return true;
            default:
                logger.warn({ actionType }, 'Unknown action type');
                return false;
        }
    }

    /**
     * Rollback executed steps
     */
    private async rollback(incident: Incident, playbook: Playbook, execution: PlaybookExecution): Promise<void> {
        if (!playbook.rollbackSteps || playbook.rollbackSteps.length === 0) {
            logger.warn({ playbookId: playbook.id }, 'No rollback steps defined');
            return;
        }

        logger.info({
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
    private evaluateCondition(condition: string, incident: Incident): boolean {
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
        } catch (error) {
            logger.error({ condition, error }, 'Failed to evaluate condition');
            return false;
        }
    }

    /**
     * Get execution status
     */
    public getExecution(incidentId: string): PlaybookExecution | undefined {
        return this.executions.get(incidentId);
    }

    /**
     * List all loaded playbooks
     */
    public listPlaybooks(): Playbook[] {
        return Array.from(this.playbooks.values());
    }
}

export const playbookOrchestrator = PlaybookOrchestrator.getInstance();
