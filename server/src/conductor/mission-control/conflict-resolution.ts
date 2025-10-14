import { performance } from 'perf_hooks';

export type MissionPriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface MissionSlot {
  start: string;
  end: string;
}

export interface MissionFlexibility {
  maxDelayMinutes: number;
  fallbackSlots?: MissionSlot[];
  negotiationStance?: 'aggressive' | 'balanced' | 'defensive';
}

export interface MissionParticipantRequest {
  missionId: string;
  displayName?: string;
  priorityLevel: MissionPriorityLevel;
  basePriority: number;
  missionImpact: number;
  regulatoryRisk: number;
  urgencyMinutes: number;
  requestedSlot: MissionSlot;
  flexibility: MissionFlexibility;
}

export interface MissionControlArbitrationRules {
  allowPreemption?: boolean;
  fairnessWeight?: number;
  missionImpactWeight?: number;
  urgencyWeight?: number;
  resilienceWeight?: number;
  priorityFloor?: number;
  negotiationLogLimit?: number;
}

export interface MissionControlConflictContext {
  conflictId: string;
  resourceType: string;
  resourceId?: string;
  currentMissionId: string;
  participants: MissionParticipantRequest[];
  arbitrationRules?: MissionControlArbitrationRules;
}

export interface MissionAssignment {
  missionId: string;
  slot: MissionSlot;
  decision: 'primary' | 'fallback';
  negotiated: boolean;
  priorityScore: number;
  concessions: number;
}

export interface MissionDeferral {
  missionId: string;
  reason: string;
  priorityScore: number;
}

export interface NegotiationEvent {
  round: number;
  type: 'allocation' | 'swap' | 'defer' | 'priority-arbitration';
  description: string;
  actors: string[];
  timestamp: string;
}

export interface MissionControlResolution {
  conflictId: string;
  resourceType: string;
  assignments: MissionAssignment[];
  deferred: MissionDeferral[];
  negotiationLog: NegotiationEvent[];
  arbitrationSummary: {
    totalParticipants: number;
    assignments: number;
    deferred: number;
    fairnessIndex: number;
    totalConcessions: number;
    highestPriorityMission: string | null;
    lowestPriorityMission: string | null;
    rounds: number;
    priorityDecisions: string[];
    resolutionLatencyMs: number;
  };
  allowProceed: boolean;
  currentAssignment?: MissionAssignment;
}

interface MissionOptionState {
  slot: MissionSlot;
  label: 'primary' | 'fallback';
  preference: number;
}

interface MissionParticipantState {
  missionId: string;
  priorityScore: number;
  options: MissionOptionState[];
  assignedIndex: number;
  concessionsUsed: number;
  maxConcessions: number;
}

interface SlotAssignment {
  missionId: string;
  optionIndex: number;
}

const DEFAULT_RULES: Required<MissionControlArbitrationRules> = {
  allowPreemption: true,
  fairnessWeight: 0.15,
  missionImpactWeight: 0.25,
  urgencyWeight: 0.2,
  resilienceWeight: 0.15,
  priorityFloor: 0,
  negotiationLogLimit: 75,
};

const PRIORITY_MULTIPLIER: Record<MissionPriorityLevel, number> = {
  critical: 1.3,
  high: 1.1,
  medium: 0.9,
  low: 0.75,
};

