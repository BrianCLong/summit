/**
 * Narrative extraction from text content
 * Identifies story arcs, themes, and key narrative elements
 */

import type { Narrative, StoryArc, NarrativeActor } from './types.js';

export class NarrativeExtractor {
  private narrativeCache: Map<string, Narrative> = new Map();

  async extractNarrative(text: string, source: string): Promise<Narrative> {
    const id = this.generateNarrativeId(text);

    // Check cache
    if (this.narrativeCache.has(id)) {
      return this.narrativeCache.get(id)!;
    }

    // Extract narrative components
    const themes = await this.extractThemes(text);
    const actors = await this.extractActors(text);
    const storyArc = await this.identifyStoryArc(text);
    const sentiment = await this.calculateNarrativeSentiment(text);

    const narrative: Narrative = {
      id,
      title: this.generateTitle(themes),
      description: this.generateDescription(text),
      storyArc,
      framing: {
        mainFrame: themes[0] || 'unknown',
        subFrames: themes.slice(1, 4),
        framingDevices: [],
        perspective: this.detectPerspective(text),
        tone: sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral',
      },
      themes,
      actors,
      timeline: [],
      sentiment,
      prevalence: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
      sources: [source],
    };

    this.narrativeCache.set(id, narrative);
    return narrative;
  }

  async extractThemes(text: string): Promise<string[]> {
    const themes: string[] = [];

    // Common intelligence-related themes
    const themeKeywords = {
      threat: ['threat', 'danger', 'risk', 'attack', 'hostile'],
      security: ['security', 'protection', 'defense', 'safeguard'],
      conspiracy: ['conspiracy', 'plot', 'scheme', 'collusion'],
      corruption: ['corruption', 'bribe', 'fraud', 'illegal'],
      conflict: ['conflict', 'war', 'battle', 'confrontation'],
      cooperation: ['cooperation', 'alliance', 'partnership', 'collaboration'],
      crisis: ['crisis', 'emergency', 'disaster', 'catastrophe'],
      reform: ['reform', 'change', 'transformation', 'revolution'],
    };

    const lowerText = text.toLowerCase();

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matchCount > 0) {
        themes.push(theme);
      }
    }

    return themes.length > 0 ? themes : ['general'];
  }

  async extractActors(text: string): Promise<NarrativeActor[]> {
    const actors: NarrativeActor[] = [];

    // Simple actor extraction (in production, use NER)
    const sentences = text.split(/[.!?]+/);

    // Look for common actor patterns
    const actorPatterns = [
      /(?:president|leader|official|minister|director)\s+(\w+)/gi,
      /(\w+)\s+(?:said|stated|claimed|announced)/gi,
      /(?:group|organization|party|faction)\s+(\w+)/gi,
    ];

    const actorNames = new Set<string>();

    for (const sentence of sentences) {
      for (const pattern of actorPatterns) {
        const matches = sentence.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].length > 2) {
            actorNames.add(match[1]);
          }
        }
      }
    }

    for (const name of actorNames) {
      actors.push({
        name,
        role: this.inferRole(name, text),
        attributes: [],
        actions: [],
      });
    }

    return actors;
  }

  async identifyStoryArc(text: string): Promise<StoryArc> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Divide text into story arc sections
    const sections = Math.ceil(sentences.length / 5);

    return {
      exposition: sentences.slice(0, sections),
      risingAction: sentences.slice(sections, sections * 2),
      climax: sentences.slice(sections * 2, sections * 3),
      fallingAction: sentences.slice(sections * 3, sections * 4),
      resolution: sentences.slice(sections * 4),
      arcType: this.detectArcType(text),
    };
  }

  private detectArcType(text: string): StoryArc['arcType'] {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('hero') ||
      lowerText.includes('victory') ||
      lowerText.includes('triumph')
    ) {
      return 'hero';
    }
    if (lowerText.includes('tragedy') || lowerText.includes('disaster')) {
      return 'tragedy';
    }
    if (lowerText.includes('quest') || lowerText.includes('search')) {
      return 'quest';
    }
    if (lowerText.includes('journey') || lowerText.includes('voyage')) {
      return 'voyage';
    }

    return 'quest'; // Default
  }

  private detectPerspective(text: string): 'first-person' | 'second-person' | 'third-person' {
    const lowerText = text.toLowerCase();

    if (lowerText.match(/\b(i|we|our|us)\b/g)) {
      return 'first-person';
    }
    if (lowerText.match(/\b(you|your)\b/g)) {
      return 'second-person';
    }
    return 'third-person';
  }

  private inferRole(
    name: string,
    text: string
  ): 'protagonist' | 'antagonist' | 'supporting' | 'victim' | 'hero' | 'villain' {
    const lowerText = text.toLowerCase();
    const lowerName = name.toLowerCase();

    // Simple sentiment-based role assignment
    const context = this.getActorContext(lowerName, lowerText);

    if (context.includes('hero') || context.includes('defender')) {
      return 'hero';
    }
    if (
      context.includes('villain') ||
      context.includes('attacker') ||
      context.includes('threat')
    ) {
      return 'villain';
    }
    if (context.includes('victim') || context.includes('target')) {
      return 'victim';
    }

    return 'supporting';
  }

  private getActorContext(actor: string, text: string, windowSize = 100): string {
    const index = text.indexOf(actor);
    if (index === -1) return '';

    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + actor.length + windowSize);

    return text.substring(start, end);
  }

  private async calculateNarrativeSentiment(text: string): Promise<number> {
    // Simple sentiment calculation (in production, use sentiment analyzer)
    const positiveWords = ['good', 'great', 'excellent', 'success', 'victory', 'positive'];
    const negativeWords = ['bad', 'terrible', 'failure', 'defeat', 'negative', 'threat'];

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      score += (lowerText.match(new RegExp(word, 'g')) || []).length;
    }
    for (const word of negativeWords) {
      score -= (lowerText.match(new RegExp(word, 'g')) || []).length;
    }

    return Math.max(-1, Math.min(1, score / 10));
  }

  private generateNarrativeId(text: string): string {
    // Simple hash function for narrative ID
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `narrative_${Math.abs(hash).toString(36)}`;
  }

  private generateTitle(themes: string[]): string {
    if (themes.length === 0) return 'Untitled Narrative';
    return themes
      .slice(0, 3)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1))
      .join(' & ');
  }

  private generateDescription(text: string): string {
    // Return first 200 characters as description
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  clearCache(): void {
    this.narrativeCache.clear();
  }
}
