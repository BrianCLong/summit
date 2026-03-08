"use strict";
/**
 * CognitionEngine - Core Reasoning and Decision Loop
 *
 * The central orchestrator for digital twin cognition that implements:
 * - Multi-paradigm reasoning (deductive, inductive, abductive, causal)
 * - Continuous perception-reasoning-action loops
 * - Decision synthesis with explainability
 * - Integration with governance and learning systems
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitionEngine = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'CognitionEngine' });
class CognitionEngine extends events_1.EventEmitter {
    config;
    activeSessions = new Map();
    reasoningStrategies;
    patternLibrary = new Map();
    constructor(config = {}) {
        super();
        this.config = {
            maxReasoningSteps: config.maxReasoningSteps ?? 20,
            confidenceThreshold: config.confidenceThreshold ?? 0.7,
            riskTolerance: config.riskTolerance ?? 0.3,
            enableParallelReasoning: config.enableParallelReasoning ?? true,
            reasoningTimeout: config.reasoningTimeout ?? 30000,
            autoLearn: config.autoLearn ?? true,
        };
        this.reasoningStrategies = this.initializeReasoningStrategies();
    }
    initializeReasoningStrategies() {
        return new Map([
            ['DEDUCTIVE', new DeductiveReasoning()],
            ['INDUCTIVE', new InductiveReasoning()],
            ['ABDUCTIVE', new AbductiveReasoning()],
            ['CAUSAL', new CausalReasoning()],
            ['COUNTERFACTUAL', new CounterfactualReasoning()],
            ['PROBABILISTIC', new ProbabilisticReasoning()],
            ['TEMPORAL', new TemporalReasoning()],
            ['ANALOGICAL', new AnalogicalReasoning()],
        ]);
    }
    /**
     * Start a new cognition session for a digital twin
     */
    async startSession(twinId, tenantId, initialContext) {
        const sessionId = (0, uuid_1.v4)();
        const now = new Date();
        const session = {
            id: sessionId,
            twinId,
            tenantId,
            state: 'IDLE',
            context: this.initializeContext(initialContext),
            reasoningTrace: [],
            decisions: [],
            outcomes: [],
            confidence: 1.0,
            startedAt: now,
            updatedAt: now,
            metadata: {},
        };
        this.activeSessions.set(sessionId, session);
        this.emit('session:started', { sessionId, twinId, tenantId });
        logger.info({ sessionId, twinId }, 'Cognition session started');
        return session;
    }
    initializeContext(partial) {
        return {
            twinState: partial.twinState ?? {
                timestamp: new Date(),
                properties: {},
                derived: {},
                confidence: 1.0,
                source: 'INITIALIZATION',
            },
            historicalStates: partial.historicalStates ?? [],
            sensorData: partial.sensorData ?? [],
            textInputs: partial.textInputs ?? [],
            imageInputs: partial.imageInputs ?? [],
            documentInputs: partial.documentInputs ?? [],
            marketContext: partial.marketContext,
            economicContext: partial.economicContext,
            regulatoryContext: partial.regulatoryContext,
            weatherContext: partial.weatherContext,
            recognizedPatterns: partial.recognizedPatterns ?? [],
            activeAlerts: partial.activeAlerts ?? [],
            objectives: partial.objectives ?? [],
            constraints: partial.constraints ?? [],
            preferences: partial.preferences ?? [],
        };
    }
    /**
     * Update session context with new information
     */
    async updateContext(sessionId, contextUpdate) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Merge context updates
        session.context = {
            ...session.context,
            ...contextUpdate,
            sensorData: [
                ...session.context.sensorData,
                ...(contextUpdate.sensorData ?? []),
            ].slice(-1000), // Keep last 1000 readings
            historicalStates: contextUpdate.twinState
                ? [...session.context.historicalStates, session.context.twinState].slice(-100)
                : session.context.historicalStates,
            twinState: contextUpdate.twinState ?? session.context.twinState,
        };
        session.updatedAt = new Date();
        this.emit('session:context-updated', { sessionId, update: contextUpdate });
        return session;
    }
    /**
     * Execute the main cognition loop: Perceive → Reason → Decide → Act
     */
    async runCognitionCycle(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const cycleStartTime = Date.now();
        const decisions = [];
        try {
            // Phase 1: Perception - Analyze multi-modal inputs
            session.state = 'PERCEIVING';
            this.emit('session:state-changed', { sessionId, state: 'PERCEIVING' });
            const perceptionResults = await this.perceive(session);
            // Phase 2: Reasoning - Apply multiple reasoning paradigms
            session.state = 'REASONING';
            this.emit('session:state-changed', { sessionId, state: 'REASONING' });
            const reasoningResults = await this.reason(session, perceptionResults);
            // Phase 3: Deliberation - Evaluate options and trade-offs
            session.state = 'DELIBERATING';
            this.emit('session:state-changed', { sessionId, state: 'DELIBERATING' });
            const deliberationResults = await this.deliberate(session, reasoningResults);
            // Phase 4: Decision - Synthesize final decisions
            session.state = 'DECIDING';
            this.emit('session:state-changed', { sessionId, state: 'DECIDING' });
            const newDecisions = await this.decide(session, deliberationResults);
            decisions.push(...newDecisions);
            // Phase 5: Reflection - Update confidence and prepare for learning
            session.state = 'REFLECTING';
            this.emit('session:state-changed', { sessionId, state: 'REFLECTING' });
            await this.reflect(session, decisions);
            session.state = 'IDLE';
            session.updatedAt = new Date();
            session.decisions.push(...decisions);
            const cycleDuration = Date.now() - cycleStartTime;
            logger.info({ sessionId, decisionCount: decisions.length, cycleDuration }, 'Cognition cycle completed');
            this.emit('session:cycle-completed', {
                sessionId,
                decisions,
                duration: cycleDuration,
            });
            return decisions;
        }
        catch (error) {
            logger.error({ sessionId, error }, 'Cognition cycle failed');
            session.state = 'IDLE';
            throw error;
        }
    }
    /**
     * Phase 1: Perception - Analyze and integrate multi-modal inputs
     */
    async perceive(session) {
        const result = {
            anomalies: [],
            patterns: [],
            stateChanges: [],
            alerts: [],
            confidence: 1.0,
        };
        // Analyze sensor data for anomalies
        if (session.context.sensorData.length > 0) {
            const sensorAnomalies = this.detectSensorAnomalies(session.context.sensorData);
            result.anomalies.push(...sensorAnomalies);
        }
        // Recognize patterns in historical data
        if (session.context.historicalStates.length > 5) {
            const patterns = this.recognizePatterns(session.context.historicalStates);
            result.patterns.push(...patterns);
            session.context.recognizedPatterns = [
                ...session.context.recognizedPatterns,
                ...patterns,
            ];
        }
        // Detect state changes
        if (session.context.historicalStates.length > 0) {
            const lastState = session.context.historicalStates[session.context.historicalStates.length - 1];
            result.stateChanges = this.detectStateChanges(lastState, session.context.twinState);
        }
        // Calculate overall perception confidence
        result.confidence = this.calculatePerceptionConfidence(result);
        return result;
    }
    detectSensorAnomalies(readings) {
        const anomalies = [];
        // Group readings by sensor
        const bySensor = new Map();
        for (const reading of readings) {
            const existing = bySensor.get(reading.sensorId) ?? [];
            existing.push(reading);
            bySensor.set(reading.sensorId, existing);
        }
        // Detect anomalies for each sensor
        for (const [sensorId, sensorReadings] of bySensor) {
            if (sensorReadings.length < 5)
                continue;
            const values = sensorReadings
                .filter((r) => typeof r.value === 'number')
                .map((r) => r.value);
            if (values.length < 5)
                continue;
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
            const latestValue = values[values.length - 1];
            const zScore = Math.abs((latestValue - mean) / stdDev);
            if (zScore > 3) {
                anomalies.push({
                    type: 'SENSOR_ANOMALY',
                    sensorId,
                    value: latestValue,
                    expected: mean,
                    deviation: zScore,
                    severity: zScore > 5 ? 'CRITICAL' : zScore > 4 ? 'HIGH' : 'MEDIUM',
                    timestamp: new Date(),
                });
            }
        }
        return anomalies;
    }
    recognizePatterns(states) {
        const patterns = [];
        // Trend detection
        const numericProps = this.extractNumericProperties(states);
        for (const [prop, values] of numericProps) {
            const trend = this.detectTrend(values);
            if (trend.significant) {
                patterns.push({
                    id: (0, uuid_1.v4)(),
                    type: trend.direction === 'UP' ? 'DEGRADATION' : 'EFFICIENCY',
                    description: `${prop} showing ${trend.direction.toLowerCase()} trend`,
                    signature: {
                        features: { property: prop, direction: trend.direction },
                        timescale: states.length,
                        threshold: trend.slope,
                    },
                    occurrences: 1,
                    lastSeen: new Date(),
                    confidence: trend.confidence,
                });
            }
        }
        // Regime change detection
        const regimeChange = this.detectRegimeChange(states);
        if (regimeChange) {
            patterns.push({
                id: (0, uuid_1.v4)(),
                type: 'REGIME_CHANGE',
                description: `Operating regime change detected`,
                signature: {
                    features: regimeChange.features,
                    timescale: regimeChange.transitionPeriod,
                    threshold: regimeChange.magnitude,
                },
                occurrences: 1,
                lastSeen: new Date(),
                confidence: regimeChange.confidence,
            });
        }
        return patterns;
    }
    extractNumericProperties(states) {
        const result = new Map();
        for (const state of states) {
            for (const [key, value] of Object.entries(state.properties)) {
                if (typeof value === 'number') {
                    const existing = result.get(key) ?? [];
                    existing.push(value);
                    result.set(key, existing);
                }
            }
        }
        return result;
    }
    detectTrend(values) {
        if (values.length < 3) {
            return { significant: false, direction: 'STABLE', slope: 0, confidence: 0 };
        }
        // Simple linear regression
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) ** 2;
        }
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const normalizedSlope = slope / (yMean || 1);
        // Calculate R-squared for confidence
        const predictions = values.map((_, i) => yMean + slope * (i - xMean));
        const ssRes = values.reduce((sum, v, i) => sum + (v - predictions[i]) ** 2, 0);
        const ssTot = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0);
        const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
        const significant = Math.abs(normalizedSlope) > 0.05 && rSquared > 0.5;
        return {
            significant,
            direction: slope > 0 ? 'UP' : slope < 0 ? 'DOWN' : 'STABLE',
            slope: normalizedSlope,
            confidence: rSquared,
        };
    }
    detectRegimeChange(states) {
        if (states.length < 10)
            return null;
        const midpoint = Math.floor(states.length / 2);
        const firstHalf = states.slice(0, midpoint);
        const secondHalf = states.slice(midpoint);
        // Compare distributions of numeric properties
        const numericPropsFirst = this.extractNumericProperties(firstHalf);
        const numericPropsSecond = this.extractNumericProperties(secondHalf);
        let totalShift = 0;
        let propCount = 0;
        const changedFeatures = {};
        for (const [prop, valuesFirst] of numericPropsFirst) {
            const valuesSecond = numericPropsSecond.get(prop);
            if (!valuesSecond || valuesFirst.length < 3 || valuesSecond.length < 3)
                continue;
            const meanFirst = valuesFirst.reduce((a, b) => a + b, 0) / valuesFirst.length;
            const meanSecond = valuesSecond.reduce((a, b) => a + b, 0) / valuesSecond.length;
            const shift = Math.abs(meanSecond - meanFirst) / (meanFirst || 1);
            if (shift > 0.2) {
                changedFeatures[prop] = { before: meanFirst, after: meanSecond };
                totalShift += shift;
                propCount++;
            }
        }
        if (propCount === 0)
            return null;
        const avgShift = totalShift / propCount;
        if (avgShift < 0.15)
            return null;
        return {
            features: changedFeatures,
            transitionPeriod: 3,
            magnitude: avgShift,
            confidence: Math.min(0.9, 0.5 + avgShift),
        };
    }
    detectStateChanges(previous, current) {
        const changes = [];
        for (const [key, currentValue] of Object.entries(current.properties)) {
            const previousValue = previous.properties[key];
            if (previousValue === undefined) {
                changes.push({
                    property: key,
                    type: 'ADDED',
                    newValue: currentValue,
                });
            }
            else if (JSON.stringify(previousValue) !== JSON.stringify(currentValue)) {
                changes.push({
                    property: key,
                    type: 'CHANGED',
                    oldValue: previousValue,
                    newValue: currentValue,
                });
            }
        }
        for (const key of Object.keys(previous.properties)) {
            if (!(key in current.properties)) {
                changes.push({
                    property: key,
                    type: 'REMOVED',
                    oldValue: previous.properties[key],
                });
            }
        }
        return changes;
    }
    calculatePerceptionConfidence(result) {
        let confidence = 1.0;
        // Reduce confidence based on anomalies
        for (const anomaly of result.anomalies) {
            const reduction = anomaly.severity === 'CRITICAL'
                ? 0.3
                : anomaly.severity === 'HIGH'
                    ? 0.2
                    : 0.1;
            confidence *= 1 - reduction;
        }
        // Boost confidence for recognized patterns
        confidence += result.patterns.length * 0.02;
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    /**
     * Phase 2: Reasoning - Apply multiple reasoning paradigms
     */
    async reason(session, perception) {
        const results = [];
        // Determine which reasoning paradigms to apply
        const paradigmsToApply = this.selectReasoningParadigms(perception);
        if (this.config.enableParallelReasoning) {
            // Run reasoning paradigms in parallel
            const promises = paradigmsToApply.map((paradigm) => this.applyReasoningParadigm(session, paradigm, perception));
            const parallelResults = await Promise.all(promises);
            results.push(...parallelResults);
        }
        else {
            // Run sequentially
            for (const paradigm of paradigmsToApply) {
                const result = await this.applyReasoningParadigm(session, paradigm, perception);
                results.push(result);
            }
        }
        // Record reasoning steps in session
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const step = {
                id: (0, uuid_1.v4)(),
                stepNumber: session.reasoningTrace.length + 1,
                paradigm: result.paradigm,
                inputState: {
                    perception,
                    context: session.context.twinState.properties,
                },
                reasoning: `Applied ${result.paradigm} reasoning`,
                result: result.conclusions,
                confidence: result.confidence,
                evidenceChain: result.evidenceChain,
                timestamp: new Date(),
                durationMs: 0,
            };
            session.reasoningTrace.push(step);
        }
        return results;
    }
    selectReasoningParadigms(perception) {
        const paradigms = [];
        // Always apply causal reasoning for understanding relationships
        paradigms.push('CAUSAL');
        // Apply probabilistic reasoning when dealing with uncertainty
        if (perception.confidence < 0.8) {
            paradigms.push('PROBABILISTIC');
        }
        // Apply temporal reasoning for time-series patterns
        if (perception.patterns.length > 0) {
            paradigms.push('TEMPORAL');
        }
        // Apply abductive reasoning for anomaly explanation
        if (perception.anomalies.length > 0) {
            paradigms.push('ABDUCTIVE');
        }
        // Apply counterfactual for what-if analysis
        if (perception.stateChanges.length > 0) {
            paradigms.push('COUNTERFACTUAL');
        }
        // Apply analogical reasoning for pattern matching
        if (this.patternLibrary.size > 0) {
            paradigms.push('ANALOGICAL');
        }
        return paradigms;
    }
    async applyReasoningParadigm(session, paradigm, perception) {
        const strategy = this.reasoningStrategies.get(paradigm);
        if (!strategy) {
            throw new Error(`Unknown reasoning paradigm: ${paradigm}`);
        }
        return strategy.reason(session.context, perception);
    }
    /**
     * Phase 3: Deliberation - Evaluate options and trade-offs
     */
    async deliberate(session, reasoningResults) {
        const options = [];
        // Generate action options from reasoning results
        for (const result of reasoningResults) {
            const generatedOptions = this.generateActionOptions(result, session.context);
            options.push(...generatedOptions);
        }
        // Evaluate each option against objectives and constraints
        const evaluatedOptions = options.map((option) => ({
            ...option,
            evaluation: this.evaluateOption(option, session.context),
        }));
        // Rank options by expected utility
        evaluatedOptions.sort((a, b) => b.evaluation.expectedUtility - a.evaluation.expectedUtility);
        // Filter out options that violate hard constraints
        const feasibleOptions = evaluatedOptions.filter((o) => !o.evaluation.constraintViolations.some((v) => v.hardLimit));
        return {
            options: feasibleOptions,
            tradeoffs: this.identifyTradeoffs(feasibleOptions),
            recommendedOption: feasibleOptions[0] ?? null,
        };
    }
    generateActionOptions(reasoningResult, context) {
        const options = [];
        // Generate options based on causal links
        for (const link of reasoningResult.causalLinks) {
            if (link.strength > 0.6) {
                options.push({
                    id: (0, uuid_1.v4)(),
                    action: {
                        id: (0, uuid_1.v4)(),
                        type: 'ADJUST_SETPOINT',
                        target: link.cause,
                        parameters: { adjustment: link.effect },
                        priority: Math.round(link.strength * 10),
                        estimatedImpact: [],
                        constraints: [],
                    },
                    rationale: `Adjust ${link.cause} to influence ${link.effect}`,
                    expectedOutcome: {
                        metrics: [],
                        sideEffects: [],
                        confidence: link.confidence,
                        timeHorizon: link.delay ?? 3600,
                    },
                    confidence: link.confidence,
                });
            }
        }
        // Generate options from conclusions
        for (const [key, value] of Object.entries(reasoningResult.conclusions)) {
            if (typeof value === 'object' && value !== null && 'recommendation' in value) {
                const rec = value;
                options.push({
                    id: (0, uuid_1.v4)(),
                    action: {
                        id: (0, uuid_1.v4)(),
                        type: 'SET_PARAMETER',
                        target: rec.target ?? key,
                        parameters: { value: rec.value },
                        priority: 5,
                        estimatedImpact: [],
                        constraints: [],
                    },
                    rationale: rec.recommendation,
                    expectedOutcome: {
                        metrics: [],
                        sideEffects: [],
                        confidence: reasoningResult.confidence,
                        timeHorizon: 3600,
                    },
                    confidence: reasoningResult.confidence,
                });
            }
        }
        return options;
    }
    evaluateOption(option, context) {
        let expectedUtility = 0;
        const constraintViolations = [];
        const objectiveContributions = [];
        // Evaluate against objectives
        for (const objective of context.objectives) {
            const contribution = this.estimateObjectiveContribution(option, objective);
            objectiveContributions.push(contribution);
            expectedUtility += contribution.contribution * objective.weight;
        }
        // Check constraints
        for (const constraint of context.constraints) {
            const violation = this.checkConstraintViolation(option, constraint);
            if (violation) {
                constraintViolations.push(violation);
                if (violation.hardLimit) {
                    expectedUtility = -Infinity;
                }
                else {
                    expectedUtility *= 0.5; // Soft constraint penalty
                }
            }
        }
        return {
            expectedUtility,
            constraintViolations,
            objectiveContributions,
            riskScore: this.calculateRiskScore(option),
        };
    }
    estimateObjectiveContribution(option, objective) {
        // Simplified contribution estimation
        const baseContribution = option.confidence * 0.5;
        return {
            objectiveId: objective.id,
            metric: objective.metric,
            contribution: baseContribution,
            confidence: option.confidence,
        };
    }
    checkConstraintViolation(option, constraint) {
        // Simplified constraint checking
        // In production, this would evaluate the constraint expression
        return null;
    }
    calculateRiskScore(option) {
        // Base risk from action type
        const typeRisks = {
            SET_PARAMETER: 0.2,
            ADJUST_SETPOINT: 0.3,
            TRIGGER_WORKFLOW: 0.4,
            EXECUTE_PROCEDURE: 0.5,
            SEND_ALERT: 0.1,
        };
        const baseRisk = typeRisks[option.action.type] ?? 0.3;
        const confidenceAdjustment = (1 - option.confidence) * 0.3;
        return Math.min(1, baseRisk + confidenceAdjustment);
    }
    identifyTradeoffs(options) {
        const tradeoffs = [];
        for (let i = 0; i < options.length - 1; i++) {
            for (let j = i + 1; j < options.length; j++) {
                const optionA = options[i];
                const optionB = options[j];
                // Compare objective contributions
                const aContribs = new Map(optionA.evaluation.objectiveContributions.map((c) => [c.objectiveId, c]));
                const bContribs = new Map(optionB.evaluation.objectiveContributions.map((c) => [c.objectiveId, c]));
                for (const [id, aContrib] of aContribs) {
                    const bContrib = bContribs.get(id);
                    if (bContrib && Math.sign(aContrib.contribution) !== Math.sign(bContrib.contribution)) {
                        tradeoffs.push({
                            optionA: optionA.id,
                            optionB: optionB.id,
                            objective: aContrib.metric,
                            description: `${optionA.rationale} favors ${aContrib.metric} while ${optionB.rationale} trades it off`,
                        });
                    }
                }
            }
        }
        return tradeoffs;
    }
    /**
     * Phase 4: Decision - Synthesize final decisions
     */
    async decide(session, deliberation) {
        const decisions = [];
        if (!deliberation.recommendedOption) {
            return decisions;
        }
        const option = deliberation.recommendedOption;
        const riskAssessment = this.assessRisk(option, session.context);
        const requiresApproval = riskAssessment.overallRisk === 'HIGH' ||
            riskAssessment.overallRisk === 'CRITICAL';
        const decision = {
            id: (0, uuid_1.v4)(),
            sessionId: session.id,
            type: this.mapActionTypeToDecisionType(option.action.type),
            description: option.rationale,
            action: option.action,
            alternatives: deliberation.options.slice(1, 4).map((o) => o.action),
            rationale: this.generateRationale(option, deliberation),
            causalChain: this.buildCausalChain(session.reasoningTrace),
            riskAssessment,
            expectedOutcome: option.expectedOutcome,
            confidence: option.confidence,
            requiresApproval,
            createdAt: new Date(),
        };
        decisions.push(decision);
        this.emit('decision:created', { sessionId: session.id, decision });
        return decisions;
    }
    mapActionTypeToDecisionType(actionType) {
        const mapping = {
            SET_PARAMETER: 'CONTROL_ADJUSTMENT',
            ADJUST_SETPOINT: 'CONTROL_ADJUSTMENT',
            TRIGGER_WORKFLOW: 'PROCESS_OPTIMIZATION',
            SCHEDULE_MAINTENANCE: 'MAINTENANCE_SCHEDULE',
            SEND_ALERT: 'ALERT_ESCALATION',
            MODIFY_SCHEDULE: 'RESOURCE_ALLOCATION',
            ALLOCATE_RESOURCE: 'RESOURCE_ALLOCATION',
            EXECUTE_PROCEDURE: 'CONFIGURATION_CHANGE',
        };
        return mapping[actionType] ?? 'CONTROL_ADJUSTMENT';
    }
    generateRationale(option, deliberation) {
        const parts = [];
        parts.push(`Recommended action: ${option.rationale}`);
        if (deliberation.options.length > 1) {
            parts.push(`Selected from ${deliberation.options.length} candidate options based on expected utility.`);
        }
        if (deliberation.tradeoffs.length > 0) {
            parts.push(`Trade-offs considered: ${deliberation.tradeoffs.map((t) => t.description).join('; ')}`);
        }
        parts.push(`Confidence: ${(option.confidence * 100).toFixed(1)}%`);
        return parts.join(' ');
    }
    buildCausalChain(reasoningTrace) {
        const links = [];
        for (const step of reasoningTrace) {
            if (step.paradigm === 'CAUSAL') {
                // Extract causal links from causal reasoning results
                const conclusions = step.result;
                if (Array.isArray(conclusions.causalLinks)) {
                    links.push(...conclusions.causalLinks);
                }
            }
        }
        return links;
    }
    assessRisk(option, context) {
        const factors = [];
        const mitigations = [];
        // Action type risk
        const actionRisk = this.calculateRiskScore(option);
        if (actionRisk > 0.3) {
            factors.push({
                id: (0, uuid_1.v4)(),
                category: 'ACTION_TYPE',
                description: `Action type ${option.action.type} carries inherent risk`,
                likelihood: actionRisk,
                impact: 0.5,
                riskScore: actionRisk * 0.5,
            });
        }
        // Confidence risk
        if (option.confidence < 0.7) {
            factors.push({
                id: (0, uuid_1.v4)(),
                category: 'CONFIDENCE',
                description: `Low confidence (${(option.confidence * 100).toFixed(0)}%) in decision`,
                likelihood: 0.5,
                impact: 1 - option.confidence,
                riskScore: 0.5 * (1 - option.confidence),
            });
        }
        // Calculate overall risk
        const totalRiskScore = factors.length > 0
            ? factors.reduce((sum, f) => sum + f.riskScore, 0) / factors.length
            : 0;
        let overallRisk;
        if (totalRiskScore > 0.8)
            overallRisk = 'CRITICAL';
        else if (totalRiskScore > 0.6)
            overallRisk = 'HIGH';
        else if (totalRiskScore > 0.4)
            overallRisk = 'MEDIUM';
        else if (totalRiskScore > 0.2)
            overallRisk = 'LOW';
        else
            overallRisk = 'NEGLIGIBLE';
        return {
            overallRisk,
            factors,
            mitigations,
            unmitigatedRisk: overallRisk,
        };
    }
    /**
     * Phase 5: Reflection - Update session confidence and prepare for learning
     */
    async reflect(session, decisions) {
        // Update session confidence based on decisions
        if (decisions.length > 0) {
            const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
            session.confidence = session.confidence * 0.7 + avgConfidence * 0.3;
        }
        // Emit learning opportunities
        if (this.config.autoLearn) {
            this.emit('learning:opportunity', {
                sessionId: session.id,
                reasoningTrace: session.reasoningTrace,
                decisions,
                context: session.context,
            });
        }
    }
    /**
     * Record outcome of a decision for learning
     */
    async recordOutcome(sessionId, decisionId, outcome) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const decision = session.decisions.find((d) => d.id === decisionId);
        if (!decision) {
            throw new Error(`Decision not found: ${decisionId}`);
        }
        const fullOutcome = {
            id: (0, uuid_1.v4)(),
            decisionId,
            ...outcome,
        };
        session.outcomes.push(fullOutcome);
        // Emit for learning
        this.emit('outcome:recorded', {
            sessionId,
            decision,
            outcome: fullOutcome,
        });
        return fullOutcome;
    }
    /**
     * End a cognition session
     */
    async endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.state = 'IDLE';
        session.completedAt = new Date();
        session.updatedAt = new Date();
        this.emit('session:ended', { sessionId, session });
        // Keep in memory for a while for reference, then clean up
        setTimeout(() => {
            this.activeSessions.delete(sessionId);
        }, 3600000); // 1 hour
        logger.info({
            sessionId,
            decisions: session.decisions.length,
            outcomes: session.outcomes.length,
        }, 'Cognition session ended');
        return session;
    }
    /**
     * Get session status
     */
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    /**
     * List active sessions
     */
    listActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
}
exports.CognitionEngine = CognitionEngine;
class DeductiveReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        // Apply known rules to derive conclusions
        // If anomaly detected AND threshold exceeded THEN alert required
        for (const anomaly of perception.anomalies) {
            if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
                conclusions[`alert_${anomaly.sensorId}`] = {
                    recommendation: 'Generate alert for anomaly',
                    severity: anomaly.severity,
                };
                evidenceChain.push({
                    id: (0, uuid_1.v4)(),
                    type: 'SENSOR',
                    source: anomaly.sensorId ?? 'unknown',
                    content: anomaly,
                    weight: 0.9,
                    timestamp: anomaly.timestamp,
                });
            }
        }
        return {
            conclusions,
            confidence: 0.9,
            paradigm: 'DEDUCTIVE',
            evidenceChain,
            causalLinks: [],
        };
    }
}
class InductiveReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        // Generalize from observed patterns
        for (const pattern of perception.patterns) {
            if (pattern.occurrences > 3 && pattern.confidence > 0.7) {
                conclusions[`generalization_${pattern.id}`] = {
                    pattern: pattern.type,
                    recommendation: `Pattern ${pattern.type} consistently observed`,
                    confidence: pattern.confidence,
                };
            }
        }
        return {
            conclusions,
            confidence: 0.7,
            paradigm: 'INDUCTIVE',
            evidenceChain,
            causalLinks: [],
        };
    }
}
class AbductiveReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        const causalLinks = [];
        // Generate best explanations for anomalies
        for (const anomaly of perception.anomalies) {
            const hypotheses = this.generateHypotheses(anomaly, context);
            if (hypotheses.length > 0) {
                const bestHypothesis = hypotheses[0];
                conclusions[`explanation_${anomaly.sensorId}`] = {
                    anomaly: anomaly.type,
                    bestExplanation: bestHypothesis.explanation,
                    confidence: bestHypothesis.confidence,
                    recommendation: bestHypothesis.action,
                };
                causalLinks.push({
                    cause: bestHypothesis.cause,
                    effect: `anomaly at ${anomaly.sensorId}`,
                    mechanism: bestHypothesis.mechanism,
                    strength: bestHypothesis.confidence,
                    confidence: bestHypothesis.confidence,
                });
            }
        }
        return {
            conclusions,
            confidence: 0.6,
            paradigm: 'ABDUCTIVE',
            evidenceChain,
            causalLinks,
        };
    }
    generateHypotheses(anomaly, context) {
        const hypotheses = [];
        // Sensor malfunction hypothesis
        hypotheses.push({
            explanation: 'Sensor malfunction or calibration drift',
            cause: 'sensor_degradation',
            mechanism: 'Electronic drift or mechanical wear',
            confidence: 0.4,
            action: 'Schedule sensor inspection',
        });
        // Process change hypothesis
        hypotheses.push({
            explanation: 'Process operating conditions changed',
            cause: 'process_change',
            mechanism: 'Operating parameters shifted',
            confidence: 0.5,
            action: 'Review recent process changes',
        });
        // Equipment degradation hypothesis
        if (anomaly.deviation > 3) {
            hypotheses.push({
                explanation: 'Equipment degradation or fault',
                cause: 'equipment_fault',
                mechanism: 'Mechanical or electrical degradation',
                confidence: 0.6,
                action: 'Schedule maintenance inspection',
            });
        }
        return hypotheses.sort((a, b) => b.confidence - a.confidence);
    }
}
class CausalReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        const causalLinks = [];
        // Analyze causal relationships from state changes
        for (const change of perception.stateChanges) {
            // Look for correlated changes
            const correlatedChanges = perception.stateChanges.filter((c) => c !== change && c.type === 'CHANGED');
            for (const correlated of correlatedChanges) {
                // Simple correlation check
                if (typeof change.newValue === 'number' &&
                    typeof correlated.newValue === 'number') {
                    causalLinks.push({
                        cause: change.property,
                        effect: correlated.property,
                        mechanism: 'Observed correlation',
                        strength: 0.5,
                        confidence: 0.5,
                    });
                }
            }
        }
        conclusions.causalLinks = causalLinks;
        return {
            conclusions,
            confidence: 0.7,
            paradigm: 'CAUSAL',
            evidenceChain,
            causalLinks,
        };
    }
}
class CounterfactualReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        // Generate counterfactual scenarios
        for (const change of perception.stateChanges) {
            if (change.type === 'CHANGED' && change.oldValue !== undefined) {
                conclusions[`counterfactual_${change.property}`] = {
                    actual: change.newValue,
                    counterfactual: change.oldValue,
                    question: `What if ${change.property} had remained at ${change.oldValue}?`,
                    implication: 'Further analysis needed',
                };
            }
        }
        return {
            conclusions,
            confidence: 0.5,
            paradigm: 'COUNTERFACTUAL',
            evidenceChain,
            causalLinks: [],
        };
    }
}
class ProbabilisticReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        // Calculate probabilities based on observed patterns
        const patternProbabilities = {};
        for (const pattern of perception.patterns) {
            patternProbabilities[pattern.type] = pattern.confidence;
        }
        // Calculate joint probabilities
        if (perception.patterns.length > 1) {
            const jointProbability = perception.patterns.reduce((p, pat) => p * pat.confidence, 1);
            conclusions.joint_pattern_probability = jointProbability;
        }
        conclusions.pattern_probabilities = patternProbabilities;
        return {
            conclusions,
            confidence: 0.6,
            paradigm: 'PROBABILISTIC',
            evidenceChain,
            causalLinks: [],
        };
    }
}
class TemporalReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        // Analyze temporal patterns
        for (const pattern of perception.patterns) {
            if (pattern.type === 'SEASONAL' || pattern.type === 'DEGRADATION') {
                conclusions[`temporal_${pattern.id}`] = {
                    pattern: pattern.type,
                    timescale: pattern.signature.timescale,
                    projection: 'Continue monitoring for trend confirmation',
                    confidence: pattern.confidence,
                };
            }
        }
        // Look for temporal dependencies
        if (context.historicalStates.length > 10) {
            conclusions.temporal_stability = {
                observations: context.historicalStates.length,
                stable: perception.patterns.filter((p) => p.type === 'REGIME_CHANGE')
                    .length === 0,
            };
        }
        return {
            conclusions,
            confidence: 0.7,
            paradigm: 'TEMPORAL',
            evidenceChain,
            causalLinks: [],
        };
    }
}
class AnalogicalReasoning {
    async reason(context, perception) {
        const conclusions = {};
        const evidenceChain = [];
        // Find similar patterns from history
        for (const pattern of perception.patterns) {
            const similar = context.recognizedPatterns.filter((p) => p.type === pattern.type && p.id !== pattern.id);
            if (similar.length > 0) {
                conclusions[`analogy_${pattern.id}`] = {
                    currentPattern: pattern.type,
                    similarCases: similar.length,
                    recommendation: similar[0]?.actions?.[0]?.action ??
                        'No prior action recorded',
                };
            }
        }
        return {
            conclusions,
            confidence: 0.55,
            paradigm: 'ANALOGICAL',
            evidenceChain,
            causalLinks: [],
        };
    }
}
exports.default = CognitionEngine;
