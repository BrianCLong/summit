import { v4 as uuidv4 } from 'uuid';
import type {
  AIExperience,
  UserPreferences,
  Recommendation,
  MarketplaceFilter,
  PersonaType,
} from '../models/types.js';
import { AIExperienceSchema } from '../models/types.js';
import { PersonalizationEngine } from '../engines/personalization-engine.js';
import { PreferenceLearningService } from './preference-learning.js';

/**
 * AI Marketplace Service
 * Main service for managing the AI experience marketplace
 */
export class AIMarketplaceService {
  private personalizationEngine: PersonalizationEngine;
  private learningService: PreferenceLearningService;
  private userInstallations: Map<string, Set<string>> = new Map();

  constructor() {
    this.learningService = new PreferenceLearningService();
    this.personalizationEngine = new PersonalizationEngine(this.learningService);
    this.initializeDefaultExperiences();
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: string,
    filter?: MarketplaceFilter
  ): Promise<Recommendation[]> {
    return this.personalizationEngine.getRecommendations(userId, filter);
  }

  /**
   * Browse marketplace with filters
   */
  async browse(filter?: MarketplaceFilter): Promise<AIExperience[]> {
    return this.personalizationEngine.listExperiences(filter);
  }

  /**
   * Get experience details
   */
  async getExperience(id: string): Promise<AIExperience | null> {
    return this.personalizationEngine.getExperience(id) || null;
  }

  /**
   * Install an experience for a user
   */
  async installExperience(userId: string, experienceId: string): Promise<boolean> {
    const experience = this.personalizationEngine.getExperience(experienceId);
    if (!experience) return false;

    let installations = this.userInstallations.get(userId);
    if (!installations) {
      installations = new Set();
      this.userInstallations.set(userId, installations);
    }

    installations.add(experienceId);

    // Record for preference learning
    await this.learningService.recordInteraction(userId, experienceId, 'install');

    return true;
  }

  /**
   * Uninstall an experience for a user
   */
  async uninstallExperience(userId: string, experienceId: string): Promise<boolean> {
    const installations = this.userInstallations.get(userId);
    if (!installations?.has(experienceId)) return false;

    installations.delete(experienceId);

    // Record for preference learning
    await this.learningService.recordInteraction(userId, experienceId, 'uninstall');

    return true;
  }

  /**
   * Get user's installed experiences
   */
  async getInstalledExperiences(userId: string): Promise<AIExperience[]> {
    const installations = this.userInstallations.get(userId);
    if (!installations) return [];

    const experiences: AIExperience[] = [];
    for (const id of installations) {
      const exp = this.personalizationEngine.getExperience(id);
      if (exp) experiences.push(exp);
    }
    return experiences;
  }

  /**
   * Record usage of an experience
   */
  async recordUsage(
    userId: string,
    experienceId: string,
    durationSeconds: number
  ): Promise<void> {
    await this.learningService.recordInteraction(userId, experienceId, 'use', {
      duration: durationSeconds,
    });
  }

  /**
   * Rate an experience
   */
  async rateExperience(
    userId: string,
    experienceId: string,
    rating: number
  ): Promise<boolean> {
    const experience = this.personalizationEngine.getExperience(experienceId);
    if (!experience || rating < 1 || rating > 5) return false;

    // Update experience rating (simplified - production would use proper aggregation)
    const currentRating = experience.rating || 0;
    const currentCount = experience.reviewCount || 0;
    experience.rating =
      (currentRating * currentCount + rating) / (currentCount + 1);
    experience.reviewCount = currentCount + 1;

    await this.learningService.recordInteraction(userId, experienceId, 'rate', {
      rating,
    });

    return true;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    return this.learningService.updatePreferences(userId, updates);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    return this.learningService.getPreferences(userId);
  }

