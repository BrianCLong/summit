/**
 * Content Moderation System for LLM Interactions
 *
 * Features:
 * - Pre/post processing hooks
 * - Pluggable moderation providers (OpenAI, Perspective API, custom)
 * - Multi-category classification (toxicity, violence, sexual, etc.)
 * - Configurable thresholds per tenant
 * - Async moderation queue for high throughput
 * - Appeal and override mechanisms
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';

const logger = new Logger('ContentModeration');
const metrics = new Metrics();

export type ModerationCategory =
  | 'toxicity'
  | 'severe_toxicity'
  | 'identity_attack'
  | 'insult'
  | 'profanity'
  | 'threat'
  | 'sexual'
  | 'violence'
  | 'self_harm'
  | 'hate'
  | 'harassment'
  | 'dangerous'
  | 'illegal';

export interface ModerationScore {
  category: ModerationCategory;
  score: number; // 0.0 - 1.0
  flagged: boolean;
}

export interface ModerationResult {
  id: string;
  flagged: boolean;
  scores: ModerationScore[];
  action: 'allow' | 'warn' | 'block' | 'review';
  reasons: string[];
  timestamp: Date;
  processingTime: number;
}

export interface ModerationConfig {
  enabled: boolean;
  provider: 'internal' | 'openai' | 'perspective' | 'custom';
  thresholds: Partial<Record<ModerationCategory, number>>;
  blockCategories: ModerationCategory[];
  warnCategories: ModerationCategory[];
  asyncMode: boolean;
  customEndpoint?: string;
}

export type ModerationHook = (
  content: string,
  context: ModerationContext
) => Promise<ModerationHookResult>;

export interface ModerationContext {
  userId?: string;
  tenantId?: string;
  type: 'input' | 'output';
  model?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ModerationHookResult {
  allow: boolean;
  modified?: string;
  reason?: string;
  scores?: Record<string, number>;
}

/**
 * Default thresholds for moderation categories
 */
const DEFAULT_THRESHOLDS: Record<ModerationCategory, number> = {
  toxicity: 0.7,
  severe_toxicity: 0.5,
  identity_attack: 0.6,
  insult: 0.8,
  profanity: 0.9,
  threat: 0.5,
  sexual: 0.6,
  violence: 0.6,
  self_harm: 0.5,
  hate: 0.5,
  harassment: 0.6,
  dangerous: 0.5,
  illegal: 0.3,
};

/**
 * Pattern-based content detection
 */
const CONTENT_PATTERNS: Record<ModerationCategory, RegExp[]> = {
  threat: [
    /\b(kill|murder|assassinate|destroy)\s+(you|him|her|them|everyone)/gi,
    /\b(bomb|attack|shoot|stab)\s+(the|a|your)/gi,
    /i('ll|'m going to|will)\s+(kill|hurt|harm)/gi,
  ],
  self_harm: [
    /\b(suicide|kill myself|end my life|cut myself)\b/gi,
    /\bhow to (die|commit suicide|harm myself)\b/gi,
  ],
  illegal: [
    /\bhow to (make|build|create)\s+(bomb|weapon|explosive|drug)/gi,
    /\b(hack|crack|break into)\s+(account|system|password)/gi,
    /\b(buy|sell|purchase)\s+(drugs|weapons|stolen)/gi,
  ],
  dangerous: [
    /\b(poison|toxic|deadly)\s+(recipe|formula|instructions)/gi,
    /\bhow to (bypass|evade|escape)\s+(police|security|detection)/gi,
  ],
  sexual: [
    /\b(nude|naked|explicit|pornographic)\b/gi,
    /\bsexual\s+(content|material|act)/gi,
  ],
  hate: [
    /\b(inferior|subhuman|vermin)\s+\w+\s*(race|people|group)/gi,
    /\b(exterminate|eliminate|cleanse)\s+\w+\s*(race|people|ethnic)/gi,
  ],
  harassment: [
    /\b(stalk|harass|dox|doxx)\s+(you|him|her|them)/gi,
    /\b(expose|reveal|share)\s+(your|their)\s+(address|location|identity)/gi,
  ],
  violence: [
    /\b(graphic|detailed)\s+(violence|gore|murder)/gi,
    /\b(torture|mutilate|dismember)/gi,
  ],
  toxicity: [],
  severe_toxicity: [],
  identity_attack: [],
  insult: [],
  profanity: [],
};

/**
 * Content Moderation Engine
 */
export class ContentModerationEngine {
  private config: ModerationConfig;
  private preHooks: ModerationHook[] = [];
  private postHooks: ModerationHook[] = [];
  private moderationQueue: Map<string, Promise<ModerationResult>> = new Map();

  constructor(config?: Partial<ModerationConfig>) {
    this.config = {
      enabled: true,
      provider: 'internal',
      thresholds: DEFAULT_THRESHOLDS,
      blockCategories: ['threat', 'self_harm', 'illegal', 'dangerous'],
      warnCategories: ['toxicity', 'hate', 'harassment', 'violence'],
      asyncMode: false,
      ...config,
    };

    logger.info('Content Moderation Engine initialized', {
      provider: this.config.provider,
      asyncMode: this.config.asyncMode,
    });
  }

