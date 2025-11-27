import logger from '../utils/logger';

export interface CognitiveState {
  userId: string;
  currentLoad: number; // 0-100, current mental processing load
  fatigueLevel: number; // 0-100, accumulated tiredness
  susceptibilityScore: number; // 0-1, likelihood of accepting influence
}

export interface MessageMeta {
  id: string;
  complexity: number; // 1-10
  emotionalIntensity: number; // 1-10
  urgency: number; // 1-10
}

/**
 * Cognitive Load & Attention Service
 *
 * Sprint 24:
 * - Research how information overload impacts susceptibility.
 * - Simulate campaigns with varying message density.
 * - Develop resilience strategies.
 */
export class CognitiveLoadService {
  private userStates: Map<string, CognitiveState> = new Map();

  // Simulation Constants
  private readonly DECAY_RATE = 5; // Fatigue recovery per tick
  private readonly OVERLOAD_THRESHOLD = 80;

  constructor() {}

  public getOrCreateUser(userId: string): CognitiveState {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        userId,
        currentLoad: 0,
        fatigueLevel: 0,
        susceptibilityScore: 0.1 // Baseline
      });
    }
    return this.userStates.get(userId)!;
  }

  /**
   * Simulates the cognitive impact of exposing a user to a batch of messages.
   */
  public simulateExposure(userId: string, messages: MessageMeta[]): CognitiveState {
    const state = this.getOrCreateUser(userId);

    // Calculate aggregate load of this batch
    let batchLoad = 0;
    for (const msg of messages) {
      // Complexity adds to load directly
      // Emotional intensity amplifies the impact
      const impact = msg.complexity * (1 + (msg.emotionalIntensity / 10));
      batchLoad += impact;
    }

    // Update State
    state.currentLoad += batchLoad;

    // Load above capacity converts to fatigue
    if (state.currentLoad > 100) {
      const overflow = state.currentLoad - 100;
      state.fatigueLevel += overflow * 0.5; // Fatigue accumulates
      state.currentLoad = 100; // Cap load
    }

    // Recalculate susceptibility
    this.updateSusceptibility(state);

    return state;
  }

  /**
   * Applies a resilience strategy to help user recover.
   */
  public applyResilienceStrategy(userId: string, strategy: 'DIGITAL_DETOX' | 'CONTENT_FILTERING' | 'CONTEXTUAL_LABELS'): CognitiveState {
    const state = this.getOrCreateUser(userId);

    switch (strategy) {
      case 'DIGITAL_DETOX':
        // Massive reduction in load and fatigue
        state.currentLoad = 0;
        state.fatigueLevel = Math.max(0, state.fatigueLevel - 50);
        break;

      case 'CONTENT_FILTERING':
        // Reduces current load only
        state.currentLoad = Math.max(0, state.currentLoad - 30);
        break;

      case 'CONTEXTUAL_LABELS':
        // Reduces cognitive effort to process info, thus reducing future load build-up (not modeled here directly),
        // but creates a small immediate relief in load
        state.currentLoad = Math.max(0, state.currentLoad - 10);
        break;
    }

    this.updateSusceptibility(state);
    return state;
  }

  /**
   * Updates the susceptibility score based on current fatigue and load.
   * Hypothesis: High fatigue + High Load = High Susceptibility (System 1 thinking takeover).
   */
  private updateSusceptibility(state: CognitiveState) {
    // Normalize factors to 0-1
    const loadFactor = state.currentLoad / 100;
    const fatigueFactor = Math.min(100, state.fatigueLevel) / 100;

    // Susceptibility formula: Baseline + (Fatigue * 0.6) + (Load * 0.3)
    let score = 0.1 + (fatigueFactor * 0.6) + (loadFactor * 0.3);

    state.susceptibilityScore = Math.min(1.0, score);
  }

  /**
   * Simulate passage of time (recovery).
   */
  public tick(userId: string) {
    const state = this.getOrCreateUser(userId);

    // Natural decay
    state.currentLoad = Math.max(0, state.currentLoad - 10);
    state.fatigueLevel = Math.max(0, state.fatigueLevel - this.DECAY_RATE);

    this.updateSusceptibility(state);
  }
}