  /**
   * Publish a new experience to the marketplace
   */
  async publishExperience(
    publisherId: string,
    publisherName: string,
    data: Omit<AIExperience, 'id' | 'publisher' | 'createdAt' | 'updatedAt' | 'rating' | 'reviewCount'>
  ): Promise<AIExperience> {
    const experience: AIExperience = {
      ...data,
      id: uuidv4(),
      rating: undefined,
      reviewCount: 0,
      publisher: {
        id: publisherId,
        name: publisherName,
        verified: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    AIExperienceSchema.parse(experience);
    this.personalizationEngine.registerExperience(experience);

    return experience;
  }

  /**
   * Initialize default experiences for each persona
   */
  private initializeDefaultExperiences(): void {
    const defaultExperiences: Omit<AIExperience, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Citizen experiences
      {
        name: 'Smart City Assistant',
        description: 'AI-powered assistant for city services, transit, and local information',
        persona: 'citizen',
        category: 'public-services',
        tags: ['transit', 'utilities', 'local-gov', 'accessibility'],
        capabilities: ['service-lookup', 'appointment-booking', 'bill-payment'],
        supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'ar-SA'],
        version: '2.0.0',
        rating: 4.6,
        reviewCount: 12543,
        pricing: { model: 'free', currency: 'USD' },
        publisher: { id: 'gov-1', name: 'GovTech Solutions', verified: true },
      },
      {
        name: 'Healthcare Navigator',
        description: 'Find healthcare providers, schedule appointments, and manage prescriptions',
        persona: 'citizen',
        category: 'healthcare',
        tags: ['health', 'medical', 'appointments', 'insurance'],
        capabilities: ['provider-search', 'telehealth', 'prescription-refill'],
        supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'pt-BR', 'ja-JP'],
        version: '1.5.0',
        rating: 4.4,
        reviewCount: 8921,
        pricing: { model: 'free', currency: 'USD' },
        publisher: { id: 'health-1', name: 'HealthFirst AI', verified: true },
      },
      // Business experiences
      {
        name: 'Enterprise Analytics Suite',
        description: 'AI-driven business intelligence with predictive analytics and reporting',
        persona: 'business',
        category: 'analytics',
        tags: ['bi', 'reporting', 'forecasting', 'dashboards'],
        capabilities: ['data-visualization', 'predictive-models', 'automated-reports'],
        supportedLocales: ['en-US', 'en-GB', 'de-DE', 'ja-JP', 'ko-KR'],
        version: '3.2.0',
        rating: 4.8,
        reviewCount: 3421,
        pricing: { model: 'subscription', basePrice: 299, currency: 'USD' },
        publisher: { id: 'biz-1', name: 'DataDriven Inc', verified: true },
      },
      {
        name: 'Compliance Copilot',
        description: 'Stay compliant with AI-assisted regulatory guidance and audit preparation',
        persona: 'business',
        category: 'compliance',
        tags: ['regulatory', 'audit', 'risk', 'gdpr', 'sox'],
        capabilities: ['regulation-lookup', 'audit-prep', 'risk-assessment'],
        supportedLocales: ['en-US', 'en-GB', 'de-DE', 'fr-FR'],
        version: '2.1.0',
        rating: 4.7,
        reviewCount: 1892,
        pricing: { model: 'subscription', basePrice: 499, currency: 'USD' },
        publisher: { id: 'biz-2', name: 'ComplianceAI', verified: true },
      },
      // Developer experiences
      {
        name: 'Code Review Assistant',
        description: 'AI-powered code review with security scanning and best practice suggestions',
        persona: 'developer',
        category: 'development',
        tags: ['code-review', 'security', 'best-practices', 'ci-cd'],
        capabilities: ['static-analysis', 'security-scan', 'style-check'],
        supportedLocales: ['en-US', 'ja-JP', 'zh-CN', 'ko-KR', 'de-DE'],
        version: '4.0.0',
        rating: 4.9,
        reviewCount: 15632,
        pricing: { model: 'freemium', basePrice: 19, currency: 'USD' },
        publisher: { id: 'dev-1', name: 'DevTools Pro', verified: true },
      },
      {
        name: 'API Integration Hub',
        description: 'Connect and orchestrate APIs with AI-generated integration code',
        persona: 'developer',
        category: 'integration',
        tags: ['api', 'integration', 'automation', 'webhooks'],
        capabilities: ['api-discovery', 'code-generation', 'testing'],
        supportedLocales: ['en-US', 'es-ES', 'pt-BR', 'ja-JP'],
        version: '2.5.0',
        rating: 4.5,
        reviewCount: 7823,
        pricing: { model: 'usage', basePrice: 0.01, currency: 'USD' },
        publisher: { id: 'dev-2', name: 'IntegratePro', verified: true },
      },
    ];

    for (const exp of defaultExperiences) {
      const experience: AIExperience = {
        ...exp,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.personalizationEngine.registerExperience(experience);
    }
  }
}

// Singleton export
export const marketplaceService = new AIMarketplaceService();
