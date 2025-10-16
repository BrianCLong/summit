import { EventEmitter } from 'events';
import { BuildEvent, BuildStatus, TestStatus } from './types';

export interface DistillationOptions {
  /** Maximum number of distilled signals to retain in memory */
  maxHistory?: number;
  /** Smoothing factor (0-1) for exponential moving averages on branches */
  branchSmoothing?: number;
  /** Dropout applied to teacher ensemble when instability is detected */
  teacherDropout?: number;
}

export interface FeatureVector {
  reliability: number;
  coverage: number;
  security: number;
  velocity: number;
  stability: number;
  compliance: number;
}

export interface TeacherProfile {
  id: string;
  description: string;
  weights: Partial<FeatureVector>;
  /** Temperature < 1 sharpens, > 1 smooths the teacher signal */
  temperature: number;
}

export interface DistilledBuildSignal {
  pr: number;
  branch: string;
  features: FeatureVector;
  teacherScores: Record<string, number>;
  studentScore: number;
  recommendations: string[];
  timestamp: number;
}

interface BranchProfile {
  branch: string;
  emaReliability: number;
  emaVelocity: number;
  emaSecurity: number;
  emaCoverage: number;
  emaCompliance: number;
  failureStreak: number;
  totalBuilds: number;
  lastUpdated: number;
}

interface PRWindowState {
  lastTimestamp: number;
  failureStreak: number;
  syntheticLag: number;
}

const STATUS_WEIGHTS: Record<BuildStatus, number> = {
  success: 1,
  running: 0.7,
  pending: 0.55,
  failed: 0,
};

const POLICY_WEIGHTS: Record<NonNullable<BuildEvent['policy']>, number> = {
  pass: 1,
  warn: 0.65,
  fail: 0,
};