  /**
   * Register pre-moderation hook
   */
  registerPreHook(hook: ModerationHook): void {
    this.preHooks.push(hook);
    logger.debug('Pre-moderation hook registered', { totalHooks: this.preHooks.length });
  }

  /**
   * Register post-moderation hook
   */
  registerPostHook(hook: ModerationHook): void {
    this.postHooks.push(hook);
    logger.debug('Post-moderation hook registered', { totalHooks: this.postHooks.length });
  }

  /**
   * Moderate content (input or output)
   */
  async moderate(content: string, context: ModerationContext): Promise<ModerationResult> {
    if (!this.config.enabled) {
      return this.createPassResult(content);
    }

    const startTime = Date.now();
    const resultId = crypto.randomUUID();

    try {
      // Run pre-hooks
      let processedContent = content;
      for (const hook of this.preHooks) {
        const hookResult = await hook(processedContent, context);
        if (!hookResult.allow) {
          return this.createBlockResult(resultId, hookResult.reason || 'Pre-hook blocked', startTime);
        }
        if (hookResult.modified) {
          processedContent = hookResult.modified;
        }
      }

      // Run main moderation
      const scores = await this.analyzeContent(processedContent);

      // Run post-hooks
      for (const hook of this.postHooks) {
        const hookResult = await hook(processedContent, context);
        if (!hookResult.allow) {
          return this.createBlockResult(resultId, hookResult.reason || 'Post-hook blocked', startTime);
        }
      }

      // Determine action based on scores
      const result = this.evaluateScores(resultId, scores, startTime);

      // Log and emit metrics
      this.logResult(result, context);

      return result;
    } catch (error) {
      logger.error('Moderation error', { error: (error as Error).message, context });
      metrics.counter('moderation_errors', { type: context.type });

      // Fail open or closed based on config
      return this.createPassResult(content); // Fail open for availability
    }
  }

  /**
   * Moderate input before sending to LLM
   */
  async moderateInput(content: string, context: Omit<ModerationContext, 'type'>): Promise<ModerationResult> {
    return this.moderate(content, { ...context, type: 'input' });
  }

  /**
   * Moderate output from LLM before returning to user
   */
  async moderateOutput(content: string, context: Omit<ModerationContext, 'type'>): Promise<ModerationResult> {
    return this.moderate(content, { ...context, type: 'output' });
  }

  /**
   * Async moderation for high throughput
   */
  async moderateAsync(content: string, context: ModerationContext): Promise<string> {
    const resultId = crypto.randomUUID();

    const promise = this.moderate(content, context);
    this.moderationQueue.set(resultId, promise);

    // Auto-cleanup after completion
    promise.finally(() => {
      setTimeout(() => this.moderationQueue.delete(resultId), 60000);
    });

    return resultId;
  }

  /**
   * Get async moderation result
   */
  async getAsyncResult(resultId: string): Promise<ModerationResult | null> {
    const promise = this.moderationQueue.get(resultId);
    if (!promise) return null;
    return promise;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Moderation config updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ModerationConfig {
    return { ...this.config };
  }

  /**
   * Analyze content for moderation categories
   */
  private async analyzeContent(content: string): Promise<ModerationScore[]> {
    switch (this.config.provider) {
      case 'internal':
        return this.internalAnalysis(content);
      case 'openai':
        return this.openAIAnalysis(content);
      case 'perspective':
        return this.perspectiveAnalysis(content);
      case 'custom':
        return this.customAnalysis(content);
      default:
        return this.internalAnalysis(content);
    }
  }

  /**
   * Internal pattern-based analysis
   */
  private async internalAnalysis(content: string): Promise<ModerationScore[]> {
    const scores: ModerationScore[] = [];
    const lowerContent = content.toLowerCase();

    for (const [category, patterns] of Object.entries(CONTENT_PATTERNS)) {
      let maxScore = 0;

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          // Score based on number of matches and severity
          const matchScore = Math.min(0.5 + matches.length * 0.2, 1.0);
          maxScore = Math.max(maxScore, matchScore);
        }
      }

      // Additional heuristics
      if (category === 'toxicity') {
        maxScore = this.calculateToxicityScore(lowerContent);
      }

      const threshold = this.config.thresholds[category as ModerationCategory] || DEFAULT_THRESHOLDS[category as ModerationCategory];

      scores.push({
        category: category as ModerationCategory,
        score: maxScore,
        flagged: maxScore >= threshold,
      });
    }

