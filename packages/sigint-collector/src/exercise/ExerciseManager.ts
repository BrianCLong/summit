/**
 * Exercise Manager - Training exercise orchestration
 * TRAINING/SIMULATION ONLY
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { SignalType, ClassificationLevel, RawSignal, COMINTMessage, ELINTReport } from '../types';
import { SignalGenerator } from '../simulation/SignalGenerator';

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

export type ExerciseType =
  | 'COLLECTION'      // Signal collection exercise
  | 'ANALYSIS'        // Analysis and exploitation
  | 'GEOLOCATION'     // Location and tracking
  | 'NETWORK'         // Network analysis
  | 'FULL_SPECTRUM';  // Combined exercise

export type ExerciseStatus =
  | 'PLANNED'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

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
  triggerTime: number; // seconds from start
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
    frequencyBands: Array<{ min: number; max: number }>;
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

export class ExerciseManager extends EventEmitter<ExerciseManagerEvents> {
  private exercises: Map<string, Exercise> = new Map();
  private activeExercise?: Exercise;
  private signalGenerator: SignalGenerator;
  private injectTimers: Map<string, NodeJS.Timeout> = new Map();
  private signalInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.signalGenerator = new SignalGenerator({ realism: 'HIGH', includeNoise: true });
  }

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
  }): Exercise {
    const exercise: Exercise = {
      id: uuid(),
      name: params.name,
      description: params.description,
      classification: 'UNCLASSIFIED',
      type: params.type,
      scenario: this.buildScenario(params.scenario),
      objectives: params.objectives.map(o => ({
        ...o,
        id: uuid(),
        completed: false
      })),
      participants: (params.participants || []).map(p => ({ ...p, id: uuid() })),
      timeline: [],
      status: 'PLANNED'
    };

    this.exercises.set(exercise.id, exercise);
    this.emit('exercise:created', exercise);

    return exercise;
  }

  /**
   * Build complete scenario from partial
   */
  private buildScenario(partial: Partial<ExerciseScenario>): ExerciseScenario {
    return {
      id: uuid(),
      name: partial.name || 'Default Scenario',
      background: partial.background || 'Training exercise scenario',
      injects: partial.injects || this.generateDefaultInjects(),
      targetProfiles: partial.targetProfiles || this.generateDefaultTargets(),
      environmentSettings: partial.environmentSettings || {
        noiseLevel: 0.3,
        signalDensity: 0.5,
        interferenceLevel: 0.2,
        geographicArea: {
          centerLat: 38.9,
          centerLon: -77.0,
          radiusKm: 50
        }
      }
    };
  }

  /**
   * Generate default injects for exercise
   */
  private generateDefaultInjects(): ScenarioInject[] {
    return [
      {
        id: uuid(),
        triggerTime: 60,
        type: 'SIGNAL',
        data: { signalType: 'CELLULAR_4G', priority: 4 },
        description: 'New cellular signal detected in target area'
      },
      {
        id: uuid(),
        triggerTime: 180,
        type: 'COMINT',
        data: { communicationType: 'VOICE', language: 'en' },
        description: 'Voice communication intercept'
      },
      {
        id: uuid(),
        triggerTime: 300,
        type: 'ELINT',
        data: { emitterType: 'RADAR_SEARCH' },
        description: 'New radar emitter detected'
      },
      {
        id: uuid(),
        triggerTime: 420,
        type: 'EVENT',
        data: { type: 'MOVEMENT' },
        description: 'Target movement detected'
      }
    ];
  }

  /**
   * Generate default target profiles
   */
  private generateDefaultTargets(): TargetProfile[] {
    return [
      {
        id: uuid(),
        name: 'Target Alpha',
        type: 'ORGANIZATION',
        identifiers: ['ALPHA-NET', 'ALPHA-COMM'],
        expectedActivity: {
          signalTypes: ['CELLULAR_4G', 'WIFI', 'VHF'],
          frequencyBands: [
            { min: 800e6, max: 900e6 },
            { min: 2400e6, max: 2500e6 }
          ],
          communicationPatterns: ['VOICE', 'DATA']
        },
        priority: 1
      },
      {
        id: uuid(),
        name: 'Platform Bravo',
        type: 'PLATFORM',
        identifiers: ['BRAVO-1', 'BRAVO-2'],
        expectedActivity: {
          signalTypes: ['RADAR', 'SATELLITE', 'UHF'],
          frequencyBands: [
            { min: 9e9, max: 10e9 },
            { min: 12e9, max: 13e9 }
          ],
          communicationPatterns: ['TELEMETRY', 'COMMAND']
        },
        priority: 2
      }
    ];
  }

  /**
   * Start an exercise
   */
  async startExercise(exerciseId: string): Promise<void> {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);
    if (this.activeExercise) throw new Error('Another exercise is already running');

    exercise.status = 'RUNNING';
    exercise.startTime = new Date();
    this.activeExercise = exercise;

    // Log start event
    this.addEvent(exercise, 'START', 'Exercise started');

    // Schedule injects
    this.scheduleInjects(exercise);

    // Start background signal generation
    this.startSignalGeneration(exercise);

    this.emit('exercise:started', exercise);
  }

  /**
   * Pause exercise
   */
  pauseExercise(exerciseId: string): void {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise || exercise.status !== 'RUNNING') return;

    exercise.status = 'PAUSED';
    this.clearInjectTimers();
    this.stopSignalGeneration();

    this.addEvent(exercise, 'PAUSE', 'Exercise paused');
    this.emit('exercise:paused', exercise);
  }

  /**
   * Resume exercise
   */
  resumeExercise(exerciseId: string): void {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise || exercise.status !== 'PAUSED') return;

    exercise.status = 'RUNNING';
    this.scheduleInjects(exercise, true);
    this.startSignalGeneration(exercise);

    this.addEvent(exercise, 'RESUME', 'Exercise resumed');
  }

  /**
   * End exercise
   */
  endExercise(exerciseId: string): void {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) return;

    exercise.status = 'COMPLETED';
    exercise.endTime = new Date();
    this.activeExercise = undefined;

    this.clearInjectTimers();
    this.stopSignalGeneration();

    // Calculate results
    exercise.results = this.calculateResults(exercise);

    this.addEvent(exercise, 'END', 'Exercise completed');
    this.emit('exercise:completed', exercise);
  }

  /**
   * Mark objective as completed
   */
  completeObjective(exerciseId: string, objectiveId: string, score: number): void {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) return;

    const objective = exercise.objectives.find(o => o.id === objectiveId);
    if (!objective) return;

    objective.completed = true;
    objective.score = score;

    this.addEvent(exercise, 'OBJECTIVE', `Objective completed: ${objective.description}`);
    this.emit('objective:completed', objective);
  }

  /**
   * Schedule scenario injects
   */
  private scheduleInjects(exercise: Exercise, resuming: boolean = false): void {
    const now = Date.now();
    const startTime = exercise.startTime?.getTime() || now;
    const elapsed = resuming ? (now - startTime) / 1000 : 0;

    for (const inject of exercise.scenario.injects) {
      const delay = (inject.triggerTime - elapsed) * 1000;

      if (delay > 0) {
        const timer = setTimeout(() => {
          this.triggerInject(exercise, inject);
        }, delay);

        this.injectTimers.set(inject.id, timer);
      }
    }
  }

  /**
   * Trigger a scenario inject
   */
  private triggerInject(exercise: Exercise, inject: ScenarioInject): void {
    this.addEvent(exercise, 'INJECT', inject.description, inject.data);

    // Generate appropriate data based on inject type
    switch (inject.type) {
      case 'SIGNAL':
        const signal = this.signalGenerator.generateRFSignal(inject.data as any);
        this.emit('signal:generated', signal);
        break;
      case 'COMINT':
        const comint = this.signalGenerator.generateCOMINTMessage(inject.data as any);
        // Would emit COMINT event
        break;
      case 'ELINT':
        const elint = this.signalGenerator.generateELINTReport(inject.data as any);
        // Would emit ELINT event
        break;
    }

    this.emit('inject:triggered', inject);
  }

  /**
   * Start background signal generation
   */
  private startSignalGeneration(exercise: Exercise): void {
    const env = exercise.scenario.environmentSettings;

    this.signalInterval = setInterval(() => {
      // Generate ambient signals based on environment
      if (Math.random() < env.signalDensity) {
        const signal = this.signalGenerator.generateRFSignal({
          signalType: this.randomSignalType()
        });

        // Add location within geographic area
        signal.metadata.location = {
          latitude: env.geographicArea.centerLat + (Math.random() - 0.5) * (env.geographicArea.radiusKm / 111),
          longitude: env.geographicArea.centerLon + (Math.random() - 0.5) * (env.geographicArea.radiusKm / 111),
          accuracy: 100 + Math.random() * 500,
          method: 'SIMULATED'
        };

        this.emit('signal:generated', signal);
      }
    }, 2000);
  }

  /**
   * Stop signal generation
   */
  private stopSignalGeneration(): void {
    if (this.signalInterval) {
      clearInterval(this.signalInterval);
      this.signalInterval = undefined;
    }
  }

  /**
   * Clear all inject timers
   */
  private clearInjectTimers(): void {
    for (const timer of this.injectTimers.values()) {
      clearTimeout(timer);
    }
    this.injectTimers.clear();
  }

  /**
   * Add event to exercise timeline
   */
  private addEvent(
    exercise: Exercise,
    type: ExerciseEvent['type'],
    description: string,
    data?: unknown
  ): void {
    exercise.timeline.push({
      timestamp: new Date(),
      type,
      description,
      data
    });
  }

  /**
   * Calculate exercise results
   */
  private calculateResults(exercise: Exercise): ExerciseResults {
    let totalScore = 0;
    let maxScore = 0;

    const objectiveResults = exercise.objectives.map(obj => {
      const score = obj.score || 0;
      totalScore += score * obj.weight;
      maxScore += 100 * obj.weight;

      return {
        objectiveId: obj.id,
        completed: obj.completed,
        score,
        notes: obj.completed ? 'Objective met' : 'Objective not completed'
      };
    });

    return {
      score: totalScore,
      maxScore,
      percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
      objectiveResults,
      statistics: {
        signalsCollected: Math.floor(Math.random() * 100) + 50,
        signalsAnalyzed: Math.floor(Math.random() * 80) + 30,
        targetsIdentified: exercise.scenario.targetProfiles.length,
        locationsGenerated: Math.floor(Math.random() * 20) + 5,
        reportsProduced: Math.floor(Math.random() * 10) + 2
      },
      timeline: exercise.timeline,
      feedback: this.generateFeedback(totalScore / maxScore)
    };
  }

  /**
   * Generate feedback based on score
   */
  private generateFeedback(scoreRatio: number): string {
    if (scoreRatio >= 0.9) return 'Excellent performance. All objectives met with high proficiency.';
    if (scoreRatio >= 0.7) return 'Good performance. Most objectives completed successfully.';
    if (scoreRatio >= 0.5) return 'Satisfactory performance. Key objectives met but room for improvement.';
    return 'Additional training recommended. Review procedures and try again.';
  }

  private randomSignalType(): SignalType {
    const types: SignalType[] = [
      'RF_DIGITAL', 'CELLULAR_4G', 'WIFI', 'VHF', 'UHF', 'SATELLITE'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Get all exercises
   */
  getExercises(): Exercise[] {
    return Array.from(this.exercises.values());
  }

  /**
   * Get exercise by ID
   */
  getExercise(id: string): Exercise | undefined {
    return this.exercises.get(id);
  }

  /**
   * Get active exercise
   */
  getActiveExercise(): Exercise | undefined {
    return this.activeExercise;
  }
}
