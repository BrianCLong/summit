"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../index.js");
const epidemic_models_js_1 = require("../contagion/epidemic-models.js");
const threshold_dynamics_js_1 = require("../contagion/threshold-dynamics.js");
const social_influence_js_1 = require("../models/social-influence.js");
(0, vitest_1.describe)('MassBehaviorEngine', () => {
    (0, vitest_1.it)('should initialize with config', () => {
        const engine = new index_js_1.MassBehaviorEngine({
            population: {},
            contagion: {},
            phaseDetection: {},
            narrative: {},
            simulation: {},
        });
        (0, vitest_1.expect)(engine).toBeDefined();
    });
});
(0, vitest_1.describe)('SEIRSInformationModel', () => {
    (0, vitest_1.it)('should simulate epidemic dynamics', () => {
        const model = new epidemic_models_js_1.SEIRSInformationModel({
            susceptible: 990,
            exposed: 0,
            infected: 10,
            recovered: 0,
            resistant: 0,
        }, {
            beta: 0.3,
            sigma: 0.2,
            gamma: 0.1,
            delta: 0.01,
            mu: 0,
        });
        const trajectory = model.simulate(100, 1);
        (0, vitest_1.expect)(trajectory.length).toBeGreaterThan(0);
        // Check that compartments sum to total population
        const lastState = trajectory[trajectory.length - 1];
        const total = lastState.susceptible +
            lastState.exposed +
            lastState.infected +
            lastState.recovered +
            lastState.resistant;
        (0, vitest_1.expect)(Math.abs(total - 1000)).toBeLessThan(10); // Allow small numerical drift
    });
    (0, vitest_1.it)('should calculate R0', () => {
        const model = new epidemic_models_js_1.SEIRSInformationModel({ susceptible: 100, exposed: 0, infected: 1, recovered: 0, resistant: 0 }, { beta: 0.3, sigma: 0.2, gamma: 0.1, delta: 0.01, mu: 0 });
        const R0 = model.calculateR0();
        (0, vitest_1.expect)(R0).toBeCloseTo(3.0); // beta/gamma = 0.3/0.1 = 3
    });
});
(0, vitest_1.describe)('ThresholdDynamics', () => {
    (0, vitest_1.it)('should generate uniform threshold distribution', () => {
        const dist = (0, threshold_dynamics_js_1.generateThresholdDistribution)('UNIFORM', { size: 100 });
        (0, vitest_1.expect)(dist.distribution.length).toBe(100);
        (0, vitest_1.expect)(dist.cumulativeDistribution.length).toBe(100);
        // Check sorted
        for (let i = 1; i < dist.distribution.length; i++) {
            (0, vitest_1.expect)(dist.distribution[i]).toBeGreaterThanOrEqual(dist.distribution[i - 1]);
        }
    });
    (0, vitest_1.it)('should simulate threshold cascade', () => {
        // Create thresholds that allow cascade
        const thresholds = Array(100).fill(0).map((_, i) => i / 100);
        const result = (0, threshold_dynamics_js_1.simulateThresholdCascade)(thresholds, 0.1);
        (0, vitest_1.expect)(result).toHaveProperty('finalActivation');
        (0, vitest_1.expect)(result).toHaveProperty('trajectory');
        (0, vitest_1.expect)(result).toHaveProperty('converged');
        (0, vitest_1.expect)(result.finalActivation).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.finalActivation).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('should find tipping point', () => {
        const thresholds = Array(100).fill(0).map((_, i) => i / 100);
        const tipping = (0, threshold_dynamics_js_1.findTippingPoint)(thresholds);
        (0, vitest_1.expect)(tipping).toHaveProperty('threshold');
        (0, vitest_1.expect)(tipping).toHaveProperty('index');
    });
});
(0, vitest_1.describe)('SocialInfluenceSimulator', () => {
    (0, vitest_1.it)('should simulate DeGroot dynamics', () => {
        const simulator = new social_influence_js_1.SocialInfluenceSimulator();
        // Simple 2-agent system
        const opinions = [0, 1];
        const trust = [
            [0.5, 0.5], // Agent 0 trusts both equally
            [0.5, 0.5], // Agent 1 trusts both equally
        ];
        const trajectory = simulator.simulateDeGroot(opinions, trust, 10);
        (0, vitest_1.expect)(trajectory.length).toBe(11); // Initial + 10 steps
        // Should converge to mean
        const final = trajectory[trajectory.length - 1];
        (0, vitest_1.expect)(final[0]).toBeCloseTo(0.5, 1);
        (0, vitest_1.expect)(final[1]).toBeCloseTo(0.5, 1);
    });
    (0, vitest_1.it)('should simulate threshold model', () => {
        const simulator = new social_influence_js_1.SocialInfluenceSimulator();
        // Simple network: 3 nodes in a line
        const network = [
            [0, 1, 0],
            [1, 0, 1],
            [0, 1, 0],
        ];
        const thresholds = [0.5, 0.5, 0.5];
        const initialAdopters = new Set([1]); // Middle node starts active
        const result = simulator.simulateThreshold(network, thresholds, initialAdopters, 10);
        (0, vitest_1.expect)(result.finalAdopters.size).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(result.trajectory.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('PhaseTransitionDetector', () => {
    (0, vitest_1.it)('should detect early warning signals', () => {
        const detector = new index_js_1.PhaseTransitionDetector({
            windowSize: 10,
            sensitivityThreshold: 0.5,
            earlyWarningLead: 5,
        });
        // Generate time series with increasing variance (approaching transition)
        const series = Array(50)
            .fill(0)
            .map((_, i) => 0.5 + (Math.random() - 0.5) * (i / 50));
        const signals = detector.detectEarlyWarnings(series);
        (0, vitest_1.expect)(signals.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(signals.some((s) => s.signal === 'AUTOCORRELATION')).toBe(true);
        (0, vitest_1.expect)(signals.some((s) => s.signal === 'VARIANCE')).toBe(true);
    });
});
(0, vitest_1.describe)('CriticalMassAnalyzer', () => {
    (0, vitest_1.it)('should estimate critical threshold', () => {
        const analyzer = new index_js_1.CriticalMassAnalyzer();
        // Simple contagion with average degree 4
        const threshold = analyzer.estimateCriticalThreshold(4, 0.25, 'SIMPLE');
        (0, vitest_1.expect)(threshold).toBeCloseTo(0.25); // 1/4 = 0.25
        // Complex contagion
        const complexThreshold = analyzer.estimateCriticalThreshold(4, 0.25, 'COMPLEX');
        (0, vitest_1.expect)(complexThreshold).toBeGreaterThan(0);
        (0, vitest_1.expect)(complexThreshold).toBeLessThan(1);
    });
});
(0, vitest_1.describe)('TippingPointAnalyzer', () => {
    (0, vitest_1.it)('should analyze norm tipping', () => {
        const analyzer = new index_js_1.TippingPointAnalyzer();
        const result = analyzer.analyzeNormTipping(0.15, {
            clustering: 0.3,
            modularity: 0.5,
        });
        (0, vitest_1.expect)(result.threshold).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.distanceToTipping).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.cascadeLikelihood).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.cascadeLikelihood).toBeLessThanOrEqual(1);
    });
});