function scoreTest(status?: BuildStatus | TestStatus): number {
  if (!status) return 0.6; // neutral if unknown
  switch (status) {
    case 'pass':
      return 1;
    case 'fail':
      return 0.08;
    case 'success':
      return 1;
    case 'running':
      return 0.75;
    case 'pending':
      return 0.55;
    case 'failed':
      return 0.1;
    default:
      return 0.6;
  }
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

export class BuildDistillationEngine extends EventEmitter {
  private readonly options: Required<DistillationOptions>;
  private readonly teacherLibrary: Map<string, TeacherProfile> = new Map();
  private readonly branchProfiles: Map<string, BranchProfile> = new Map();
  private readonly prWindows: Map<number, PRWindowState> = new Map();
  private readonly history: DistilledBuildSignal[] = [];

  constructor(options?: DistillationOptions) {
    super();
    this.options = {
      maxHistory: options?.maxHistory ?? 256,
      branchSmoothing: options?.branchSmoothing ?? 0.35,
      teacherDropout: options?.teacherDropout ?? 0.18,
    };

    this.seedTeachers();
  }

  /**
   * Register a new teacher profile that contributes to the knowledge distillation ensemble.
   */
  registerTeacher(profile: TeacherProfile): void {
    this.teacherLibrary.set(profile.id, profile);
  }

  /**
   * Remove a teacher profile by identifier.
   */
  unregisterTeacher(id: string): void {
    this.teacherLibrary.delete(id);
  }

  /**
   * Ingest a build event and return the distilled signal derived from it.
   */
  ingest(event: BuildEvent): DistilledBuildSignal {
    const timestamp = Date.parse(event.timestamp || '') || Date.now();
    const branch = event.branch || 'unknown';
    const prWindow = this.getWindow(event.pr, timestamp);

    const reliability = STATUS_WEIGHTS[event.status] ?? 0.5;
    const coverage = this.computeCoverageScore(event);
    const security = this.computeSecurityScore(event);
    const compliance = event.policy
      ? (POLICY_WEIGHTS[event.policy] ?? 0.5)
      : 0.7;
    const velocity = this.computeVelocityScore(prWindow);
    const stability = this.computeStabilityScore(prWindow, event.status);

    const features: FeatureVector = {
      reliability,
      coverage,
      security,
      velocity,
      stability,
      compliance,
    };

    this.updateBranchProfile(branch, features, timestamp, event.status);

    const teacherScores = this.computeTeacherScores(features);
    const studentScore = this.composeStudentScore(
      features,
      branch,
      teacherScores,
      prWindow,
    );
    const recommendations = this.generateRecommendations(
      features,
      branch,
      studentScore,
    );

    const distilled: DistilledBuildSignal = {
      pr: event.pr,
      branch,
      features,
      teacherScores,
      studentScore,
      recommendations,
      timestamp,
    };

    this.history.push(distilled);
    if (this.history.length > this.options.maxHistory) {
      this.history.shift();
    }

    this.emit('distilled', distilled);
    return distilled;
  }

  /**
   * Retrieve the most recent distilled signals (latest first).
   */
  getRecentSignals(limit = 20): DistilledBuildSignal[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Retrieve branch-level distilled profiles sorted by reliability.
   */
  getBranchProfiles(): BranchProfile[] {
    return Array.from(this.branchProfiles.values()).sort(
      (a, b) => b.emaReliability - a.emaReliability,
    );
  }

  /**
   * Get the teacher ensemble currently active.
   */
  getTeachers(): TeacherProfile[] {
    return Array.from(this.teacherLibrary.values());
  }

  /**
   * Provide a consolidated snapshot that the fabric can poll for upstream intelligence.
   */
  getSnapshot() {
    const branches = this.getBranchProfiles().slice(0, 12);
    const signals = this.getRecentSignals(12);

    const aggregateReliability =
      branches.reduce((acc, profile) => acc + profile.emaReliability, 0) /
      (branches.length || 1);

    return {
      aggregateReliability,
      branches,
      signals,
      teachers: this.getTeachers(),
    };
  }

  private seedTeachers(): void {
    this.registerTeacher({
      id: 'reliability-teacher',
      description:
        'Captures steady build execution with resilience to flaky reruns.',
      weights: {
        reliability: 0.45,
        stability: 0.25,
        velocity: 0.2,
        compliance: 0.1,
      },
      temperature: 0.85,
    });

    this.registerTeacher({
      id: 'coverage-teacher',
      description:
        'Focuses on test depth and supply chain hardening for release readiness.',
      weights: { coverage: 0.4, security: 0.3, compliance: 0.3 },
      temperature: 1.1,
    });

    this.registerTeacher({
      id: 'velocity-teacher',
      description:
        'Optimizes for rapid, repeatable iteration without burning DP budget.',
      weights: { velocity: 0.5, stability: 0.2, reliability: 0.3 },
      temperature: 0.95,
    });
  }

  private getWindow(pr: number, timestamp: number): PRWindowState {
    const window = this.prWindows.get(pr);
    if (window) {
      window.syntheticLag = timestamp - window.lastTimestamp;
      window.lastTimestamp = timestamp;
      return window;
    }

    const state: PRWindowState = {
      lastTimestamp: timestamp,
      failureStreak: 0,
      syntheticLag: 0,
    };
    this.prWindows.set(pr, state);
    return state;
  }

  private computeCoverageScore(event: BuildEvent): number {
    const tests = event.tests;
    if (!tests) return 0.65;

    const scores = [tests.unit, tests.e2e, tests.security].map((status) =>
      scoreTest(status),
    );
    const observed = scores.filter((value) => !Number.isNaN(value));
    const base =
      observed.reduce((acc, value) => acc + value, 0) / (observed.length || 1);

    // Signed artifacts amplify coverage confidence because they imply a green build
    const signatureBoost = event.signed ? 0.08 : 0;

    return clamp(base + signatureBoost);
  }

  private computeSecurityScore(event: BuildEvent): number {
    const base = scoreTest(event.tests?.security);
    const sbomSignal = event.sbomUrl ? 0.1 : 0;
    const signedSignal = event.signed ? 0.15 : 0;

    return clamp(base + sbomSignal + signedSignal);
  }

  private computeVelocityScore(prWindow: PRWindowState): number {
    if (!prWindow.syntheticLag) return 0.72; // no previous data yet

    // Normalise synthetic lag (ms) into [0,1] where faster loops score higher
    const minutes = prWindow.syntheticLag / 60000;
    const fastThreshold = 5;
    const slowThreshold = 45;

    if (minutes <= fastThreshold) return 1;
    if (minutes >= slowThreshold) return 0.2;

    return clamp(
      1 - (minutes - fastThreshold) / (slowThreshold - fastThreshold),
    );
  }

  private computeStabilityScore(
    prWindow: PRWindowState,
    status: BuildStatus,
  ): number {
    if (status === 'failed') {
      prWindow.failureStreak += 1;
    } else if (status === 'success') {
      prWindow.failureStreak = Math.max(0, prWindow.failureStreak - 1);
    }

    return clamp(1 - prWindow.failureStreak / 6);
  }

  private updateBranchProfile(
    branch: string,
    features: FeatureVector,
    timestamp: number,
    status: BuildStatus,
  ): void {
    const profile = this.branchProfiles.get(branch) ?? {
      branch,
      emaReliability: features.reliability,
      emaVelocity: features.velocity,
      emaSecurity: features.security,
      emaCoverage: features.coverage,
      emaCompliance: features.compliance,
      failureStreak: status === 'failed' ? 1 : 0,
      totalBuilds: 0,
      lastUpdated: timestamp,
    };

    const alpha = this.options.branchSmoothing;
    profile.emaReliability = this.ema(
      profile.emaReliability,
      features.reliability,
      alpha,
    );
    profile.emaVelocity = this.ema(
      profile.emaVelocity,
      features.velocity,
      alpha,
    );
    profile.emaSecurity = this.ema(
      profile.emaSecurity,
      features.security,
      alpha,
    );
    profile.emaCoverage = this.ema(
      profile.emaCoverage,
      features.coverage,
      alpha,
    );
    profile.emaCompliance = this.ema(
      profile.emaCompliance,
      features.compliance,
      alpha,
    );
    profile.failureStreak =
      status === 'failed'
        ? profile.failureStreak + 1
        : Math.max(0, profile.failureStreak - 1);
    profile.totalBuilds += 1;
    profile.lastUpdated = timestamp;

    this.branchProfiles.set(branch, profile);
  }

  private computeTeacherScores(
    features: FeatureVector,
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const teacher of this.teacherLibrary.values()) {
      const { weights, temperature, id } = teacher;
      let weighted = 0;
      let total = 0;

      for (const [featureKey, weight] of Object.entries(weights)) {
        const key = featureKey as keyof FeatureVector;
        const featureValue = features[key];
        if (typeof featureValue === 'number' && typeof weight === 'number') {
          weighted += featureValue * weight;
          total += weight;
        }
      }

      const normalized = total > 0 ? weighted / total : features.reliability;
      scores[id] = this.applyTemperature(normalized, temperature);
    }

    return scores;
  }

  private composeStudentScore(
    features: FeatureVector,
    branch: string,
    teacherScores: Record<string, number>,
    prWindow: PRWindowState,
  ): number {
    const branchProfile = this.branchProfiles.get(branch);
    const teacherAggregate = Object.values(teacherScores);
    const ensemble = teacherAggregate.length
      ? teacherAggregate.reduce((acc, value) => acc + value, 0) /
        teacherAggregate.length
      : features.reliability;

    const branchReliability = branchProfile
      ? branchProfile.emaReliability
      : features.reliability;
    const branchVelocity = branchProfile
      ? branchProfile.emaVelocity
      : features.velocity;

    const dropoutPenalty =
      1 -
      clamp(
        (this.options.teacherDropout * (prWindow.failureStreak + 1)) / 4,
        0,
        0.35,
      );
    const blend =
      0.45 * ensemble + 0.35 * branchReliability + 0.2 * branchVelocity;
    const stabilityBoost = features.stability * 0.1;

    return clamp(blend * dropoutPenalty + stabilityBoost);
  }

  private generateRecommendations(
    features: FeatureVector,
    branch: string,
    studentScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (studentScore < 0.55) {
      recommendations.push(
        `Investigate regression on ${branch}: distilled score ${studentScore.toFixed(2)}`,
      );
    }

    if (features.coverage < 0.65) {
      recommendations.push(
        'Expand unit/integration test coverage before next promotion',
      );
    }

    if (features.security < 0.65) {
      recommendations.push(
        'Escalate supply-chain scanning or SBOM signing for this artifact',
      );
    }

    if (features.velocity < 0.5) {
      recommendations.push(
        'Warm caches or allocate burst runners to reduce build turnaround',
      );
    }

    if (features.compliance < 0.6) {
      recommendations.push(
        'Policy feedback loop recommended prior to release gating',
      );
    }

    return recommendations;
  }

  private applyTemperature(score: number, temperature: number): number {
    const safeTemp = temperature <= 0 ? 1 : temperature;
    if (safeTemp === 1) return clamp(score);

    return clamp(Math.pow(score, safeTemp));
  }

  private ema(current: number, incoming: number, alpha: number): number {
    return current * (1 - alpha) + incoming * alpha;
  }
}

export type { BranchProfile };
