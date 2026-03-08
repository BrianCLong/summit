"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativeSimulationStudio = void 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
class NarrativeSimulationStudio {
    engine;
    campaigns = new Map();
    counterStrategies = new Map();
    operations = [];
    constructor(engine) {
        this.engine = engine;
    }
    configureCampaigns(campaigns) {
        this.campaigns.clear();
        for (const campaign of campaigns) {
            this.campaigns.set(campaign.id, { ...campaign });
        }
    }
    configureCounterNarratives(strategies) {
        this.counterStrategies.clear();
        for (const strategy of strategies) {
            const list = this.counterStrategies.get(strategy.campaignId) ?? [];
            list.push({ ...strategy });
            this.counterStrategies.set(strategy.campaignId, list);
        }
    }
    configureInformationOperations(operations) {
        this.operations = operations.map((operation) => ({ ...operation }));
    }
    modelInfluenceTick(targetActorIds, timestamp) {
        const state = this.engine.getState();
        const ts = timestamp ?? state.timestamp;
        const generatedEvents = [];
        const counterNarrativeCoverage = {};
        const operationEffectiveness = {};
        const notes = [];
        for (const campaign of this.campaigns.values()) {
            const mitigation = this.calculateMitigation(campaign.id);
            counterNarrativeCoverage[campaign.id] = mitigation;
            for (const targetId of targetActorIds) {
                const actor = state.ensureActor(targetId);
                const susceptibility = 1 - actor.getResilience();
                const adjustedIntensity = this.applyMitigation(campaign.intensity, mitigation);
                const weightedIntensity = Number(Math.max(0.1, adjustedIntensity * susceptibility * (1 + actor.getInfluence() / 10)).toFixed(2));
                const event = {
                    id: `${campaign.id}-${targetId}-${ts}-${generatedEvents.length}`,
                    type: 'influence-campaign',
                    actorId: targetId,
                    intensity: weightedIntensity,
                    timestamp: ts,
                    payload: {
                        campaignId: campaign.id,
                        sponsor: campaign.sponsor,
                        narrative: campaign.narratives[0] ?? 'influence-push',
                        channels: campaign.channels,
                        targetAudiences: campaign.targetAudiences,
                        mitigation,
                    },
                };
                this.engine.injectEvent(event);
                generatedEvents.push(event);
            }
            const strategies = this.counterStrategies.get(campaign.id) ?? [];
            for (const strategy of strategies) {
                const counterWeight = Math.max(0.1, strategy.confidence * (strategy.channelAlignment ?? 0.5));
                for (const targetId of targetActorIds) {
                    const counterEvent = {
                        id: `${strategy.id}-${targetId}-${ts}-${generatedEvents.length}`,
                        type: 'counter-narrative',
                        actorId: targetId,
                        intensity: Number(counterWeight.toFixed(2)),
                        timestamp: ts,
                        payload: {
                            campaignId: campaign.id,
                            approach: strategy.approach,
                            protectiveMeasures: strategy.protectiveMeasures ?? [],
                        },
                    };
                    this.engine.injectEvent(counterEvent);
                    generatedEvents.push(counterEvent);
                }
            }
            notes.push(`Campaign ${campaign.id} targeted ${targetActorIds.length} actors with mitigation ${mitigation.toFixed(2)}.`);
        }
        const averageResilience = targetActorIds.reduce((total, id) => total + state.ensureActor(id).getResilience(), 0) /
            Math.max(1, targetActorIds.length);
        const averageMood = targetActorIds.reduce((total, id) => total + state.ensureActor(id).getMood(), 0) /
            Math.max(1, targetActorIds.length);
        const susceptibility = 1 - averageResilience;
        const moraleDrag = averageMood > 0 ? averageMood / 15 : averageMood / 25;
        for (const operation of this.operations) {
            const mitigation = counterNarrativeCoverage[operation.campaignId] ?? 0;
            const baseEffect = operation.amplification * 0.45 + operation.deception * 0.35 + operation.reach * 0.2;
            const score = clamp(baseEffect * (0.6 + susceptibility) * (1 - mitigation) - moraleDrag, 0, 1);
            operationEffectiveness[operation.id] = Number(score.toFixed(3));
        }
        return { timestamp: ts, generatedEvents, counterNarrativeCoverage, operationEffectiveness, notes };
    }
    calculateMitigation(campaignId) {
        const strategies = this.counterStrategies.get(campaignId) ?? [];
        const mitigationScore = strategies.reduce((total, strategy) => {
            const alignment = strategy.channelAlignment ?? 0.5;
            return total + strategy.confidence * alignment * 0.8;
        }, 0);
        return clamp(mitigationScore, 0, 0.8);
    }
    applyMitigation(intensity, mitigation) {
        return Math.max(0.05, intensity * (1 - mitigation));
    }
}
exports.NarrativeSimulationStudio = NarrativeSimulationStudio;
