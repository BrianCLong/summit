/**
 * Intelligence Engine
 * Advanced intelligence processing and analysis for political intelligence
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IntelligenceEngineConfig,
  PoliticalAnalysisEvents,
  PoliticalIntelligence,
  IntelligenceSource,
  IntelligenceConfidence,
  IntelligenceCategory,
  IntelligencePattern,
  IntelligenceInsight,
  PoliticalTrend,
  PoliticalTrendType,
  RiskFactor
} from '../types/index.js';

export class IntelligenceEngine extends EventEmitter {
  private config: IntelligenceEngineConfig;
  private intelligence: Map<string, PoliticalIntelligence>;
  private patterns: Map<string, IntelligencePattern>;
  private insights: Map<string, IntelligenceInsight>;
  private processingQueue: PoliticalIntelligence[];

  constructor(config: IntelligenceEngineConfig) {
    super();
    this.config = {
      patternDetection: true,
      insightGeneration: true,
      autoProcess: true,
      retentionPeriod: 365, // 1 year
      ...config
    };

    this.intelligence = new Map();
    this.patterns = new Map();
    this.insights = new Map();
    this.processingQueue = [];

    this.setupEventHandlers();

    if (this.config.autoProcess) {
      this.startAutoProcessing();
    }
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.on('error', (error: Error) => {
      console.error('IntelligenceEngine Error:', error);
    });

    this.on('intelligence:received', (intel: PoliticalIntelligence) => {
      if (this.config.autoProcess) {
        this.queueForProcessing(intel);
      }
    });
  }

  /**
   * Start automatic processing of intelligence
   */
  private startAutoProcessing(): void {
    setInterval(() => {
      this.processQueue();
    }, 60000); // Process every minute
  }

  /**
   * Collect political intelligence
   */
  async collectIntelligence(
    source: IntelligenceSource,
    category: IntelligenceCategory,
    data: {
      country: string;
      region?: string;
      title: string;
      summary: string;
      details: string;
      actors?: string[];
      implications?: string[];
      urgency?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
      confidence?: IntelligenceConfidence;
      verified?: boolean;
      validUntil?: Date;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<PoliticalIntelligence> {
    try {
      // Validate source
      if (!this.config.sources.includes(source)) {
        throw new Error(`Intelligence source ${source} is not configured`);
      }

      // Create intelligence record
      const intelligence: PoliticalIntelligence = {
        id: uuidv4(),
        source,
        confidence: data.confidence || IntelligenceConfidence.MODERATE,
        country: data.country,
        region: data.region,
        category,
        title: data.title,
        summary: data.summary,
        details: data.details,
        actors: data.actors || [],
        implications: data.implications || [],
        urgency: data.urgency || 'MODERATE',
        verified: data.verified || false,
        collectedAt: new Date(),
        validUntil: data.validUntil,
        tags: data.tags || [],
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Check minimum confidence threshold
      if (this.compareConfidence(intelligence.confidence, this.config.minimumConfidence) < 0) {
        console.warn(`Intelligence ${intelligence.id} below minimum confidence threshold`);
      }

      // Store intelligence
      this.intelligence.set(intelligence.id, intelligence);

      // Emit event
      this.emit('intelligence:received', intelligence);

      return intelligence;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Process intelligence to extract insights and patterns
   */
  async processIntelligence(
    intelligenceId: string,
    options: {
      detectPatterns?: boolean;
      generateInsights?: boolean;
      crossReference?: boolean;
    } = {}
  ): Promise<{
    intelligence: PoliticalIntelligence;
    patterns: IntelligencePattern[];
    insights: IntelligenceInsight[];
  }> {
    try {
      const intelligence = this.intelligence.get(intelligenceId);
      if (!intelligence) {
        throw new Error(`Intelligence not found: ${intelligenceId}`);
      }

      const detectPatterns = options.detectPatterns !== false && this.config.patternDetection;
      const generateInsights = options.generateInsights !== false && this.config.insightGeneration;
      const crossReference = options.crossReference !== false;

      // Detect patterns
      const patterns: IntelligencePattern[] = detectPatterns
        ? await this.detectPatterns(intelligence)
        : [];

      // Generate insights
      const insights: IntelligenceInsight[] = generateInsights
        ? await this.generateInsights(intelligence, patterns)
        : [];

      // Cross-reference with existing intelligence
      if (crossReference) {
        await this.crossReferenceIntelligence(intelligence);
      }

      return {
        intelligence,
        patterns,
        insights
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Analyze multiple intelligence reports
   */
  async analyzeIntelligence(
    filters: {
      country?: string;
      region?: string;
      category?: IntelligenceCategory;
      sources?: IntelligenceSource[];
      minConfidence?: IntelligenceConfidence;
      startDate?: Date;
      endDate?: Date;
      tags?: string[];
    } = {}
  ): Promise<{
    intelligence: PoliticalIntelligence[];
    patterns: IntelligencePattern[];
    insights: IntelligenceInsight[];
    trends: Partial<PoliticalTrend>[];
    risks: RiskFactor[];
  }> {
    try {
      // Filter intelligence
      const filtered = this.filterIntelligence(filters);

      // Detect patterns across multiple reports
      const patterns = await this.detectPatternsAcrossReports(filtered);

      // Generate comprehensive insights
      const insights = await this.generateComprehensiveInsights(filtered, patterns);

      // Identify emerging trends
      const trends = this.identifyTrends(filtered, patterns);

      // Assess risks
      const risks = this.assessRisks(filtered, insights);

      return {
        intelligence: filtered,
        patterns,
        insights,
        trends,
        risks
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Track patterns and correlations
   */
  async trackPatterns(
    options: {
      minOccurrences?: number;
      minConfidence?: number;
      timeWindow?: number; // in days
    } = {}
  ): Promise<IntelligencePattern[]> {
    try {
      const minOccurrences = options.minOccurrences || 3;
      const minConfidence = options.minConfidence || 70;
      const timeWindow = options.timeWindow || 90;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeWindow);

      // Get recent intelligence
      const recentIntel: PoliticalIntelligence[] = [];
      this.intelligence.forEach(intel => {
        if (intel.collectedAt >= cutoffDate) {
          recentIntel.push(intel);
        }
      });

      // Detect patterns
      const patterns = await this.detectPatternsAcrossReports(recentIntel);

      // Filter by criteria
      const filtered = patterns.filter(
        pattern =>
          pattern.intelligence.length >= minOccurrences &&
          pattern.confidence >= minConfidence
      );

      return filtered;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Generate insights from intelligence
   */
  async generateInsights(
    intelligence: PoliticalIntelligence,
    relatedPatterns: IntelligencePattern[] = []
  ): Promise<IntelligenceInsight[]> {
    try {
      const insights: IntelligenceInsight[] = [];

      // Analysis insight
      if (intelligence.category === IntelligenceCategory.LEADERSHIP) {
        const analysisInsight = this.createLeadershipInsight(intelligence);
        if (analysisInsight) {
          insights.push(analysisInsight);
          this.insights.set(analysisInsight.id, analysisInsight);
          this.emit('insight:generated', analysisInsight);
        }
      }

      // Warning insights based on urgency and category
      if (intelligence.urgency === 'CRITICAL' || intelligence.urgency === 'HIGH') {
        const warningInsight = this.createWarningInsight(intelligence);
        if (warningInsight) {
          insights.push(warningInsight);
          this.insights.set(warningInsight.id, warningInsight);
          this.emit('insight:generated', warningInsight);
        }
      }

      // Pattern-based insights
      if (relatedPatterns.length > 0) {
        const patternInsight = this.createPatternInsight(intelligence, relatedPatterns);
        if (patternInsight) {
          insights.push(patternInsight);
          this.insights.set(patternInsight.id, patternInsight);
          this.emit('insight:generated', patternInsight);
        }
      }

      return insights;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Detect patterns in intelligence
   */
  private async detectPatterns(
    intelligence: PoliticalIntelligence
  ): Promise<IntelligencePattern[]> {
    const patterns: IntelligencePattern[] = [];

    // Find related intelligence by category and country
    const related: PoliticalIntelligence[] = [];
    this.intelligence.forEach(intel => {
      if (
        intel.id !== intelligence.id &&
        intel.category === intelligence.category &&
        intel.country === intelligence.country
      ) {
        related.push(intel);
      }
    });

    if (related.length >= 2) {
      const pattern: IntelligencePattern = {
        id: uuidv4(),
        name: `${intelligence.category} Pattern in ${intelligence.country}`,
        type: 'TREND',
        description: `Recurring ${intelligence.category.toLowerCase()} activities detected`,
        intelligence: [intelligence.id, ...related.slice(0, 4).map(r => r.id)],
        confidence: 75,
        significance: 70,
        discoveredAt: new Date(),
        indicators: intelligence.tags
      };

      this.patterns.set(pattern.id, pattern);
      this.emit('pattern:detected', pattern);
      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Detect patterns across multiple intelligence reports
   */
  private async detectPatternsAcrossReports(
    intelligence: PoliticalIntelligence[]
  ): Promise<IntelligencePattern[]> {
    const patterns: IntelligencePattern[] = [];

    // Group by category and country
    const groups = new Map<string, PoliticalIntelligence[]>();

    intelligence.forEach(intel => {
      const key = `${intel.category}_${intel.country}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(intel);
    });

    // Detect patterns in each group
    groups.forEach((group, key) => {
      if (group.length >= 3) {
        const [category, country] = key.split('_');
        const pattern: IntelligencePattern = {
          id: uuidv4(),
          name: `${category} Pattern in ${country}`,
          type: 'TREND',
          description: `Sustained ${category.toLowerCase()} activities in ${country}`,
          intelligence: group.map(g => g.id),
          confidence: Math.min(95, 60 + group.length * 5),
          significance: Math.min(90, 50 + group.length * 8),
          discoveredAt: new Date(),
          indicators: this.extractCommonTags(group)
        };

        patterns.push(pattern);
        this.patterns.set(pattern.id, pattern);
        this.emit('pattern:detected', pattern);
      }
    });

    return patterns;
  }

  /**
   * Generate comprehensive insights from multiple intelligence reports
   */
  private async generateComprehensiveInsights(
    intelligence: PoliticalIntelligence[],
    patterns: IntelligencePattern[]
  ): Promise<IntelligenceInsight[]> {
    const insights: IntelligenceInsight[] = [];

    // High urgency items
    const critical = intelligence.filter(i => i.urgency === 'CRITICAL' || i.urgency === 'HIGH');
    if (critical.length > 0) {
      const insight: IntelligenceInsight = {
        id: uuidv4(),
        title: `${critical.length} Critical Intelligence Items Detected`,
        type: 'WARNING',
        content: `Multiple high-priority intelligence reports require immediate attention: ${critical.map(c => c.title).join(', ')}`,
        confidence: 85,
        impact: 'HIGH',
        timeframe: 'Immediate to short-term',
        sources: critical.map(c => c.id),
        recommendations: [
          'Review all critical intelligence items',
          'Assess immediate risks and threats',
          'Coordinate response measures'
        ],
        generatedAt: new Date()
      };

      insights.push(insight);
      this.insights.set(insight.id, insight);
      this.emit('insight:generated', insight);
    }

    // Pattern-based insights
    patterns.forEach(pattern => {
      if (pattern.significance >= 70) {
        const insight: IntelligenceInsight = {
          id: uuidv4(),
          title: `Pattern Detected: ${pattern.name}`,
          type: 'ANALYSIS',
          content: pattern.description,
          confidence: pattern.confidence,
          impact: pattern.significance >= 80 ? 'HIGH' : 'MODERATE',
          timeframe: 'Medium-term',
          sources: pattern.intelligence,
          recommendations: [
            'Monitor pattern development',
            'Assess long-term implications',
            'Update strategic assessments'
          ],
          generatedAt: new Date()
        };

        insights.push(insight);
        this.insights.set(insight.id, insight);
        this.emit('insight:generated', insight);
      }
    });

    return insights;
  }

  /**
   * Identify emerging trends from intelligence
   */
  private identifyTrends(
    intelligence: PoliticalIntelligence[],
    patterns: IntelligencePattern[]
  ): Partial<PoliticalTrend>[] {
    const trends: Partial<PoliticalTrend>[] = [];

    // Group by country
    const byCountry = new Map<string, PoliticalIntelligence[]>();
    intelligence.forEach(intel => {
      if (!byCountry.has(intel.country)) {
        byCountry.set(intel.country, []);
      }
      byCountry.get(intel.country)!.push(intel);
    });

    // Analyze trends in each country
    byCountry.forEach((intel, country) => {
      // Check for democratization trend
      const democratization = intel.filter(
        i => i.tags.includes('reform') || i.tags.includes('democratization')
      );
      if (democratization.length >= 3) {
        trends.push({
          id: uuidv4(),
          type: PoliticalTrendType.DEMOCRATIZATION,
          country,
          title: 'Democratization Trend',
          description: 'Multiple indicators suggest ongoing democratization efforts',
          startDate: new Date(),
          active: true,
          strength: Math.min(100, democratization.length * 20),
          momentum: 'ACCELERATING',
          drivers: this.extractCommonTags(democratization)
        });
      }

      // Check for polarization
      const polarization = intel.filter(
        i => i.tags.includes('polarization') || i.category === IntelligenceCategory.CONFLICT
      );
      if (polarization.length >= 3) {
        trends.push({
          id: uuidv4(),
          type: PoliticalTrendType.POLARIZATION,
          country,
          title: 'Political Polarization',
          description: 'Increasing political polarization detected',
          startDate: new Date(),
          active: true,
          strength: Math.min(100, polarization.length * 18),
          momentum: 'STABLE',
          drivers: this.extractCommonTags(polarization)
        });
      }
    });

    return trends;
  }

  /**
   * Assess risks from intelligence
   */
  private assessRisks(
    intelligence: PoliticalIntelligence[],
    insights: IntelligenceInsight[]
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Critical intelligence items are risks
    intelligence.forEach(intel => {
      if (intel.urgency === 'CRITICAL') {
        risks.push({
          type: this.mapCategoryToRiskType(intel.category),
          description: intel.summary,
          severity: 'CRITICAL',
          likelihood: this.mapConfidenceToLikelihood(intel.confidence),
          impact: 85,
          mitigation: intel.implications
        });
      } else if (intel.urgency === 'HIGH') {
        risks.push({
          type: this.mapCategoryToRiskType(intel.category),
          description: intel.summary,
          severity: 'HIGH',
          likelihood: this.mapConfidenceToLikelihood(intel.confidence),
          impact: 70,
          mitigation: intel.implications
        });
      }
    });

    return risks;
  }

  /**
   * Cross-reference intelligence with existing data
   */
  private async crossReferenceIntelligence(
    intelligence: PoliticalIntelligence
  ): Promise<void> {
    // Find related intelligence
    const related: PoliticalIntelligence[] = [];

    this.intelligence.forEach(intel => {
      if (intel.id === intelligence.id) return;

      // Check for common actors
      const commonActors = intelligence.actors.filter(a => intel.actors.includes(a));
      if (commonActors.length > 0) {
        related.push(intel);
        return;
      }

      // Check for same country and category
      if (intel.country === intelligence.country && intel.category === intelligence.category) {
        related.push(intel);
        return;
      }

      // Check for common tags
      const commonTags = intelligence.tags.filter(t => intel.tags.includes(t));
      if (commonTags.length >= 2) {
        related.push(intel);
      }
    });

    // If we found related intelligence, update metadata
    if (related.length > 0 && intelligence.metadata) {
      intelligence.metadata.relatedIntelligence = related.map(r => r.id);
      intelligence.updatedAt = new Date();
    }
  }

  /**
   * Filter intelligence by criteria
   */
  private filterIntelligence(filters: {
    country?: string;
    region?: string;
    category?: IntelligenceCategory;
    sources?: IntelligenceSource[];
    minConfidence?: IntelligenceConfidence;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
  }): PoliticalIntelligence[] {
    const filtered: PoliticalIntelligence[] = [];

    this.intelligence.forEach(intel => {
      // Country filter
      if (filters.country && intel.country !== filters.country) return;

      // Region filter
      if (filters.region && intel.region !== filters.region) return;

      // Category filter
      if (filters.category && intel.category !== filters.category) return;

      // Source filter
      if (filters.sources && !filters.sources.includes(intel.source)) return;

      // Confidence filter
      if (
        filters.minConfidence &&
        this.compareConfidence(intel.confidence, filters.minConfidence) < 0
      ) {
        return;
      }

      // Date filters
      if (filters.startDate && intel.collectedAt < filters.startDate) return;
      if (filters.endDate && intel.collectedAt > filters.endDate) return;

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => intel.tags.includes(tag));
        if (!hasTag) return;
      }

      filtered.push(intel);
    });

    return filtered;
  }

  /**
   * Queue intelligence for processing
   */
  private queueForProcessing(intelligence: PoliticalIntelligence): void {
    this.processingQueue.push(intelligence);
  }

  /**
   * Process queued intelligence
   */
  private async processQueue(): Promise<void> {
    while (this.processingQueue.length > 0) {
      const intel = this.processingQueue.shift();
      if (intel) {
        try {
          await this.processIntelligence(intel.id);
        } catch (error) {
          console.error('Error processing intelligence:', error);
        }
      }
    }
  }

  /**
   * Helper: Create leadership insight
   */
  private createLeadershipInsight(intel: PoliticalIntelligence): IntelligenceInsight | null {
    return {
      id: uuidv4(),
      title: `Leadership Analysis: ${intel.title}`,
      type: 'ANALYSIS',
      content: intel.summary,
      confidence: this.mapConfidenceToNumber(intel.confidence),
      impact: intel.urgency === 'CRITICAL' ? 'CRITICAL' : intel.urgency === 'HIGH' ? 'HIGH' : 'MODERATE',
      timeframe: 'Short to medium-term',
      sources: [intel.id],
      recommendations: intel.implications || [],
      generatedAt: new Date()
    };
  }

  /**
   * Helper: Create warning insight
   */
  private createWarningInsight(intel: PoliticalIntelligence): IntelligenceInsight | null {
    return {
      id: uuidv4(),
      title: `Warning: ${intel.title}`,
      type: 'WARNING',
      content: intel.summary,
      confidence: this.mapConfidenceToNumber(intel.confidence),
      impact: intel.urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      timeframe: 'Immediate',
      sources: [intel.id],
      recommendations: [
        'Monitor situation closely',
        'Assess potential impacts',
        ...intel.implications || []
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Helper: Create pattern insight
   */
  private createPatternInsight(
    intel: PoliticalIntelligence,
    patterns: IntelligencePattern[]
  ): IntelligenceInsight | null {
    const relevantPattern = patterns[0];
    if (!relevantPattern) return null;

    return {
      id: uuidv4(),
      title: `Pattern Context: ${intel.title}`,
      type: 'ANALYSIS',
      content: `This intelligence is part of a larger pattern: ${relevantPattern.description}`,
      confidence: relevantPattern.confidence,
      impact: relevantPattern.significance >= 75 ? 'HIGH' : 'MODERATE',
      timeframe: 'Medium to long-term',
      sources: [intel.id, ...patterns.map(p => p.id)],
      recommendations: [
        'Consider broader pattern implications',
        'Monitor trend development',
        'Update strategic assessments'
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Helper: Extract common tags from intelligence reports
   */
  private extractCommonTags(intelligence: PoliticalIntelligence[]): string[] {
    const tagCounts = new Map<string, number>();

    intelligence.forEach(intel => {
      intel.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Return tags that appear in at least 40% of reports
    const threshold = intelligence.length * 0.4;
    return Array.from(tagCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([tag, _]) => tag);
  }

  /**
   * Helper: Compare confidence levels
   */
  private compareConfidence(a: IntelligenceConfidence, b: IntelligenceConfidence): number {
    const order = [
      IntelligenceConfidence.RUMOR,
      IntelligenceConfidence.UNCONFIRMED,
      IntelligenceConfidence.LOW,
      IntelligenceConfidence.MODERATE,
      IntelligenceConfidence.HIGH,
      IntelligenceConfidence.CONFIRMED
    ];

    return order.indexOf(a) - order.indexOf(b);
  }

  /**
   * Helper: Map confidence to number
   */
  private mapConfidenceToNumber(confidence: IntelligenceConfidence): number {
    const map = {
      [IntelligenceConfidence.CONFIRMED]: 95,
      [IntelligenceConfidence.HIGH]: 80,
      [IntelligenceConfidence.MODERATE]: 65,
      [IntelligenceConfidence.LOW]: 45,
      [IntelligenceConfidence.UNCONFIRMED]: 30,
      [IntelligenceConfidence.RUMOR]: 15
    };
    return map[confidence] || 50;
  }

  /**
   * Helper: Map confidence to likelihood
   */
  private mapConfidenceToLikelihood(confidence: IntelligenceConfidence): number {
    return this.mapConfidenceToNumber(confidence);
  }

  /**
   * Helper: Map category to risk type
   */
  private mapCategoryToRiskType(
    category: IntelligenceCategory
  ): 'POLITICAL' | 'SOCIAL' | 'ECONOMIC' | 'SECURITY' | 'INSTITUTIONAL' {
    const map: Record<IntelligenceCategory, 'POLITICAL' | 'SOCIAL' | 'ECONOMIC' | 'SECURITY' | 'INSTITUTIONAL'> = {
      [IntelligenceCategory.LEADERSHIP]: 'POLITICAL',
      [IntelligenceCategory.POLICY]: 'POLITICAL',
      [IntelligenceCategory.ELECTION]: 'POLITICAL',
      [IntelligenceCategory.COUP]: 'SECURITY',
      [IntelligenceCategory.PROTEST]: 'SOCIAL',
      [IntelligenceCategory.ALLIANCE]: 'POLITICAL',
      [IntelligenceCategory.CONFLICT]: 'SECURITY',
      [IntelligenceCategory.CORRUPTION]: 'INSTITUTIONAL',
      [IntelligenceCategory.SUCCESSION]: 'POLITICAL',
      [IntelligenceCategory.REFORM]: 'INSTITUTIONAL',
      [IntelligenceCategory.CRISIS]: 'SECURITY',
      [IntelligenceCategory.FOREIGN_RELATIONS]: 'POLITICAL'
    };
    return map[category] || 'POLITICAL';
  }

  /**
   * Get all intelligence
   */
  getAllIntelligence(): PoliticalIntelligence[] {
    return Array.from(this.intelligence.values());
  }

  /**
   * Get intelligence by ID
   */
  getIntelligence(id: string): PoliticalIntelligence | undefined {
    return this.intelligence.get(id);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): IntelligencePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get all insights
   */
  getAllInsights(): IntelligenceInsight[] {
    return Array.from(this.insights.values());
  }

  /**
   * Clean up old intelligence based on retention policy
   */
  cleanupOldIntelligence(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (this.config.retentionPeriod || 365));

    let removed = 0;
    this.intelligence.forEach((intel, id) => {
      if (intel.collectedAt < cutoffDate) {
        this.intelligence.delete(id);
        removed++;
      }
    });

    return removed;
  }

  /**
   * Get configuration
   */
  getConfig(): IntelligenceEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IntelligenceEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default IntelligenceEngine;
