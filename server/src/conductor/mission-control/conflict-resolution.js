"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionControlConflictResolver = void 0;
const perf_hooks_1 = require("perf_hooks");
const DEFAULT_RULES = {
    allowPreemption: true,
    fairnessWeight: 0.15,
    missionImpactWeight: 0.25,
    urgencyWeight: 0.2,
    resilienceWeight: 0.15,
    priorityFloor: 0,
    negotiationLogLimit: 75,
};
const PRIORITY_MULTIPLIER = {
    critical: 1.3,
    high: 1.1,
    medium: 0.9,
    low: 0.75,
};
class MissionControlConflictResolver {
    resolve(context) {
        if (!context.participants.length) {
            return {
                conflictId: context.conflictId,
                resourceType: context.resourceType,
                assignments: [],
                deferred: [],
                negotiationLog: [],
                arbitrationSummary: {
                    totalParticipants: 0,
                    assignments: 0,
                    deferred: 0,
                    fairnessIndex: 1,
                    totalConcessions: 0,
                    highestPriorityMission: null,
                    lowestPriorityMission: null,
                    rounds: 0,
                    priorityDecisions: [],
                    resolutionLatencyMs: 0,
                },
                allowProceed: false,
            };
        }
        const rules = { ...DEFAULT_RULES, ...(context.arbitrationRules || {}) };
        const start = perf_hooks_1.performance.now();
        const participants = context.participants.map((participant) => this.buildParticipantState(participant, rules));
        participants.sort((a, b) => b.priorityScore - a.priorityScore);
        const statesByMission = new Map();
        participants.forEach((state) => statesByMission.set(state.missionId, state));
        const assignments = new Map();
        const negotiationLog = [];
        const priorityDecisions = [];
        let round = 0;
        for (const participant of participants) {
            round += 1;
            const allocated = this.allocateParticipant(participant, assignments, statesByMission, negotiationLog, priorityDecisions, rules, round);
            if (!allocated) {
                this.pushNegotiationEvent(negotiationLog, {
                    round,
                    type: 'defer',
                    description: `Mission ${participant.missionId} deferred – no acceptable slot available`,
                    actors: [participant.missionId],
                    timestamp: new Date().toISOString(),
                }, rules.negotiationLogLimit);
            }
        }
        const assignmentsList = participants
            .filter((state) => state.assignedIndex >= 0)
            .map((state) => {
            const option = state.options[state.assignedIndex];
            return {
                missionId: state.missionId,
                slot: option.slot,
                decision: option.label,
                negotiated: option.label === 'fallback',
                priorityScore: Number(state.priorityScore.toFixed(2)),
                concessions: state.concessionsUsed,
            };
        });
        const deferredList = participants
            .filter((state) => state.assignedIndex < 0)
            .map((state) => ({
            missionId: state.missionId,
            reason: 'No viable slot after arbitration',
            priorityScore: Number(state.priorityScore.toFixed(2)),
        }));
        const fairnessIndex = this.calculateFairnessIndex(participants);
        const totalConcessions = participants.reduce((sum, state) => sum + state.concessionsUsed, 0);
        const resolutionLatencyMs = Math.round(perf_hooks_1.performance.now() - start);
        const currentAssignment = assignmentsList.find((assignment) => assignment.missionId === context.currentMissionId);
        return {
            conflictId: context.conflictId,
            resourceType: context.resourceType,
            assignments: assignmentsList,
            deferred: deferredList,
            negotiationLog,
            arbitrationSummary: {
                totalParticipants: participants.length,
                assignments: assignmentsList.length,
                deferred: deferredList.length,
                fairnessIndex: Number(fairnessIndex.toFixed(2)),
                totalConcessions,
                highestPriorityMission: participants[0]?.missionId || null,
                lowestPriorityMission: participants[participants.length - 1]?.missionId || null,
                rounds: round,
                priorityDecisions,
                resolutionLatencyMs,
            },
            allowProceed: Boolean(currentAssignment),
            currentAssignment,
        };
    }
    buildParticipantState(participant, rules) {
        const priorityScore = this.computePriorityScore(participant, rules);
        const options = this.buildMissionOptions(participant);
        const fallbackCount = Math.max(0, options.length - 1);
        const maxConcessionsByFlex = Math.min(fallbackCount, Math.max(0, Math.floor((participant.flexibility.maxDelayMinutes || 0) / 15)));
        let maxConcessions = maxConcessionsByFlex;
        const stance = participant.flexibility.negotiationStance || 'balanced';
        if (stance === 'aggressive') {
            maxConcessions = Math.max(0, maxConcessions - 1);
        }
        else if (stance === 'defensive') {
            maxConcessions = Math.min(fallbackCount, maxConcessions + 1);
        }
        return {
            missionId: participant.missionId,
            priorityScore,
            options,
            assignedIndex: -1,
            concessionsUsed: 0,
            maxConcessions,
        };
    }
    buildMissionOptions(participant) {
        const options = [];
        const seen = new Set();
        const addOption = (slot, label, preference) => {
            const key = this.slotKey(slot);
            if (seen.has(key))
                return;
            seen.add(key);
            options.push({ slot, label, preference });
        };
        addOption(participant.requestedSlot, 'primary', 0);
        participant.flexibility.fallbackSlots?.forEach((slot, index) => {
            addOption(slot, 'fallback', index + 1);
        });
        options.sort((a, b) => a.preference - b.preference);
        return options;
    }
    computePriorityScore(participant, rules) {
        const levelMultiplier = PRIORITY_MULTIPLIER[participant.priorityLevel];
        const normalizedBase = Math.min(100, Math.max(0, participant.basePriority));
        const normalizedImpact = this.clamp01(participant.missionImpact) * 100;
        const normalizedRisk = this.clamp01(participant.regulatoryRisk) * 100;
        const urgencyScore = this.calculateUrgencyScore(participant.urgencyMinutes);
        const flexibilityPenalty = Math.min(25, Math.max(0, participant.flexibility.maxDelayMinutes / 10));
        let score = normalizedBase * 0.5 * levelMultiplier;
        score += normalizedImpact * rules.missionImpactWeight;
        score += normalizedRisk * rules.resilienceWeight;
        score += urgencyScore * rules.urgencyWeight;
        score -= flexibilityPenalty;
        score = Math.max(rules.priorityFloor, score);
        return Number(score.toFixed(2));
    }
    allocateParticipant(participant, assignments, statesByMission, negotiationLog, priorityDecisions, rules, round) {
        for (let optionIndex = 0; optionIndex < participant.options.length; optionIndex += 1) {
            const option = participant.options[optionIndex];
            const key = this.slotKey(option.slot);
            const currentAssignment = assignments.get(key);
            if (!currentAssignment) {
                assignments.set(key, { missionId: participant.missionId, optionIndex });
                participant.assignedIndex = optionIndex;
                if (option.label === 'fallback') {
                    participant.concessionsUsed = Math.min(participant.maxConcessions, participant.concessionsUsed + 1);
                }
                this.pushNegotiationEvent(negotiationLog, {
                    round,
                    type: 'allocation',
                    description: `Mission ${participant.missionId} assigned to ${option.label} slot ${option.slot.start} → ${option.slot.end}`,
                    actors: [participant.missionId],
                    timestamp: new Date().toISOString(),
                }, rules.negotiationLogLimit);
                return true;
            }
            if (currentAssignment.missionId === participant.missionId) {
                participant.assignedIndex = optionIndex;
                return true;
            }
            const incumbent = statesByMission.get(currentAssignment.missionId);
            if (!incumbent) {
                continue;
            }
            if (!rules.allowPreemption) {
                continue;
            }
            if (participant.priorityScore <= incumbent.priorityScore) {
                continue;
            }
            const fallbackIndex = this.findFallbackOption(incumbent, assignments);
            if (fallbackIndex === -1) {
                continue;
            }
            const fallbackOption = incumbent.options[fallbackIndex];
            assignments.set(this.slotKey(fallbackOption.slot), {
                missionId: incumbent.missionId,
                optionIndex: fallbackIndex,
            });
            incumbent.assignedIndex = fallbackIndex;
            incumbent.concessionsUsed = Math.min(incumbent.maxConcessions, incumbent.concessionsUsed + 1);
            this.pushNegotiationEvent(negotiationLog, {
                round,
                type: 'swap',
                description: `Mission ${incumbent.missionId} shifted to fallback slot ${fallbackOption.slot.start} → ${fallbackOption.slot.end}`,
                actors: [participant.missionId, incumbent.missionId],
                timestamp: new Date().toISOString(),
            }, rules.negotiationLogLimit);
            this.pushNegotiationEvent(negotiationLog, {
                round,
                type: 'priority-arbitration',
                description: `Mission ${participant.missionId} preempted ${incumbent.missionId} (scores ${participant.priorityScore.toFixed(2)} vs ${incumbent.priorityScore.toFixed(2)})`,
                actors: [participant.missionId, incumbent.missionId],
                timestamp: new Date().toISOString(),
            }, rules.negotiationLogLimit);
            priorityDecisions.push(`Mission ${participant.missionId} outranked ${incumbent.missionId} (${participant.priorityScore.toFixed(1)} vs ${incumbent.priorityScore.toFixed(1)})`);
            assignments.set(key, { missionId: participant.missionId, optionIndex });
            participant.assignedIndex = optionIndex;
            return true;
        }
        return false;
    }
    findFallbackOption(participant, assignments) {
        if (participant.concessionsUsed >= participant.maxConcessions) {
            return -1;
        }
        for (let index = participant.assignedIndex + 1; index < participant.options.length; index += 1) {
            const option = participant.options[index];
            if (!assignments.has(this.slotKey(option.slot))) {
                return index;
            }
        }
        return -1;
    }
    calculateFairnessIndex(participants) {
        const totalScore = participants.reduce((sum, p) => sum + p.priorityScore, 0);
        if (totalScore === 0) {
            return 1;
        }
        const assignedScore = participants
            .filter((p) => p.assignedIndex >= 0)
            .reduce((sum, p) => sum + p.priorityScore, 0);
        return assignedScore / totalScore;
    }
    pushNegotiationEvent(negotiationLog, event, limit) {
        if (negotiationLog.length >= limit) {
            return;
        }
        negotiationLog.push(event);
    }
    calculateUrgencyScore(minutes) {
        if (!Number.isFinite(minutes)) {
            return 50;
        }
        const clamped = Math.max(0, Math.min(720, minutes));
        const score = ((720 - clamped) / 720) * 100;
        return Number(score.toFixed(2));
    }
    clamp01(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        if (value < 0)
            return 0;
        if (value > 1)
            return 1;
        return value;
    }
    slotKey(slot) {
        return `${slot.start}|${slot.end}`;
    }
}
exports.MissionControlConflictResolver = MissionControlConflictResolver;