export class MissionControlConflictResolver {
  resolve(context: MissionControlConflictContext): MissionControlResolution {
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
    const start = performance.now();

    const participants = context.participants.map((participant) =>
      this.buildParticipantState(participant, rules),
    );
    participants.sort((a, b) => b.priorityScore - a.priorityScore);

    const statesByMission = new Map<string, MissionParticipantState>();
    participants.forEach((state) => statesByMission.set(state.missionId, state));

    const assignments = new Map<string, SlotAssignment>();
    const negotiationLog: NegotiationEvent[] = [];
    const priorityDecisions: string[] = [];

    let round = 0;
    for (const participant of participants) {
      round += 1;
      const allocated = this.allocateParticipant(
        participant,
        assignments,
        statesByMission,
        negotiationLog,
        priorityDecisions,
        rules,
        round,
      );

      if (!allocated) {
        this.pushNegotiationEvent(
          negotiationLog,
          {
            round,
            type: 'defer',
            description: `Mission ${participant.missionId} deferred – no acceptable slot available`,
            actors: [participant.missionId],
            timestamp: new Date().toISOString(),
          },
          rules.negotiationLogLimit,
        );
      }
    }

    const assignmentsList: MissionAssignment[] = participants
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

    const deferredList: MissionDeferral[] = participants
      .filter((state) => state.assignedIndex < 0)
      .map((state) => ({
        missionId: state.missionId,
        reason: 'No viable slot after arbitration',
        priorityScore: Number(state.priorityScore.toFixed(2)),
      }));

    const fairnessIndex = this.calculateFairnessIndex(participants);
    const totalConcessions = participants.reduce(
      (sum, state) => sum + state.concessionsUsed,
      0,
    );

    const resolutionLatencyMs = Math.round(performance.now() - start);

    const currentAssignment = assignmentsList.find(
      (assignment) => assignment.missionId === context.currentMissionId,
    );

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

  private buildParticipantState(
    participant: MissionParticipantRequest,
    rules: Required<MissionControlArbitrationRules>,
  ): MissionParticipantState {
    const priorityScore = this.computePriorityScore(participant, rules);
    const options = this.buildMissionOptions(participant);
    const fallbackCount = Math.max(0, options.length - 1);
    const maxConcessionsByFlex = Math.min(
      fallbackCount,
      Math.max(0, Math.floor((participant.flexibility.maxDelayMinutes || 0) / 15)),
    );

    let maxConcessions = maxConcessionsByFlex;
    const stance = participant.flexibility.negotiationStance || 'balanced';
    if (stance === 'aggressive') {
      maxConcessions = Math.max(0, maxConcessions - 1);
    } else if (stance === 'defensive') {
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

  private buildMissionOptions(participant: MissionParticipantRequest): MissionOptionState[] {
    const options: MissionOptionState[] = [];
    const seen = new Set<string>();

    const addOption = (slot: MissionSlot, label: 'primary' | 'fallback', preference: number) => {
      const key = this.slotKey(slot);
      if (seen.has(key)) return;
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

  private computePriorityScore(
    participant: MissionParticipantRequest,
    rules: Required<MissionControlArbitrationRules>,
  ): number {
    const levelMultiplier = PRIORITY_MULTIPLIER[participant.priorityLevel];
    const normalizedBase = Math.min(100, Math.max(0, participant.basePriority));
    const normalizedImpact = this.clamp01(participant.missionImpact) * 100;
    const normalizedRisk = this.clamp01(participant.regulatoryRisk) * 100;
    const urgencyScore = this.calculateUrgencyScore(participant.urgencyMinutes);
    const flexibilityPenalty = Math.min(
      25,
      Math.max(0, participant.flexibility.maxDelayMinutes / 10),
    );

    let score = normalizedBase * 0.5 * levelMultiplier;
    score += normalizedImpact * rules.missionImpactWeight;
    score += normalizedRisk * rules.resilienceWeight;
    score += urgencyScore * rules.urgencyWeight;
    score -= flexibilityPenalty;
    score = Math.max(rules.priorityFloor, score);
    return Number(score.toFixed(2));
  }

  private allocateParticipant(
    participant: MissionParticipantState,
    assignments: Map<string, SlotAssignment>,
    statesByMission: Map<string, MissionParticipantState>,
    negotiationLog: NegotiationEvent[],
    priorityDecisions: string[],
    rules: Required<MissionControlArbitrationRules>,
    round: number,
  ): boolean {
    for (let optionIndex = 0; optionIndex < participant.options.length; optionIndex += 1) {
      const option = participant.options[optionIndex];
      const key = this.slotKey(option.slot);
      const currentAssignment = assignments.get(key);

      if (!currentAssignment) {
        assignments.set(key, { missionId: participant.missionId, optionIndex });
        participant.assignedIndex = optionIndex;
        if (option.label === 'fallback') {
          participant.concessionsUsed = Math.min(
            participant.maxConcessions,
            participant.concessionsUsed + 1,
          );
        }
        this.pushNegotiationEvent(
          negotiationLog,
          {
            round,
            type: 'allocation',
            description: `Mission ${participant.missionId} assigned to ${option.label} slot ${option.slot.start} → ${option.slot.end}`,
            actors: [participant.missionId],
            timestamp: new Date().toISOString(),
          },
          rules.negotiationLogLimit,
        );
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
      incumbent.concessionsUsed = Math.min(
        incumbent.maxConcessions,
        incumbent.concessionsUsed + 1,
      );

      this.pushNegotiationEvent(
        negotiationLog,
        {
          round,
          type: 'swap',
          description: `Mission ${incumbent.missionId} shifted to fallback slot ${fallbackOption.slot.start} → ${fallbackOption.slot.end}`,
          actors: [participant.missionId, incumbent.missionId],
          timestamp: new Date().toISOString(),
        },
        rules.negotiationLogLimit,
      );

      this.pushNegotiationEvent(
        negotiationLog,
        {
          round,
          type: 'priority-arbitration',
          description: `Mission ${participant.missionId} preempted ${incumbent.missionId} (scores ${participant.priorityScore.toFixed(2)} vs ${incumbent.priorityScore.toFixed(2)})`,
          actors: [participant.missionId, incumbent.missionId],
          timestamp: new Date().toISOString(),
        },
        rules.negotiationLogLimit,
      );

      priorityDecisions.push(
        `Mission ${participant.missionId} outranked ${incumbent.missionId} (${participant.priorityScore.toFixed(1)} vs ${incumbent.priorityScore.toFixed(1)})`,
      );

      assignments.set(key, { missionId: participant.missionId, optionIndex });
      participant.assignedIndex = optionIndex;
      return true;
    }

    return false;
  }

  private findFallbackOption(
    participant: MissionParticipantState,
    assignments: Map<string, SlotAssignment>,
  ): number {
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

  private calculateFairnessIndex(participants: MissionParticipantState[]): number {
    const totalScore = participants.reduce((sum, p) => sum + p.priorityScore, 0);
    if (totalScore === 0) {
      return 1;
    }

    const assignedScore = participants
      .filter((p) => p.assignedIndex >= 0)
      .reduce((sum, p) => sum + p.priorityScore, 0);

    return assignedScore / totalScore;
  }

  private pushNegotiationEvent(
    negotiationLog: NegotiationEvent[],
    event: NegotiationEvent,
    limit: number,
  ): void {
    if (negotiationLog.length >= limit) {
      return;
    }

    negotiationLog.push(event);
  }

  private calculateUrgencyScore(minutes: number): number {
    if (!Number.isFinite(minutes)) {
      return 50;
    }

    const clamped = Math.max(0, Math.min(720, minutes));
    const score = ((720 - clamped) / 720) * 100;
    return Number(score.toFixed(2));
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private slotKey(slot: MissionSlot): string {
    return `${slot.start}|${slot.end}`;
  }
}
