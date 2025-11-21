import type { UserPreferences, AIExperience } from '../models/types.js';

/**
 * Preference Learning Service
 * Implements collaborative filtering and content-based recommendation
 */
export class PreferenceLearningService {
  private preferenceStore: Map<string, UserPreferences> = new Map();
  private experienceEmbeddings: Map<string, number[]> = new Map();

  /**
   * Record user interaction for preference learning
   */
  async recordInteraction(
    userId: string,
    experienceId: string,
    action: 'view' | 'install' | 'use' | 'rate' | 'uninstall',
    metadata?: { duration?: number; rating?: number }
  ): Promise<void> {
    const prefs = await this.getPreferences(userId);

    prefs.interactionHistory.push({
      experienceId,
      action,
      timestamp: new Date(),
      duration: metadata?.duration,
    });

    // Limit history size
    if (prefs.interactionHistory.length > 1000) {
      prefs.interactionHistory = prefs.interactionHistory.slice(-500);
    }

    await this.updateLearningProfile(userId, prefs);
    this.preferenceStore.set(userId, prefs);
  }

  /**
   * Get user preferences, creating defaults if needed
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    let prefs = this.preferenceStore.get(userId);
    if (!prefs) {
      prefs = {
        userId,
        locale: 'en-US',
        interests: [],
        skills: [],
        preferredCategories: [],
        dislikedCategories: [],
        accessibilityNeeds: [],
        interactionHistory: [],
      };
      this.preferenceStore.set(userId, prefs);
    }
    return prefs;
  }

  /**
   * Update user preferences explicitly
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const prefs = await this.getPreferences(userId);
    const updated = { ...prefs, ...updates, userId };
    this.preferenceStore.set(userId, updated);
    return updated;
  }

  /**
   * Update the learning profile based on interaction history
   */
  private async updateLearningProfile(
    userId: string,
    prefs: UserPreferences
  ): Promise<void> {
    // Calculate embedding from interaction history
    const embedding = this.calculateUserEmbedding(prefs);

    prefs.learningProfile = {
      embeddingVector: embedding,
      lastUpdated: new Date(),
      confidenceScore: Math.min(prefs.interactionHistory.length / 50, 1),
    };
  }

  /**
   * Calculate user embedding vector from preferences and history
   */
  private calculateUserEmbedding(prefs: UserPreferences): number[] {
    // Simplified embedding calculation
    // In production, use ML models (matrix factorization, neural CF)
    const dimensions = 64;
    const embedding = new Array(dimensions).fill(0);

    // Weight interactions by recency and action type
    const actionWeights = {
      view: 0.1,
      install: 0.5,
      use: 0.8,
      rate: 0.6,
      uninstall: -0.3,
    };

    for (const interaction of prefs.interactionHistory) {
      const expEmbedding = this.experienceEmbeddings.get(interaction.experienceId);
      if (expEmbedding) {
        const weight = actionWeights[interaction.action];
        const recencyDecay = this.calculateRecencyDecay(interaction.timestamp);

        for (let i = 0; i < dimensions; i++) {
          embedding[i] += (expEmbedding[i] || 0) * weight * recencyDecay;
        }
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      return embedding.map(v => v / magnitude);
    }
    return embedding;
  }

  /**
   * Calculate recency decay factor
   */
  private calculateRecencyDecay(timestamp: Date): number {
    const daysSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysSince / 30); // 30-day half-life
  }

  /**
   * Compute similarity between two embeddings
   */
  computeSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0;

    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }
    return dotProduct; // Cosine similarity (vectors are normalized)
  }

  /**
   * Register experience embedding for recommendation
   */
  registerExperienceEmbedding(experienceId: string, embedding: number[]): void {
    this.experienceEmbeddings.set(experienceId, embedding);
  }
}
