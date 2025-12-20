/**
 * Exercise Manager - Training exercise orchestration
 * TRAINING/SIMULATION ONLY
 */
import { EventEmitter } from 'eventemitter3';
import { SignalType, ClassificationLevel, RawSignal } from '../types';
export interface Exercise {
    id: string;
    name: string;
    description: string;
    classification: ClassificationLevel;
    type: ExerciseType;
    scenario: ExerciseScenario;
    objectives: ExerciseObjective[];
    participants: ExerciseParticipant[];
    timeline: ExerciseEvent[];
    status: ExerciseStatus;
    startTime?: Date;
    endTime?: Date;
    results?: ExerciseResults;
}
export type ExerciseType = 'COLLECTION' | 'ANALYSIS' | 'GEOLOCATION' | 'NETWORK' | 'FULL_SPECTRUM';
export type ExerciseStatus = 'PLANNED' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export interface ExerciseScenario {
    id: string;
    name: string;
    background: string;
    injects: ScenarioInject[];
    targetProfiles: TargetProfile[];
    environmentSettings: {
        noiseLevel: number;
        signalDensity: number;
        interferenceLevel: number;
        geographicArea: {
            centerLat: number;
            centerLon: number;
            radiusKm: number;
        };
    };
}
export interface ScenarioInject {
    id: string;
    triggerTime: number;
    type: 'SIGNAL' | 'COMINT' | 'ELINT' | 'NETWORK' | 'EVENT';
    data: unknown;
    description: string;
}
export interface TargetProfile {
    id: string;
    name: string;
    type: 'INDIVIDUAL' | 'ORGANIZATION' | 'PLATFORM' | 'NETWORK';
    identifiers: string[];
    expectedActivity: {
        signalTypes: SignalType[];
        frequencyBands: Array<{
            min: number;
            max: number;
        }>;
        communicationPatterns: string[];
    };
    priority: number;
}
export interface ExerciseObjective {
    id: string;
    description: string;
    type: 'COLLECTION' | 'ANALYSIS' | 'IDENTIFICATION' | 'GEOLOCATION' | 'REPORTING';
    criteria: string[];
    weight: number;
    completed: boolean;
    score?: number;
}
export interface ExerciseParticipant {
    id: string;
    role: 'COLLECTOR' | 'ANALYST' | 'SUPERVISOR' | 'EVALUATOR';
    name: string;
    callsign?: string;
}
export interface ExerciseEvent {
    timestamp: Date;
    type: 'START' | 'PAUSE' | 'RESUME' | 'INJECT' | 'OBJECTIVE' | 'END' | 'NOTE';
    description: string;
    data?: unknown;
}
export interface ExerciseResults {
    score: number;
    maxScore: number;
    percentage: number;
    objectiveResults: Array<{
        objectiveId: string;
        completed: boolean;
        score: number;
        notes: string;
    }>;
    statistics: {
        signalsCollected: number;
        signalsAnalyzed: number;
        targetsIdentified: number;
        locationsGenerated: number;
        reportsProduced: number;
    };
    timeline: ExerciseEvent[];
    feedback: string;
}
export interface ExerciseManagerEvents {
    'exercise:created': (exercise: Exercise) => void;
    'exercise:started': (exercise: Exercise) => void;
    'exercise:paused': (exercise: Exercise) => void;
    'exercise:completed': (exercise: Exercise) => void;
    'inject:triggered': (inject: ScenarioInject) => void;
    'objective:completed': (objective: ExerciseObjective) => void;
    'signal:generated': (signal: RawSignal) => void;
}
export declare class ExerciseManager extends EventEmitter<ExerciseManagerEvents> {
    private exercises;
    private activeExercise?;
    private signalGenerator;
    private injectTimers;
    private signalInterval?;
    constructor();
    /**
     * Create a new exercise
     */
    createExercise(params: {
        name: string;
        description: string;
        type: ExerciseType;
        scenario: Partial<ExerciseScenario>;
        objectives: Omit<ExerciseObjective, 'id' | 'completed' | 'score'>[];
        participants?: Omit<ExerciseParticipant, 'id'>[];
    }): Exercise;
    /**
     * Build complete scenario from partial
     */
    private buildScenario;
    /**
     * Generate default injects for exercise
     */
    private generateDefaultInjects;
    /**
     * Generate default target profiles
     */
    private generateDefaultTargets;
    /**
     * Start an exercise
     */
    startExercise(exerciseId: string): Promise<void>;
    /**
     * Pause exercise
     */
    pauseExercise(exerciseId: string): void;
    /**
     * Resume exercise
     */
    resumeExercise(exerciseId: string): void;
    /**
     * End exercise
     */
    endExercise(exerciseId: string): void;
    /**
     * Mark objective as completed
     */
    completeObjective(exerciseId: string, objectiveId: string, score: number): void;
    /**
     * Schedule scenario injects
     */
    private scheduleInjects;
    /**
     * Trigger a scenario inject
     */
    private triggerInject;
    /**
     * Start background signal generation
     */
    private startSignalGeneration;
    /**
     * Stop signal generation
     */
    private stopSignalGeneration;
    /**
     * Clear all inject timers
     */
    private clearInjectTimers;
    /**
     * Add event to exercise timeline
     */
    private addEvent;
    /**
     * Calculate exercise results
     */
    private calculateResults;
    /**
     * Generate feedback based on score
     */
    private generateFeedback;
    private randomSignalType;
    /**
     * Get all exercises
     */
    getExercises(): Exercise[];
    /**
     * Get exercise by ID
     */
    getExercise(id: string): Exercise | undefined;
    /**
     * Get active exercise
     */
    getActiveExercise(): Exercise | undefined;
}
//# sourceMappingURL=ExerciseManager.d.ts.map