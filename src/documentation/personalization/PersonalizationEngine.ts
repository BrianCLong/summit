/**
 * Content Personalization & Adaptive User Experience Engine
 * AI-Driven Personalized Documentation Platform
 * Phase 46: Advanced Content Personalization
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface PersonalizationConfig {
  userProfiling: UserProfilingConfig;
  contentAdaptation: ContentAdaptationConfig;
  aiRecommendations: AIRecommendationConfig;
  behaviorTracking: BehaviorTrackingConfig;
  experimentation: ExperimentationConfig;
  privacy: PrivacyConfig;
}

export interface UserProfilingConfig {
  enabled: boolean;
  dataCollection: DataCollectionConfig;
  segmentation: SegmentationConfig;
  preferences: PreferenceConfig;
  learning: LearningConfig;
}

export interface ContentAdaptationConfig {
  dynamicContent: boolean;
  contextualHelp: boolean;
  adaptiveNavigation: boolean;
  personalizedSearch: boolean;
  contentRecommendations: boolean;
}

export interface AIRecommendationConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  models: AIModelConfig[];
  algorithms: RecommendationAlgorithm[];
  realTime: boolean;
  fallback: FallbackConfig;
}

export interface BehaviorTrackingConfig {
  events: TrackedEvent[];
  realTime: boolean;
  privacy: boolean;
  retention: number;
  anonymization: boolean;
}

export interface ExperimentationConfig {
  enabled: boolean;
  framework: 'ab' | 'multivariate' | 'bandit';
  experiments: Experiment[];
  targeting: TargetingConfig;
  statistics: StatisticsConfig;
}

export class PersonalizationEngine extends EventEmitter {
  private config: PersonalizationConfig;
  private userProfiles: Map<string, UserProfile> = new Map();
  private contentVariants: Map<string, ContentVariant[]> = new Map();
  private recommendations: Map<string, Recommendation[]> = new Map();
  private experiments: Map<string, ExperimentData> = new Map();
  private behaviorData: Map<string, BehaviorEvent[]> = new Map();

  constructor(config: PersonalizationConfig) {
    super();
    this.config = config;
    this.initializePersonalization();
  }

  /**
   * Initialize personalization system
   */
  private async initializePersonalization(): Promise<void> {
    await this.setupUserProfiling();
    await this.initializeAI();
    await this.setupBehaviorTracking();
    await this.loadContentVariants();
    await this.startExperiments();
    this.emit('personalization:initialized');
  }

  /**
   * Setup user profiling system
   */
  private async setupUserProfiling(): Promise<void> {
    if (!this.config.userProfiling.enabled) return;

    // Initialize user segmentation
    await this.initializeSegmentation();

    // Setup learning algorithms
    await this.setupLearningAlgorithms();

    // Load existing profiles
    await this.loadUserProfiles();

    this.emit('profiling:initialized');
  }

  /**
   * Get or create user profile
   */
  async getUserProfile(
    userId: string,
    context?: UserContext,
  ): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = await this.createUserProfile(userId, context);
      this.userProfiles.set(userId, profile);
    }

    // Update profile with current context
    if (context) {
      await this.updateUserProfile(profile, context);
    }

    return profile;
  }

  /**
   * Create new user profile
   */
  private async createUserProfile(
    userId: string,
    context?: UserContext,
  ): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      demographics: await this.inferDemographics(context),
      interests: [],
      skillLevel: 'intermediate',
      preferences: this.getDefaultPreferences(),
      behavior: {
        visitCount: 0,
        totalTime: 0,
        pageViews: 0,
        searchQueries: 0,
        contentInteractions: 0,
      },
      segments: [],
      customAttributes: {},
    };

    // Assign initial segments
    profile.segments = await this.assignUserSegments(profile, context);

    this.emit('profile:created', { userId, segments: profile.segments.length });
    return profile;
  }

  /**
   * Update user profile based on behavior
   */
  private async updateUserProfile(
    profile: UserProfile,
    context: UserContext,
  ): Promise<void> {
    // Update visit statistics
    profile.behavior.visitCount++;
    profile.behavior.pageViews++;
    profile.lastUpdated = new Date();

    // Update interests based on content interaction
    if (context.contentTopic) {
      await this.updateInterests(profile, context.contentTopic);
    }

    // Update skill level based on content difficulty
    if (context.contentDifficulty) {
      await this.updateSkillLevel(profile, context.contentDifficulty);
    }

    // Re-segment user if needed
    const newSegments = await this.assignUserSegments(profile, context);
    if (JSON.stringify(newSegments) !== JSON.stringify(profile.segments)) {
      profile.segments = newSegments;
      this.emit('profile:resegmented', { userId: profile.userId, newSegments });
    }

    this.userProfiles.set(profile.userId, profile);
  }

  /**
   * Generate personalized content for user
   */
  async personalizeContent(
    userId: string,
    contentId: string,
    context: PersonalizationContext,
  ): Promise<PersonalizedContent> {
    const profile = await this.getUserProfile(userId, context.userContext);

    // Get base content
    const baseContent = await this.getBaseContent(contentId);
    if (!baseContent) {
      throw new Error(`Content ${contentId} not found`);
    }

    // Apply personalization strategies
    const personalizedContent = await this.applyPersonalizationStrategies(
      baseContent,
      profile,
      context,
    );

    // Generate recommendations
    const recommendations = await this.generateContentRecommendations(
      profile,
      context,
    );

    // Apply A/B testing variants if active
    const experimentVariant = await this.getExperimentVariant(
      userId,
      contentId,
    );
    if (experimentVariant) {
      personalizedContent.variant = experimentVariant;
      await this.applyExperimentVariant(personalizedContent, experimentVariant);
    }

    // Track personalization event
    await this.trackPersonalizationEvent(userId, contentId, {
      strategy: personalizedContent.strategy,
      variant: personalizedContent.variant,
      recommendations: recommendations.length,
    });

    return {
      ...personalizedContent,
      recommendations,
      metadata: {
        personalized: true,
        strategy: personalizedContent.strategy,
        confidence: personalizedContent.confidence,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Apply personalization strategies
   */
  private async applyPersonalizationStrategies(
    content: BaseContent,
    profile: UserProfile,
    context: PersonalizationContext,
  ): Promise<PersonalizedContent> {
    const strategies: PersonalizationStrategy[] = [];

    // Skill level adaptation
    if (this.shouldAdaptForSkillLevel(profile, content)) {
      strategies.push(
        await this.adaptForSkillLevel(content, profile.skillLevel),
      );
    }

    // Interest-based customization
    if (profile.interests.length > 0) {
      strategies.push(await this.adaptForInterests(content, profile.interests));
    }

    // Role-based customization
    if (profile.role) {
      strategies.push(await this.adaptForRole(content, profile.role));
    }

    // Device/platform adaptation
    if (context.deviceInfo) {
      strategies.push(await this.adaptForDevice(content, context.deviceInfo));
    }

    // Language/locale adaptation
    if (profile.preferences.language && profile.preferences.language !== 'en') {
      strategies.push(
        await this.adaptForLanguage(content, profile.preferences.language),
      );
    }

    // Apply the most appropriate strategy
    const primaryStrategy = this.selectBestStrategy(
      strategies,
      profile,
      context,
    );

    return {
      ...content,
      ...primaryStrategy.adaptedContent,
      strategy: primaryStrategy.name,
      confidence: primaryStrategy.confidence,
    };
  }

  /**
   * Generate AI-powered content recommendations
   */
  async generateContentRecommendations(
    profile: UserProfile,
    context: PersonalizationContext,
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Collaborative filtering recommendations
    const collaborativeRecs =
      await this.getCollaborativeRecommendations(profile);
    recommendations.push(...collaborativeRecs);

    // Content-based recommendations
    const contentBasedRecs = await this.getContentBasedRecommendations(
      profile,
      context,
    );
    recommendations.push(...contentBasedRecs);

    // Hybrid recommendations
    const hybridRecs = await this.getHybridRecommendations(profile, context);
    recommendations.push(...hybridRecs);

    // Trending content recommendations
    const trendingRecs = await this.getTrendingRecommendations(profile);
    recommendations.push(...trendingRecs);

    // Sort by relevance score
    recommendations.sort((a, b) => b.score - a.score);

    // Apply diversity and freshness filters
    const diversifiedRecs = await this.diversifyRecommendations(
      recommendations,
      profile,
    );

    // Cache recommendations
    this.recommendations.set(profile.userId, diversifiedRecs.slice(0, 10));

    return diversifiedRecs.slice(0, 5); // Return top 5
  }

  /**
   * Track user behavior for personalization
   */
  async trackBehavior(userId: string, event: BehaviorEvent): Promise<void> {
    if (!this.config.behaviorTracking.enabled) return;

    // Apply privacy settings
    if (this.config.behaviorTracking.privacy) {
      event = await this.anonymizeBehaviorEvent(event);
    }

    // Store behavior event
    const userBehavior = this.behaviorData.get(userId) || [];
    userBehavior.push({
      ...event,
      timestamp: new Date(),
    });

    // Apply retention policy
    const retentionPeriod = this.config.behaviorTracking.retention;
    const cutoffDate = new Date(Date.now() - retentionPeriod);
    const filteredBehavior = userBehavior.filter(
      (e) => e.timestamp > cutoffDate,
    );

    this.behaviorData.set(userId, filteredBehavior);

    // Update user profile in real-time if enabled
    if (this.config.behaviorTracking.realTime) {
      await this.updateProfileFromBehavior(userId, event);
    }

    this.emit('behavior:tracked', { userId, eventType: event.type });
  }

  /**
   * Run A/B test experiment
   */
  async runExperiment(
    experimentId: string,
    userId: string,
    context: ExperimentContext,
  ): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.active) {
      return { variant: 'control', participated: false };
    }

    // Check if user is eligible
    const eligible = await this.checkExperimentEligibility(
      experiment,
      userId,
      context,
    );
    if (!eligible) {
      return { variant: 'control', participated: false };
    }

    // Assign variant
    const variant = await this.assignExperimentVariant(experiment, userId);

    // Track participation
    await this.trackExperimentParticipation(experimentId, userId, variant);

    return {
      variant: variant.name,
      participated: true,
      metadata: variant.metadata,
    };
  }

  /**
   * Generate personalization insights
   */
  async generatePersonalizationInsights(): Promise<PersonalizationInsights> {
    const insights: PersonalizationInsights = {
      timestamp: new Date(),
      totalUsers: this.userProfiles.size,
      segments: await this.getSegmentInsights(),
      recommendations: await this.getRecommendationInsights(),
      experiments: await this.getExperimentInsights(),
      performance: await this.getPersonalizationPerformance(),
      trends: await this.getPersonalizationTrends(),
    };

    this.emit('insights:generated', insights);
    return insights;
  }

  /**
   * Optimize personalization algorithms
   */
  async optimizeAlgorithms(): Promise<OptimizationResult> {
    const results: AlgorithmOptimization[] = [];

    // Optimize recommendation algorithms
    const recOptimization = await this.optimizeRecommendationAlgorithms();
    results.push(recOptimization);

    // Optimize segmentation
    const segOptimization = await this.optimizeSegmentation();
    results.push(segOptimization);

    // Optimize content adaptation
    const adaptOptimization = await this.optimizeContentAdaptation();
    results.push(adaptOptimization);

    const overallImprovement =
      results.reduce((sum, r) => sum + r.improvement, 0) / results.length;

    const optimizationResult: OptimizationResult = {
      timestamp: new Date(),
      overallImprovement,
      optimizations: results,
      recommendations: this.generateOptimizationRecommendations(results),
    };

    this.emit('optimization:completed', optimizationResult);
    return optimizationResult;
  }

  // Private utility methods
  private async initializeSegmentation(): Promise<void> {
    // Initialize user segmentation logic
    for (const segment of this.config.userProfiling.segmentation.segments) {
      await this.loadSegmentDefinition(segment);
    }
  }

  private async setupLearningAlgorithms(): Promise<void> {
    // Setup machine learning algorithms for user profiling
    const algorithms = this.config.userProfiling.learning.algorithms;
    for (const algorithm of algorithms) {
      await this.initializeLearningAlgorithm(algorithm);
    }
  }

  private async loadUserProfiles(): Promise<void> {
    // Load existing user profiles from storage
    try {
      const profilesPath = path.join(
        process.cwd(),
        'data',
        'user-profiles.json',
      );
      if (fs.existsSync(profilesPath)) {
        const profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
        for (const [userId, profileData] of Object.entries(profilesData)) {
          this.userProfiles.set(userId, profileData as UserProfile);
        }
      }
    } catch (error) {
      console.warn('Failed to load user profiles:', error);
    }
  }

  private async inferDemographics(
    context?: UserContext,
  ): Promise<UserDemographics> {
    const demographics: UserDemographics = {};

    if (context?.userAgent) {
      // Infer device and browser information
      demographics.device = this.parseDeviceInfo(context.userAgent);
    }

    if (context?.location) {
      demographics.country = context.location.country;
      demographics.timezone = context.location.timezone;
    }

    return demographics;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      theme: 'auto',
      density: 'medium',
      notifications: {
        email: false,
        push: false,
        inApp: true,
      },
      privacy: {
        analytics: true,
        personalization: true,
        cookies: 'essential',
      },
    };
  }

  private async assignUserSegments(
    profile: UserProfile,
    context?: UserContext,
  ): Promise<string[]> {
    const segments: string[] = [];

    for (const segmentConfig of this.config.userProfiling.segmentation
      .segments) {
      const matches = await this.evaluateSegmentCriteria(
        profile,
        segmentConfig,
        context,
      );
      if (matches) {
        segments.push(segmentConfig.id);
      }
    }

    return segments;
  }

  private async updateInterests(
    profile: UserProfile,
    topic: string,
  ): Promise<void> {
    const existingInterest = profile.interests.find((i) => i.topic === topic);

    if (existingInterest) {
      existingInterest.score += 0.1;
      existingInterest.lastInteraction = new Date();
    } else {
      profile.interests.push({
        topic,
        score: 0.1,
        firstInteraction: new Date(),
        lastInteraction: new Date(),
      });
    }

    // Normalize interest scores
    const totalScore = profile.interests.reduce((sum, i) => sum + i.score, 0);
    profile.interests.forEach((i) => (i.score /= totalScore));

    // Keep only top 20 interests
    profile.interests.sort((a, b) => b.score - a.score);
    profile.interests = profile.interests.slice(0, 20);
  }

  private async updateSkillLevel(
    profile: UserProfile,
    contentDifficulty: string,
  ): Promise<void> {
    const difficultyMap = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };

    const userLevel = difficultyMap[profile.skillLevel] || 2;
    const contentLevel = difficultyMap[contentDifficulty] || 2;

    // Adjust skill level based on content interaction
    if (contentLevel > userLevel) {
      // User engaging with more difficult content
      const newLevel = Math.min(4, userLevel + 0.1);
      profile.skillLevel =
        Object.keys(difficultyMap).find(
          (k) => difficultyMap[k] === Math.round(newLevel),
        ) || profile.skillLevel;
    }
  }

  private parseDeviceInfo(userAgent: string): DeviceInfo {
    // Simple user agent parsing (in production, use a library like ua-parser-js)
    return {
      type: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      os: userAgent.includes('Windows')
        ? 'windows'
        : userAgent.includes('Mac')
          ? 'macos'
          : 'linux',
      browser: userAgent.includes('Chrome')
        ? 'chrome'
        : userAgent.includes('Firefox')
          ? 'firefox'
          : 'other',
    };
  }

  private async getCollaborativeRecommendations(
    profile: UserProfile,
  ): Promise<Recommendation[]> {
    // Implement collaborative filtering algorithm
    const similarUsers = await this.findSimilarUsers(profile);
    const recommendations: Recommendation[] = [];

    for (const similarUser of similarUsers.slice(0, 10)) {
      const userContent = await this.getUserContentInteractions(
        similarUser.userId,
      );
      const profileContent = await this.getUserContentInteractions(
        profile.userId,
      );

      // Find content that similar user engaged with but current user hasn't
      const newContent = userContent.filter((c) => !profileContent.includes(c));

      for (const contentId of newContent.slice(0, 5)) {
        recommendations.push({
          contentId,
          type: 'collaborative',
          score: similarUser.similarity * 0.8,
          reason: 'Users with similar interests also viewed this',
        });
      }
    }

    return recommendations;
  }

  private async findSimilarUsers(
    profile: UserProfile,
  ): Promise<UserSimilarity[]> {
    const similarities: UserSimilarity[] = [];

    for (const [userId, otherProfile] of this.userProfiles) {
      if (userId === profile.userId) continue;

      const similarity = this.calculateUserSimilarity(profile, otherProfile);
      if (similarity > 0.3) {
        // Threshold for similarity
        similarities.push({ userId, similarity });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateUserSimilarity(
    profile1: UserProfile,
    profile2: UserProfile,
  ): number {
    let similarity = 0;
    let factors = 0;

    // Interest similarity
    if (profile1.interests.length > 0 && profile2.interests.length > 0) {
      const interestSim = this.calculateInterestSimilarity(
        profile1.interests,
        profile2.interests,
      );
      similarity += interestSim;
      factors++;
    }

    // Behavior similarity
    const behaviorSim = this.calculateBehaviorSimilarity(
      profile1.behavior,
      profile2.behavior,
    );
    similarity += behaviorSim;
    factors++;

    // Segment similarity
    const commonSegments = profile1.segments.filter((s) =>
      profile2.segments.includes(s),
    );
    const segmentSim =
      commonSegments.length /
      Math.max(profile1.segments.length, profile2.segments.length);
    similarity += segmentSim;
    factors++;

    return factors > 0 ? similarity / factors : 0;
  }

  private calculateInterestSimilarity(
    interests1: Interest[],
    interests2: Interest[],
  ): number {
    const topics1 = new Set(interests1.map((i) => i.topic));
    const topics2 = new Set(interests2.map((i) => i.topic));
    const intersection = new Set([...topics1].filter((t) => topics2.has(t)));
    const union = new Set([...topics1, ...topics2]);

    return intersection.size / union.size;
  }

  private calculateBehaviorSimilarity(
    behavior1: UserBehavior,
    behavior2: UserBehavior,
  ): number {
    // Simple behavior similarity based on normalized metrics
    const metrics1 = [
      behavior1.visitCount / 100,
      behavior1.totalTime / 10000,
      behavior1.pageViews / 100,
      behavior1.searchQueries / 50,
    ];

    const metrics2 = [
      behavior2.visitCount / 100,
      behavior2.totalTime / 10000,
      behavior2.pageViews / 100,
      behavior2.searchQueries / 50,
    ];

    // Calculate cosine similarity
    const dotProduct = metrics1.reduce(
      (sum, m1, i) => sum + m1 * metrics2[i],
      0,
    );
    const magnitude1 = Math.sqrt(metrics1.reduce((sum, m) => sum + m * m, 0));
    const magnitude2 = Math.sqrt(metrics2.reduce((sum, m) => sum + m * m, 0));

    return magnitude1 > 0 && magnitude2 > 0
      ? dotProduct / (magnitude1 * magnitude2)
      : 0;
  }

  // Additional private methods (abbreviated for space)
  private async getBaseContent(contentId: string): Promise<BaseContent | null> {
    // Implement content retrieval
    return null;
  }

  private shouldAdaptForSkillLevel(
    profile: UserProfile,
    content: BaseContent,
  ): boolean {
    return content.difficulty && content.difficulty !== profile.skillLevel;
  }

  private async adaptForSkillLevel(
    content: BaseContent,
    skillLevel: string,
  ): Promise<PersonalizationStrategy> {
    return {
      name: 'skill-level-adaptation',
      adaptedContent: content,
      confidence: 0.8,
    };
  }

  private async adaptForInterests(
    content: BaseContent,
    interests: Interest[],
  ): Promise<PersonalizationStrategy> {
    return {
      name: 'interest-based',
      adaptedContent: content,
      confidence: 0.7,
    };
  }

  private async adaptForRole(
    content: BaseContent,
    role: string,
  ): Promise<PersonalizationStrategy> {
    return {
      name: 'role-based',
      adaptedContent: content,
      confidence: 0.9,
    };
  }

  private async adaptForDevice(
    content: BaseContent,
    deviceInfo: DeviceInfo,
  ): Promise<PersonalizationStrategy> {
    return {
      name: 'device-adaptation',
      adaptedContent: content,
      confidence: 0.6,
    };
  }

  private async adaptForLanguage(
    content: BaseContent,
    language: string,
  ): Promise<PersonalizationStrategy> {
    return {
      name: 'language-adaptation',
      adaptedContent: content,
      confidence: 0.9,
    };
  }

  private selectBestStrategy(
    strategies: PersonalizationStrategy[],
    profile: UserProfile,
    context: PersonalizationContext,
  ): PersonalizationStrategy {
    return (
      strategies.sort((a, b) => b.confidence - a.confidence)[0] || {
        name: 'default',
        adaptedContent: {} as BaseContent,
        confidence: 0.5,
      }
    );
  }
}

// Type definitions
export interface UserProfile {
  userId: string;
  createdAt: Date;
  lastUpdated: Date;
  demographics: UserDemographics;
  interests: Interest[];
  skillLevel: string;
  role?: string;
  preferences: UserPreferences;
  behavior: UserBehavior;
  segments: string[];
  customAttributes: Record<string, any>;
}

export interface UserContext {
  userAgent?: string;
  location?: {
    country: string;
    timezone: string;
  };
  contentTopic?: string;
  contentDifficulty?: string;
  referrer?: string;
  sessionId?: string;
}

export interface PersonalizationContext {
  userContext?: UserContext;
  deviceInfo?: DeviceInfo;
  timeContext?: TimeContext;
  contentContext?: ContentContext;
}

export interface PersonalizedContent extends BaseContent {
  strategy: string;
  confidence: number;
  variant?: string;
  recommendations?: Recommendation[];
  metadata: {
    personalized: boolean;
    strategy: string;
    confidence: number;
    timestamp: Date;
  };
}

export interface BaseContent {
  id: string;
  title: string;
  content: string;
  type: string;
  difficulty?: string;
  topics: string[];
  metadata: Record<string, any>;
}

export interface Recommendation {
  contentId: string;
  type: 'collaborative' | 'content-based' | 'hybrid' | 'trending';
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface BehaviorEvent {
  type: string;
  data: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  pageId?: string;
}

export interface ExperimentResult {
  variant: string;
  participated: boolean;
  metadata?: Record<string, any>;
}

export interface PersonalizationInsights {
  timestamp: Date;
  totalUsers: number;
  segments: SegmentInsight[];
  recommendations: RecommendationInsight[];
  experiments: ExperimentInsight[];
  performance: PersonalizationPerformance;
  trends: PersonalizationTrend[];
}

export interface OptimizationResult {
  timestamp: Date;
  overallImprovement: number;
  optimizations: AlgorithmOptimization[];
  recommendations: string[];
}

// Supporting type definitions
export interface UserDemographics {
  age?: number;
  country?: string;
  timezone?: string;
  device?: DeviceInfo;
  organization?: string;
}

export interface Interest {
  topic: string;
  score: number;
  firstInteraction: Date;
  lastInteraction: Date;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'medium' | 'spacious';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    analytics: boolean;
    personalization: boolean;
    cookies: 'essential' | 'functional' | 'all';
  };
}

export interface UserBehavior {
  visitCount: number;
  totalTime: number;
  pageViews: number;
  searchQueries: number;
  contentInteractions: number;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}

export interface TimeContext {
  timezone: string;
  localTime: Date;
  dayOfWeek: number;
  season: string;
}

export interface ContentContext {
  category: string;
  tags: string[];
  difficulty: string;
  popularity: number;
}

export interface PersonalizationStrategy {
  name: string;
  adaptedContent: BaseContent;
  confidence: number;
}

export interface UserSimilarity {
  userId: string;
  similarity: number;
}

export interface ExperimentContext {
  pageId?: string;
  feature?: string;
  metadata?: Record<string, any>;
}

// Configuration interfaces
export interface DataCollectionConfig {
  explicit: boolean;
  implicit: boolean;
  thirdParty: boolean;
  cookies: boolean;
}

export interface SegmentationConfig {
  method: 'rule-based' | 'clustering' | 'hybrid';
  segments: SegmentDefinition[];
  updateFrequency: string;
}

export interface PreferenceConfig {
  explicit: boolean;
  inferFromBehavior: boolean;
  defaultValues: UserPreferences;
}

export interface LearningConfig {
  algorithms: string[];
  updateFrequency: string;
  crossValidation: boolean;
}

export interface AIModelConfig {
  name: string;
  type: string;
  configuration: Record<string, any>;
}

export interface RecommendationAlgorithm {
  name: string;
  type: 'collaborative' | 'content-based' | 'hybrid';
  weight: number;
  configuration: Record<string, any>;
}

export interface FallbackConfig {
  strategy: 'popular' | 'recent' | 'random';
  configuration: Record<string, any>;
}

export interface TrackedEvent {
  name: string;
  parameters: string[];
  sampling: number;
}

export interface Experiment {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  variants: ExperimentVariant[];
  targeting: TargetingRule[];
  metrics: ExperimentMetric[];
}

export interface TargetingConfig {
  rules: TargetingRule[];
  defaultInclude: boolean;
}

export interface StatisticsConfig {
  confidenceLevel: number;
  minSampleSize: number;
  maxDuration: number;
}

export interface PrivacyConfig {
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  anonymization: boolean;
  retention: number;
  consent: ConsentConfig;
}

// Additional supporting interfaces
export interface SegmentDefinition {
  id: string;
  name: string;
  criteria: SegmentCriterion[];
  weight: number;
}

export interface SegmentCriterion {
  field: string;
  operator: string;
  value: any;
}

export interface ExperimentData {
  experiment: Experiment;
  active: boolean;
  participants: Map<string, string>;
  results: ExperimentResults;
}

export interface ExperimentVariant {
  name: string;
  weight: number;
  configuration: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TargetingRule {
  field: string;
  operator: string;
  value: any;
}

export interface ExperimentMetric {
  name: string;
  type: 'conversion' | 'engagement' | 'revenue';
  configuration: Record<string, any>;
}

export interface ExperimentResults {
  startDate: Date;
  endDate?: Date;
  participants: number;
  conversions: Map<string, number>;
  metrics: Map<string, number>;
}

export interface ConsentConfig {
  required: boolean;
  granular: boolean;
  storage: string;
}

export interface ContentVariant {
  id: string;
  content: BaseContent;
  conditions: PersonalizationCondition[];
  weight: number;
}

export interface PersonalizationCondition {
  field: string;
  operator: string;
  value: any;
}

// Analytics and insights interfaces
export interface SegmentInsight {
  segmentId: string;
  name: string;
  userCount: number;
  growth: number;
  engagement: number;
  conversion: number;
}

export interface RecommendationInsight {
  algorithm: string;
  accuracy: number;
  coverage: number;
  diversity: number;
  novelty: number;
}

export interface ExperimentInsight {
  experimentId: string;
  name: string;
  status: string;
  participants: number;
  conversion: number;
  significance: number;
}

export interface PersonalizationPerformance {
  engagementLift: number;
  conversionLift: number;
  retentionImprovement: number;
  satisfactionScore: number;
}

export interface PersonalizationTrend {
  metric: string;
  values: TrendPoint[];
  direction: 'up' | 'down' | 'stable';
}

export interface TrendPoint {
  timestamp: Date;
  value: number;
}

export interface AlgorithmOptimization {
  algorithm: string;
  originalPerformance: number;
  optimizedPerformance: number;
  improvement: number;
  changes: string[];
}

export interface ExperimentAssignment {
  userId: string;
  experimentId: string;
  variant: string;
  timestamp: Date;
}
