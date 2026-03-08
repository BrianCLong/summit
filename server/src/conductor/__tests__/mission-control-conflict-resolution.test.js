"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conflict_resolution_js_1 = require("../mission-control/conflict-resolution.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('MissionControlConflictResolver', () => {
    const resolver = new conflict_resolution_js_1.MissionControlConflictResolver();
    const primarySlot = {
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-01T01:00:00Z',
    };
    const fallbackSlot = {
        start: '2025-01-01T01:00:00Z',
        end: '2025-01-01T02:00:00Z',
    };
    (0, globals_1.it)('assigns highest priority mission to contested slot and negotiates fallback for lower priority mission', () => {
        const resolution = resolver.resolve({
            conflictId: 'conflict-1',
            resourceType: 'uplink-window',
            currentMissionId: 'mission-alpha',
            participants: [
                {
                    missionId: 'mission-alpha',
                    priorityLevel: 'critical',
                    basePriority: 92,
                    missionImpact: 0.95,
                    regulatoryRisk: 0.6,
                    urgencyMinutes: 20,
                    requestedSlot: primarySlot,
                    flexibility: { maxDelayMinutes: 10 },
                },
                {
                    missionId: 'mission-beta',
                    priorityLevel: 'medium',
                    basePriority: 55,
                    missionImpact: 0.5,
                    regulatoryRisk: 0.3,
                    urgencyMinutes: 120,
                    requestedSlot: primarySlot,
                    flexibility: {
                        maxDelayMinutes: 90,
                        fallbackSlots: [fallbackSlot],
                        negotiationStance: 'defensive',
                    },
                },
            ],
        });
        const alphaAssignment = resolution.assignments.find((a) => a.missionId === 'mission-alpha');
        const betaAssignment = resolution.assignments.find((a) => a.missionId === 'mission-beta');
        (0, globals_1.expect)(alphaAssignment).toBeDefined();
        (0, globals_1.expect)(alphaAssignment?.decision).toBe('primary');
        (0, globals_1.expect)(alphaAssignment?.negotiated).toBe(false);
        (0, globals_1.expect)(betaAssignment).toBeDefined();
        (0, globals_1.expect)(betaAssignment?.decision).toBe('fallback');
        (0, globals_1.expect)(betaAssignment?.slot).toEqual(fallbackSlot);
        (0, globals_1.expect)(betaAssignment?.negotiated).toBe(true);
        (0, globals_1.expect)(resolution.allowProceed).toBe(true);
        (0, globals_1.expect)(resolution.arbitrationSummary.totalConcessions).toBe(1);
        (0, globals_1.expect)(resolution.arbitrationSummary.fairnessIndex).toBe(1);
    });
    (0, globals_1.it)('defers mission without viable fallback when arbitration favors higher priority mission', () => {
        const resolution = resolver.resolve({
            conflictId: 'conflict-2',
            resourceType: 'analysis-lab',
            currentMissionId: 'mission-low',
            participants: [
                {
                    missionId: 'mission-critical',
                    priorityLevel: 'critical',
                    basePriority: 88,
                    missionImpact: 0.8,
                    regulatoryRisk: 0.5,
                    urgencyMinutes: 15,
                    requestedSlot: primarySlot,
                    flexibility: { maxDelayMinutes: 5 },
                },
                {
                    missionId: 'mission-low',
                    priorityLevel: 'low',
                    basePriority: 40,
                    missionImpact: 0.3,
                    regulatoryRisk: 0.1,
                    urgencyMinutes: 240,
                    requestedSlot: primarySlot,
                    flexibility: { maxDelayMinutes: 0 },
                },
            ],
        });
        (0, globals_1.expect)(resolution.allowProceed).toBe(false);
        (0, globals_1.expect)(resolution.deferred).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({ missionId: 'mission-low' }),
        ]));
        (0, globals_1.expect)(resolution.arbitrationSummary.fairnessIndex).toBeLessThan(1);
        (0, globals_1.expect)(resolution.negotiationLog.some((event) => event.type === 'defer' && event.actors.includes('mission-low'))).toBe(true);
    });
    (0, globals_1.it)('calculates fairness index and concession totals across mixed outcomes', () => {
        const resolution = resolver.resolve({
            conflictId: 'conflict-3',
            resourceType: 'downlink-pipeline',
            currentMissionId: 'mission-alpha',
            participants: [
                {
                    missionId: 'mission-alpha',
                    priorityLevel: 'critical',
                    basePriority: 85,
                    missionImpact: 0.8,
                    regulatoryRisk: 0.4,
                    urgencyMinutes: 30,
                    requestedSlot: primarySlot,
                    flexibility: { maxDelayMinutes: 5 },
                },
                {
                    missionId: 'mission-beta',
                    priorityLevel: 'high',
                    basePriority: 70,
                    missionImpact: 0.6,
                    regulatoryRisk: 0.4,
                    urgencyMinutes: 90,
                    requestedSlot: primarySlot,
                    flexibility: { maxDelayMinutes: 60, fallbackSlots: [fallbackSlot] },
                },
                {
                    missionId: 'mission-gamma',
                    priorityLevel: 'medium',
                    basePriority: 55,
                    missionImpact: 0.5,
                    regulatoryRisk: 0.2,
                    urgencyMinutes: 180,
                    requestedSlot: primarySlot,
                    flexibility: { maxDelayMinutes: 5 },
                },
            ],
        });
        (0, globals_1.expect)(resolution.assignments.some((a) => a.missionId === 'mission-gamma')).toBe(false);
        (0, globals_1.expect)(resolution.deferred).toHaveLength(1);
        (0, globals_1.expect)(resolution.arbitrationSummary.totalConcessions).toBe(1);
        (0, globals_1.expect)(resolution.arbitrationSummary.fairnessIndex).toBeGreaterThan(0.7);
        (0, globals_1.expect)(resolution.arbitrationSummary.fairnessIndex).toBeLessThan(0.8);
    });
});
