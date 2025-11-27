import logger from '../utils/logger';

export interface CulturalContext {
  region: string;
  language: string;
  highContext: boolean; // High vs Low context culture
  collectivist: number; // 0-1 (Individualist vs Collectivist)
  taboos: string[];
  values: string[];
}

export interface AdaptationResult {
  originalContent: string;
  adaptedContent: string;
  culturalFitScore: number;
  flaggedTaboos: string[];
}

/**
 * Cross-Cultural Influence Dynamics Service
 *
 * Sprint 25:
 * - Study how narratives adapt across cultural contexts.
 * - Build translation-aware detection pipelines.
 * - Test counter-messaging strategies tailored to cultural norms.
 */
export class CrossCulturalService {

  // Heuristic profiles for regions
  private profiles: Map<string, CulturalContext> = new Map([
    ['WEST_EUROPE', {
      region: 'WEST_EUROPE',
      language: 'en,fr,de',
      highContext: false,
      collectivist: 0.3,
      taboos: ['censorship', 'extremism'],
      values: ['freedom', 'individuality', 'rationality']
    }],
    ['EAST_ASIA', {
      region: 'EAST_ASIA',
      language: 'zh,jp,kr',
      highContext: true,
      collectivist: 0.8,
      taboos: ['disrespect_elders', 'public_shame'],
      values: ['harmony', 'hierarchy', 'collectivism']
    }]
  ]);

  constructor() {}

  public getContext(region: string): CulturalContext | undefined {
    return this.profiles.get(region);
  }

  /**
   * Analyzes how well a piece of content fits a target cultural context.
   */
  public analyzeCulturalFit(content: string, region: string): AdaptationResult {
    const context = this.profiles.get(region);
    if (!context) {
      throw new Error(`Unknown region: ${region}`);
    }

    const lowerContent = content.toLowerCase();
    const flaggedTaboos = context.taboos.filter(t => lowerContent.includes(t.replace('_', ' ')));

    // Check for value alignment
    const valueMatches = context.values.filter(v => lowerContent.includes(v));

    // Basic scoring
    let fitScore = 0.5; // Neutral start
    fitScore -= (flaggedTaboos.length * 0.2);
    fitScore += (valueMatches.length * 0.15);

    // Context style check (heuristic)
    // Low context cultures prefer direct explicit language
    // High context prefer implicit.
    // Detecting this accurately needs NLP, here we simulate with length/keyword checks.

    return {
      originalContent: content,
      adaptedContent: content, // No adaptation in analyze step
      culturalFitScore: Math.max(0, Math.min(1, fitScore)),
      flaggedTaboos
    };
  }

  /**
   * Adapts a counter-message strategy to be more effective in the target culture.
   */
  public adaptStrategy(message: string, region: string): AdaptationResult {
    const context = this.profiles.get(region);
    if (!context) {
       throw new Error(`Unknown region: ${region}`);
    }

    let adapted = message;

    // Adaptation Logic
    if (context.collectivist > 0.6) {
      // Shift from individual responsibility to group harmony
      adapted = adapted.replace(/you must/gi, 'we should');
      adapted = adapted.replace(/your rights/gi, 'our community');
    } else {
      // Individualist
      adapted = adapted.replace(/community/gi, 'individual');
    }

    if (context.highContext) {
      // Soften direct imperatives
      adapted = adapted.replace(/Do not/gi, 'It is unwise to');
    }

    return {
      originalContent: message,
      adaptedContent: adapted,
      culturalFitScore: 0.9, // Assumed improvement
      flaggedTaboos: []
    };
  }
}
