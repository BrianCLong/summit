"use strict";
/**
 * Exercise Manager - Training exercise orchestration
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExerciseManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const SignalGenerator_1 = require("../simulation/SignalGenerator");
class ExerciseManager extends eventemitter3_1.EventEmitter {
    exercises = new Map();
    activeExercise;
    signalGenerator;
    injectTimers = new Map();
    signalInterval;
    constructor() {
        super();
        this.signalGenerator = new SignalGenerator_1.SignalGenerator({ realism: 'HIGH', includeNoise: true });
    }
    /**
     * Create a new exercise
     */
    createExercise(params) {
        const exercise = {
            id: (0, uuid_1.v4)(),
            name: params.name,
            description: params.description,
            classification: 'UNCLASSIFIED',
            type: params.type,
            scenario: this.buildScenario(params.scenario),
            objectives: params.objectives.map(o => ({
                ...o,
                id: (0, uuid_1.v4)(),
                completed: false
            })),
            participants: (params.participants || []).map(p => ({ ...p, id: (0, uuid_1.v4)() })),
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
    buildScenario(partial) {
        return {
            id: (0, uuid_1.v4)(),
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
    generateDefaultInjects() {
        return [
            {
                id: (0, uuid_1.v4)(),
                triggerTime: 60,
                type: 'SIGNAL',
                data: { signalType: 'CELLULAR_4G', priority: 4 },
                description: 'New cellular signal detected in target area'
            },
            {
                id: (0, uuid_1.v4)(),
                triggerTime: 180,
                type: 'COMINT',
                data: { communicationType: 'VOICE', language: 'en' },
                description: 'Voice communication intercept'
            },
            {
                id: (0, uuid_1.v4)(),
                triggerTime: 300,
                type: 'ELINT',
                data: { emitterType: 'RADAR_SEARCH' },
                description: 'New radar emitter detected'
            },
            {
                id: (0, uuid_1.v4)(),
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
    generateDefaultTargets() {
        return [
            {
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
    async startExercise(exerciseId) {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise)
            throw new Error(`Exercise ${exerciseId} not found`);
        if (this.activeExercise)
            throw new Error('Another exercise is already running');
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
    pauseExercise(exerciseId) {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise || exercise.status !== 'RUNNING')
            return;
        exercise.status = 'PAUSED';
        this.clearInjectTimers();
        this.stopSignalGeneration();
        this.addEvent(exercise, 'PAUSE', 'Exercise paused');
        this.emit('exercise:paused', exercise);
    }
    /**
     * Resume exercise
     */
    resumeExercise(exerciseId) {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise || exercise.status !== 'PAUSED')
            return;
        exercise.status = 'RUNNING';
        this.scheduleInjects(exercise, true);
        this.startSignalGeneration(exercise);
        this.addEvent(exercise, 'RESUME', 'Exercise resumed');
    }
    /**
     * End exercise
     */
    endExercise(exerciseId) {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise)
            return;
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
    completeObjective(exerciseId, objectiveId, score) {
        const exercise = this.exercises.get(exerciseId);
        if (!exercise)
            return;
        const objective = exercise.objectives.find(o => o.id === objectiveId);
        if (!objective)
            return;
        objective.completed = true;
        objective.score = score;
        this.addEvent(exercise, 'OBJECTIVE', `Objective completed: ${objective.description}`);
        this.emit('objective:completed', objective);
    }
    /**
     * Schedule scenario injects
     */
    scheduleInjects(exercise, resuming = false) {
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
    triggerInject(exercise, inject) {
        this.addEvent(exercise, 'INJECT', inject.description, inject.data);
        // Generate appropriate data based on inject type
        switch (inject.type) {
            case 'SIGNAL':
                const signal = this.signalGenerator.generateRFSignal(inject.data);
                this.emit('signal:generated', signal);
                break;
            case 'COMINT':
                const comint = this.signalGenerator.generateCOMINTMessage(inject.data);
                // Would emit COMINT event
                break;
            case 'ELINT':
                const elint = this.signalGenerator.generateELINTReport(inject.data);
                // Would emit ELINT event
                break;
        }
        this.emit('inject:triggered', inject);
    }
    /**
     * Start background signal generation
     */
    startSignalGeneration(exercise) {
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
    stopSignalGeneration() {
        if (this.signalInterval) {
            clearInterval(this.signalInterval);
            this.signalInterval = undefined;
        }
    }
    /**
     * Clear all inject timers
     */
    clearInjectTimers() {
        for (const timer of this.injectTimers.values()) {
            clearTimeout(timer);
        }
        this.injectTimers.clear();
    }
    /**
     * Add event to exercise timeline
     */
    addEvent(exercise, type, description, data) {
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
    calculateResults(exercise) {
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
    generateFeedback(scoreRatio) {
        if (scoreRatio >= 0.9)
            return 'Excellent performance. All objectives met with high proficiency.';
        if (scoreRatio >= 0.7)
            return 'Good performance. Most objectives completed successfully.';
        if (scoreRatio >= 0.5)
            return 'Satisfactory performance. Key objectives met but room for improvement.';
        return 'Additional training recommended. Review procedures and try again.';
    }
    randomSignalType() {
        const types = [
            'RF_DIGITAL', 'CELLULAR_4G', 'WIFI', 'VHF', 'UHF', 'SATELLITE'
        ];
        return types[Math.floor(Math.random() * types.length)];
    }
    /**
     * Get all exercises
     */
    getExercises() {
        return Array.from(this.exercises.values());
    }
    /**
     * Get exercise by ID
     */
    getExercise(id) {
        return this.exercises.get(id);
    }
    /**
     * Get active exercise
     */
    getActiveExercise() {
        return this.activeExercise;
    }
}
exports.ExerciseManager = ExerciseManager;
//# sourceMappingURL=ExerciseManager.js.map