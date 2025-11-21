import { describe, it, expect } from 'vitest';
import {
  MassBehaviorEngine,
  PhaseTransitionDetector,
  CriticalMassAnalyzer,
  TippingPointAnalyzer,
} from '../index.js';
import { SEIRSInformationModel } from '../contagion/epidemic-models.js';
import {
  generateThresholdDistribution,
  simulateThresholdCascade,
  findTippingPoint,
} from '../contagion/threshold-dynamics.js';
import { SocialInfluenceSimulator } from '../models/social-influence.js';

describe('MassBehaviorEngine', () => {
  it('should initialize with config', () => {
    const engine = new MassBehaviorEngine({
      population: {},
      contagion: {},
      phaseDetection: {},
      narrative: {},
      simulation: {},
    });

    expect(engine).toBeDefined();
  });
});

describe('SEIRSInformationModel', () => {
  it('should simulate epidemic dynamics', () => {
    const model = new SEIRSInformationModel(
      {
        susceptible: 990,
        exposed: 0,
        infected: 10,
        recovered: 0,
        resistant: 0,
      },
      {
        beta: 0.3,
        sigma: 0.2,
        gamma: 0.1,
        delta: 0.01,
        mu: 0,
      }
    );

    const trajectory = model.simulate(100, 1);
    expect(trajectory.length).toBeGreaterThan(0);

    // Check that compartments sum to total population
    const lastState = trajectory[trajectory.length - 1];
    const total =
      lastState.susceptible +
      lastState.exposed +
      lastState.infected +
      lastState.recovered +
      lastState.resistant;
    expect(Math.abs(total - 1000)).toBeLessThan(10); // Allow small numerical drift
  });

  it('should calculate R0', () => {
    const model = new SEIRSInformationModel(
      { susceptible: 100, exposed: 0, infected: 1, recovered: 0, resistant: 0 },
      { beta: 0.3, sigma: 0.2, gamma: 0.1, delta: 0.01, mu: 0 }
    );

    const R0 = model.calculateR0();
    expect(R0).toBeCloseTo(3.0); // beta/gamma = 0.3/0.1 = 3
  });
});

describe('ThresholdDynamics', () => {
  it('should generate uniform threshold distribution', () => {
    const dist = generateThresholdDistribution('UNIFORM', { size: 100 });
    expect(dist.distribution.length).toBe(100);
    expect(dist.cumulativeDistribution.length).toBe(100);

    // Check sorted
    for (let i = 1; i < dist.distribution.length; i++) {
      expect(dist.distribution[i]).toBeGreaterThanOrEqual(dist.distribution[i - 1]);
    }
  });

  it('should simulate threshold cascade', () => {
    // Create thresholds that allow cascade
    const thresholds = Array(100).fill(0).map((_, i) => i / 100);
    const result = simulateThresholdCascade(thresholds, 0.1);

    expect(result).toHaveProperty('finalActivation');
    expect(result).toHaveProperty('trajectory');
    expect(result).toHaveProperty('converged');
    expect(result.finalActivation).toBeGreaterThanOrEqual(0);
    expect(result.finalActivation).toBeLessThanOrEqual(1);
  });

  it('should find tipping point', () => {
    const thresholds = Array(100).fill(0).map((_, i) => i / 100);
    const tipping = findTippingPoint(thresholds);

    expect(tipping).toHaveProperty('threshold');
    expect(tipping).toHaveProperty('index');
  });
});

describe('SocialInfluenceSimulator', () => {
  it('should simulate DeGroot dynamics', () => {
    const simulator = new SocialInfluenceSimulator();

    // Simple 2-agent system
    const opinions = [0, 1];
    const trust = [
      [0.5, 0.5], // Agent 0 trusts both equally
      [0.5, 0.5], // Agent 1 trusts both equally
    ];

    const trajectory = simulator.simulateDeGroot(opinions, trust, 10);
    expect(trajectory.length).toBe(11); // Initial + 10 steps

    // Should converge to mean
    const final = trajectory[trajectory.length - 1];
    expect(final[0]).toBeCloseTo(0.5, 1);
    expect(final[1]).toBeCloseTo(0.5, 1);
  });

  it('should simulate threshold model', () => {
    const simulator = new SocialInfluenceSimulator();

    // Simple network: 3 nodes in a line
    const network = [
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ];
    const thresholds = [0.5, 0.5, 0.5];
    const initialAdopters = new Set([1]); // Middle node starts active

    const result = simulator.simulateThreshold(network, thresholds, initialAdopters, 10);

    expect(result.finalAdopters.size).toBeGreaterThanOrEqual(1);
    expect(result.trajectory.length).toBeGreaterThan(0);
  });
});

describe('PhaseTransitionDetector', () => {
  it('should detect early warning signals', () => {
    const detector = new PhaseTransitionDetector({
      windowSize: 10,
      sensitivityThreshold: 0.5,
      earlyWarningLead: 5,
    });

    // Generate time series with increasing variance (approaching transition)
    const series = Array(50)
      .fill(0)
      .map((_, i) => 0.5 + (Math.random() - 0.5) * (i / 50));

    const signals = detector.detectEarlyWarnings(series);

    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((s) => s.signal === 'AUTOCORRELATION')).toBe(true);
    expect(signals.some((s) => s.signal === 'VARIANCE')).toBe(true);
  });
});

describe('CriticalMassAnalyzer', () => {
  it('should estimate critical threshold', () => {
    const analyzer = new CriticalMassAnalyzer();

    // Simple contagion with average degree 4
    const threshold = analyzer.estimateCriticalThreshold(4, 0.25, 'SIMPLE');
    expect(threshold).toBeCloseTo(0.25); // 1/4 = 0.25

    // Complex contagion
    const complexThreshold = analyzer.estimateCriticalThreshold(4, 0.25, 'COMPLEX');
    expect(complexThreshold).toBeGreaterThan(0);
    expect(complexThreshold).toBeLessThan(1);
  });
});

describe('TippingPointAnalyzer', () => {
  it('should analyze norm tipping', () => {
    const analyzer = new TippingPointAnalyzer();

    const result = analyzer.analyzeNormTipping(0.15, {
      clustering: 0.3,
      modularity: 0.5,
    });

    expect(result.threshold).toBeGreaterThan(0);
    expect(result.distanceToTipping).toBeGreaterThanOrEqual(0);
    expect(result.cascadeLikelihood).toBeGreaterThanOrEqual(0);
    expect(result.cascadeLikelihood).toBeLessThanOrEqual(1);
  });
});
