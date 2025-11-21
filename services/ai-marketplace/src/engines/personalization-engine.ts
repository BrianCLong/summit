import type {
  AIExperience,
  UserPreferences,
  Recommendation,
  MarketplaceFilter,
} from '../models/types.js';
import { PreferenceLearningService } from '../services/preference-learning.js';

/**
 * Personalization Engine
 * Combines collaborative filtering, content-based, and contextual signals
 */
export class PersonalizationEngine {
  private learningService: PreferenceLearningService;
  private experienceCatalog: Map<string, AIExperience> = new Map();

  constructor(learningService: PreferenceLearningService) {
    this.learningService = learningService;
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: string,
    filter?: MarketplaceFilter
  ): Promise<Recommendation[]> {
    const prefs = await this.learningService.getPreferences(userId);
    const candidates = this.filterExperiences(filter);

    const recommendations: Recommendation[] = [];

    for (const experience of candidates) {
      const score = this.calculatePersonalizationScore(experience, prefs);
      const reasons = this.generateReasons(experience, prefs, score);

      if (score > 0.1) {
        recommendations.push({
          experienceId: experience.id,
          score,
          reasons,
          personalizedDescription: this.localizeDescription(
            experience,
            prefs.locale
          ),
        });
      }
    }

    // Sort by score descending
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, filter?.limit || 20);
  }

  /**
   * Calculate personalization score for an experience
   */
  private calculatePersonalizationScore(
    experience: AIExperience,
    prefs: UserPreferences
  ): number {
    let score = 0;
    const weights = {
      persona: 0.25,
      locale: 0.15,
      interests: 0.20,
      embedding: 0.25,
      popularity: 0.10,
      recency: 0.05,
    };

    // Persona match
    if (prefs.persona && experience.persona === prefs.persona) {
      score += weights.persona;
    } else if (!prefs.persona) {
      score += weights.persona * 0.5; // Neutral if no persona set
    }

    // Locale support
    if (experience.supportedLocales.includes(prefs.locale)) {
      score += weights.locale;
    } else if (experience.supportedLocales.includes(prefs.locale.split('-')[0])) {
      score += weights.locale * 0.7; // Partial match (e.g., 'en' for 'en-US')
    }

    // Interest overlap
    const interestOverlap = this.calculateSetOverlap(
      new Set(prefs.interests),
      new Set([...experience.tags, experience.category])
    );
    score += weights.interests * interestOverlap;

    // Embedding similarity (collaborative filtering signal)
    if (prefs.learningProfile?.embeddingVector) {
      const expEmbedding = this.getExperienceEmbedding(experience.id);
      if (expEmbedding) {
        const similarity = this.learningService.computeSimilarity(
          prefs.learningProfile.embeddingVector,
          expEmbedding
        );
        score += weights.embedding * Math.max(0, similarity);
      }
    }

    // Popularity signal (normalized rating)
    if (experience.rating !== undefined) {
      score += weights.popularity * (experience.rating / 5);
    }

    // Recency boost for new experiences
    const daysSinceUpdate =
      (Date.now() - experience.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += weights.recency * (1 - daysSinceUpdate / 30);
    }

    // Penalty for disliked categories
    if (prefs.dislikedCategories.includes(experience.category)) {
      score *= 0.3;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Generate human-readable reasons for recommendation
   */
  private generateReasons(
    experience: AIExperience,
    prefs: UserPreferences,
    score: number
  ): string[] {
    const reasons: string[] = [];

    if (prefs.persona === experience.persona) {
      reasons.push(`Designed for ${experience.persona}s like you`);
    }

    if (experience.supportedLocales.includes(prefs.locale)) {
      reasons.push(`Available in your language`);
    }

    const matchingInterests = prefs.interests.filter(
      i => experience.tags.includes(i) || experience.category === i
    );
    if (matchingInterests.length > 0) {
      reasons.push(`Matches your interest in ${matchingInterests[0]}`);
    }

    if (experience.rating && experience.rating >= 4.5) {
      reasons.push(`Highly rated (${experience.rating.toFixed(1)} stars)`);
    }

    if (score > 0.8) {
      reasons.push(`Strong match for your profile`);
    }

    return reasons.slice(0, 3);
  }

  /**
   * Filter experiences based on marketplace filters
   */
  private filterExperiences(filter?: MarketplaceFilter): AIExperience[] {
    let experiences = Array.from(this.experienceCatalog.values());

    if (filter) {
      if (filter.persona) {
        experiences = experiences.filter(e => e.persona === filter.persona);
      }
      if (filter.categories?.length) {
        experiences = experiences.filter(e =>
          filter.categories!.includes(e.category)
        );
      }
      if (filter.tags?.length) {
        experiences = experiences.filter(e =>
          e.tags.some(t => filter.tags!.includes(t))
        );
      }
      if (filter.locale) {
        experiences = experiences.filter(
          e =>
            e.supportedLocales.includes(filter.locale!) ||
            e.supportedLocales.includes(filter.locale!.split('-')[0])
        );
      }
      if (filter.priceModel) {
        experiences = experiences.filter(
          e => e.pricing.model === filter.priceModel
        );
      }
      if (filter.minRating !== undefined) {
        experiences = experiences.filter(
          e => e.rating !== undefined && e.rating >= filter.minRating!
        );
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        experiences = experiences.filter(
          e =>
            e.name.toLowerCase().includes(searchLower) ||
            e.description.toLowerCase().includes(searchLower) ||
            e.tags.some(t => t.toLowerCase().includes(searchLower))
        );
      }
    }

    return experiences;
  }

  /**
   * Calculate overlap between two sets
   */
  private calculateSetOverlap<T>(set1: Set<T>, set2: Set<T>): number {
    if (set1.size === 0 || set2.size === 0) return 0;
    let overlap = 0;
    for (const item of set1) {
      if (set2.has(item)) overlap++;
    }
    return overlap / Math.max(set1.size, set2.size);
  }

  /**
   * Get or generate experience embedding
   */
  private getExperienceEmbedding(experienceId: string): number[] | undefined {
    const experience = this.experienceCatalog.get(experienceId);
    if (!experience) return undefined;

    // Generate simple content-based embedding
    const dimensions = 64;
    const embedding = new Array(dimensions).fill(0);

    // Hash-based feature encoding
    const features = [
      experience.category,
      experience.persona,
      ...experience.tags,
      ...experience.capabilities,
    ];

    for (let i = 0; i < features.length; i++) {
      const hash = this.simpleHash(features[i]);
      embedding[hash % dimensions] += 1 / (i + 1);
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Localize experience description
   */
  private localizeDescription(
    experience: AIExperience,
    locale: string
  ): string {
    // In production, use i18n service for actual translation
    // This is a placeholder for the localization hook
    return experience.description;
  }

  /**
   * Register an experience in the catalog
   */
  registerExperience(experience: AIExperience): void {
    this.experienceCatalog.set(experience.id, experience);

    // Register embedding for collaborative filtering
    const embedding = this.getExperienceEmbedding(experience.id);
    if (embedding) {
      this.learningService.registerExperienceEmbedding(experience.id, embedding);
    }
  }

  /**
   * Get experience by ID
   */
  getExperience(id: string): AIExperience | undefined {
    return this.experienceCatalog.get(id);
  }

  /**
   * List all experiences with optional filter
   */
  listExperiences(filter?: MarketplaceFilter): AIExperience[] {
    return this.filterExperiences(filter);
  }
}