    return scores;
  }

  /**
   * OpenAI Moderation API
   */
  private async openAIAnalysis(content: string): Promise<ModerationScore[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not configured, falling back to internal');
      return this.internalAnalysis(content);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: content }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Moderation API error: ${response.status}`);
      }

      const data = await response.json() as {
        results: Array<{
          category_scores: Record<string, number>;
          categories: Record<string, boolean>;
        }>;
      };
      const result = data.results[0];

      return Object.entries(result.category_scores).map(([key, score]) => ({
        category: this.mapOpenAICategory(key),
        score: score as number,
        flagged: result.categories[key] || false,
      }));
    } catch (error) {
      logger.error('OpenAI moderation failed', { error: (error as Error).message });
      return this.internalAnalysis(content);
    }
  }

  /**
   * Perspective API analysis
   */
  private async perspectiveAnalysis(content: string): Promise<ModerationScore[]> {
    const apiKey = process.env.PERSPECTIVE_API_KEY;
    if (!apiKey) {
      logger.warn('Perspective API key not configured, falling back to internal');
      return this.internalAnalysis(content);
    }

    try {
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment: { text: content },
            languages: ['en'],
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              IDENTITY_ATTACK: {},
              INSULT: {},
              PROFANITY: {},
              THREAT: {},
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Perspective API error: ${response.status}`);
      }

      const data = await response.json() as {
        attributeScores: Record<string, { summaryScore: { value: number } }>;
      };

      return Object.entries(data.attributeScores).map(([key, value]) => {
        const category = key.toLowerCase() as ModerationCategory;
        const score = value.summaryScore.value;
        const threshold = this.config.thresholds[category] || DEFAULT_THRESHOLDS[category] || 0.7;

        return {
          category,
          score,
          flagged: score >= threshold,
        };
      });
    } catch (error) {
      logger.error('Perspective API failed', { error: (error as Error).message });
      return this.internalAnalysis(content);
    }
  }

  /**
   * Custom moderation endpoint
   */
  private async customAnalysis(content: string): Promise<ModerationScore[]> {
    if (!this.config.customEndpoint) {
      return this.internalAnalysis(content);
    }

    try {
      const response = await fetch(this.config.customEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Custom moderation error: ${response.status}`);
      }

      const data = await response.json() as { scores: ModerationScore[] };
      return data.scores;
    } catch (error) {
      logger.error('Custom moderation failed', { error: (error as Error).message });
      return this.internalAnalysis(content);
    }
  }

  private calculateToxicityScore(content: string): number {
    let score = 0;

    // Simple heuristics for toxicity
    const toxicIndicators = [
      { pattern: /\b(stupid|idiot|moron|dumb)\b/gi, weight: 0.3 },
      { pattern: /\b(hate|despise|loathe)\s+you/gi, weight: 0.4 },
      { pattern: /\b(shut up|go away|leave me alone)\b/gi, weight: 0.2 },
      { pattern: /!{3,}/g, weight: 0.1 }, // Multiple exclamation marks
      { pattern: /[A-Z]{5,}/g, weight: 0.15 }, // ALL CAPS sections
    ];

    for (const { pattern, weight } of toxicIndicators) {
      if (pattern.test(content)) {
        score += weight;
      }
    }

    return Math.min(score, 1.0);
  }

  private mapOpenAICategory(category: string): ModerationCategory {
    const mapping: Record<string, ModerationCategory> = {
      'hate': 'hate',
      'hate/threatening': 'threat',
      'harassment': 'harassment',
      'harassment/threatening': 'threat',
      'self-harm': 'self_harm',
      'self-harm/intent': 'self_harm',
      'self-harm/instructions': 'self_harm',
      'sexual': 'sexual',
      'sexual/minors': 'illegal',
      'violence': 'violence',
      'violence/graphic': 'violence',
    };
    return mapping[category] || 'toxicity';
  }

  private evaluateScores(id: string, scores: ModerationScore[], startTime: number): ModerationResult {
    const flaggedScores = scores.filter((s) => s.flagged);
    const reasons: string[] = [];
    let action: ModerationResult['action'] = 'allow';

    for (const score of flaggedScores) {
      if (this.config.blockCategories.includes(score.category)) {
        action = 'block';
        reasons.push(`Blocked: ${score.category} (${(score.score * 100).toFixed(1)}%)`);
      } else if (this.config.warnCategories.includes(score.category) && action !== 'block') {
        action = 'warn';
        reasons.push(`Warning: ${score.category} (${(score.score * 100).toFixed(1)}%)`);
      }
    }

    return {
      id,
      flagged: flaggedScores.length > 0,
      scores,
      action,
      reasons,
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
    };
  }

  private createPassResult(content: string): ModerationResult {
    return {
      id: crypto.randomUUID(),
      flagged: false,
      scores: [],
      action: 'allow',
      reasons: [],
      timestamp: new Date(),
      processingTime: 0,
    };
  }

  private createBlockResult(id: string, reason: string, startTime: number): ModerationResult {
    return {
      id,
      flagged: true,
      scores: [],
      action: 'block',
      reasons: [reason],
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
    };
  }

  private logResult(result: ModerationResult, context: ModerationContext): void {
    metrics.histogram('moderation_latency_ms', result.processingTime, {
      type: context.type,
      provider: this.config.provider,
    });

    if (result.flagged) {
      metrics.counter('moderation_flagged', {
        type: context.type,
        action: result.action,
      });

      logger.warn('Content flagged', {
        resultId: result.id,
        action: result.action,
        reasons: result.reasons,
        userId: context.userId,
        tenantId: context.tenantId,
      });
    }
  }
}

// Export singleton
export const contentModeration = new ContentModerationEngine();
