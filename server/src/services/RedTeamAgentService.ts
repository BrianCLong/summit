import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { narrativeSimulationManager } from '../narrative/manager.js';
import { NarrativeState, NarrativeEvent, EntityDynamicState } from '../narrative/types.js';
// We would ideally inject an LLM instance here, using a mocked strategy for now
// to avoid heavy API usage during testing, but retaining the structure of an LLM call.

export interface RedTeamConfig {
    simulationId: string;
    targetTheme: string;
    targetMomentum: number;
    maxTicks: number; // The "budget"
}

export interface RedTeamReport {
    campaignId: string;
    simulationId: string;
    targetTheme: string;
    status: 'success' | 'exhausted' | 'failed' | 'running';
    ticksElapsed: number;
    initialMomentum: number;
    finalMomentum?: number;
    eventsInjected: NarrativeEvent[];
    strategySummary: string;
    markdownDoc?: string;
}

export class RedTeamAgentService {
    private activeCampaigns = new Map<string, RedTeamReport>();
    private loopIntervals = new Map<string, NodeJS.Timeout>();

    /**
     * Starts an asynchronous agent loop that interacts with the Narrative Simulator.
     */
    public async startCampaign(config: RedTeamConfig): Promise<string> {
        const campaignId = randomUUID();
        const state = narrativeSimulationManager.getState(config.simulationId);

        if (!state) {
            throw new Error(`Simulation not found: ${config.simulationId}`);
        }

        const initialMomentum = this.getMomentumForTheme(state, config.targetTheme);

        const report: RedTeamReport = {
            campaignId,
            simulationId: config.simulationId,
            targetTheme: config.targetTheme,
            status: 'running',
            ticksElapsed: 0,
            initialMomentum,
            eventsInjected: [],
            strategySummary: `Attempting to maximize '${config.targetTheme}' to >= ${config.targetMomentum}`
        };

        this.activeCampaigns.set(campaignId, report);
        logger.info({ campaignId, config }, 'RedTeamAgent: Started new campaign');

        // Start background loop (using setInterval for async processing without blocking)
        const interval = setInterval(() => this.tickLoop(campaignId, config), 2000);
        this.loopIntervals.set(campaignId, interval);

        return campaignId;
    }

    public getReport(campaignId: string): RedTeamReport | undefined {
        return this.activeCampaigns.get(campaignId);
    }

    private async tickLoop(campaignId: string, config: RedTeamConfig) {
        const report = this.activeCampaigns.get(campaignId);
        if (!report || report.status !== 'running') {
            this.cleanup(campaignId);
            return;
        }

        try {
            const state = narrativeSimulationManager.getState(config.simulationId);
            if (!state) throw new Error('Simulation state lost');

            const currentMomentum = this.getMomentumForTheme(state, config.targetTheme);
            report.ticksElapsed++;

            // 1. Check Win Condition
            if (currentMomentum >= config.targetMomentum) {
                report.status = 'success';
                report.finalMomentum = currentMomentum;
                this.finishCampaign(campaignId, report);
                return;
            }

            // 2. Check Budget Exhaustion
            if (report.ticksElapsed >= config.maxTicks) {
                report.status = 'exhausted';
                report.finalMomentum = currentMomentum;
                this.finishCampaign(campaignId, report);
                return;
            }

            // 3. Observation & LLM Prediction (Simulated Agentic Step)
            const targetEntities = Object.values(state.entities);
            const randomTarget = targetEntities[Math.floor(Math.random() * targetEntities.length)] as EntityDynamicState;

            const adversarialEvent: NarrativeEvent = {
                id: randomUUID(),
                type: 'intervention',
                theme: config.targetTheme,
                intensity: 0.8 + (Math.random() * 0.2), // High intensity 0.8-1.0
                sentimentShift: 0.2,
                influenceShift: 0.1,
                actorId: randomTarget.id,
                targetIds: [],
                description: `Adversarial bot net amplifying ${config.targetTheme} rhetoric targeting ${randomTarget.name}.`,
                scheduledTick: state.tick + 1
            };

            // 4. Action Execution
            narrativeSimulationManager.injectActorAction(
                config.simulationId,
                adversarialEvent.actorId!,
                adversarialEvent.description,
                {
                    theme: adversarialEvent.theme,
                    intensity: adversarialEvent.intensity,
                    sentimentShift: adversarialEvent.sentimentShift,
                    influenceShift: adversarialEvent.influenceShift
                }
            );

            report.eventsInjected.push(adversarialEvent);

            // Advance Koshchei Engine 1 Tick automatically because the RedTeam agent "acts and waits"
            // (Assuming the simulation isn't advancing itself on a separate clock)
            const engine = (narrativeSimulationManager as any).engines.get(config.simulationId);
            if (engine) await engine.tick(1);

            logger.debug({ campaignId, tick: report.ticksElapsed, momentum: currentMomentum }, 'RedTeamAgent: Advanced loop');

        } catch (error: any) {
            logger.error({ campaignId, error: error.message }, 'RedTeamAgent: Loop failed');
            report.status = 'failed';
            this.finishCampaign(campaignId, report);
        }
    }

    private finishCampaign(campaignId: string, report: RedTeamReport) {
        this.cleanup(campaignId);

        // Generate the Story 5.3 Automated "After Action" Report in Markdown
        report.markdownDoc = `# Red Team After Action Report
**Campaign ID:** ${report.campaignId}
**Simulation ID:** ${report.simulationId}
**Target Theme:** ${report.targetTheme}
**Status:** ${report.status.toUpperCase()}

## Outcome
- **Initial Momentum:** ${(report.initialMomentum * 100).toFixed(1)}%
- **Final Momentum:** ${(report.finalMomentum ? report.finalMomentum * 100 : 0).toFixed(1)}%
- **Ticks Used (Budget):** ${report.ticksElapsed}

## Strategy Log
The agent injected ${report.eventsInjected.length} adversarial events.
${report.eventsInjected.map((e, i) => `
### Action ${i + 1}
- **Actor:** ${e.actorId}
- **Intensity:** ${e.intensity.toFixed(2)}
- **Description:** ${e.description}
`).join('\n')}
`;

        logger.info({ campaignId, status: report.status }, 'RedTeamAgent: Campaign Concluded. Report Generated.');

        // Note: To fully satisfy Story 5.3, this should be written to ProvenanceLedger.
        // Assuming ProvenanceService exists, we would call it here.
    }

    private cleanup(campaignId: string) {
        const interval = this.loopIntervals.get(campaignId);
        if (interval) {
            clearInterval(interval);
            this.loopIntervals.delete(campaignId);
        }
    }

    private getMomentumForTheme(state: NarrativeState, theme: string): number {
        // Mirroring calculation from the `/arcs` API
        let momentumSum = 0;
        Object.values(state.entities).forEach(entity => {
            const historyEntry = [...entity.history].reverse()[0];
            if (historyEntry) {
                const themeAffinity = entity.themes[theme] ?? 0;
                const normalizedSentiment = (historyEntry.sentiment + 1) / 2;
                momentumSum += normalizedSentiment * historyEntry.influence * themeAffinity;
            }
        });
        return Math.max(0, Math.min(1, momentumSum));
    }
}

export const redTeamAgentService = new RedTeamAgentService();
