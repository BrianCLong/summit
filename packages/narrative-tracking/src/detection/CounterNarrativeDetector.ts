/**
 * Counter-narrative detection
 * Identifies narratives that contradict or challenge other narratives
 */

import type { Narrative, CounterNarrative } from '../extraction/types.js';

export class CounterNarrativeDetector {
  private counterNarratives: Map<string, CounterNarrative[]> = new Map();

  async detectCounterNarratives(
    narrative: Narrative,
    candidates: Narrative[]
  ): Promise<CounterNarrative[]> {
    const counterNarratives: CounterNarrative[] = [];

    for (const candidate of candidates) {
      if (candidate.id === narrative.id) continue;

      const relationship = await this.analyzeRelationship(narrative, candidate);

      if (relationship) {
        counterNarratives.push(relationship);
      }
    }

    // Store detected counter-narratives
    if (counterNarratives.length > 0) {
      this.counterNarratives.set(narrative.id, counterNarratives);
    }

    return counterNarratives;
  }

  getCounterNarratives(narrativeId: string): CounterNarrative[] {
    return this.counterNarratives.get(narrativeId) || [];
  }

  private async analyzeRelationship(
    narrative1: Narrative,
    narrative2: Narrative
  ): Promise<CounterNarrative | null> {
    // Check for opposing sentiment
    const sentimentOpposition = this.checkSentimentOpposition(
      narrative1.sentiment,
      narrative2.sentiment
    );

    // Check for contradicting themes
    const themeContradiction = this.checkThemeContradiction(
      narrative1.themes,
      narrative2.themes
    );

    // Check for opposing framing
    const framingOpposition = this.checkFramingOpposition(
      narrative1.framing.tone,
      narrative2.framing.tone
    );

    // Calculate overall strength
    const strength = (sentimentOpposition + themeContradiction + framingOpposition) / 3;

    if (strength > 0.3) {
      // Determine relationship type
      let relationshipType: CounterNarrative['relationshipType'] = 'alternative';

      if (strength > 0.7) {
        relationshipType = 'refutation';
      } else if (this.hasDebunkingLanguage(narrative2.description)) {
        relationshipType = 'debunk';
      } else if (this.hasContextualLanguage(narrative2.description)) {
        relationshipType = 'context';
      }

      return {
        originalNarrativeId: narrative1.id,
        counterNarrativeId: narrative2.id,
        relationshipType,
        strength,
        evidence: this.extractEvidence(narrative1, narrative2),
      };
    }

    return null;
  }

  private checkSentimentOpposition(sentiment1: number, sentiment2: number): number {
    // Opposite sentiments indicate counter-narrative
    const diff = Math.abs(sentiment1 - sentiment2);
    const opposition = Math.abs(sentiment1 + sentiment2);

    // Strong opposition if sentiments are opposite in sign
    if ((sentiment1 > 0 && sentiment2 < 0) || (sentiment1 < 0 && sentiment2 > 0)) {
      return Math.min(diff, 1);
    }

    return 0;
  }

  private checkThemeContradiction(themes1: string[], themes2: string[]): number {
    const contradictoryPairs: Record<string, string[]> = {
      threat: ['security', 'safety'],
      conflict: ['cooperation', 'peace'],
      crisis: ['stability', 'normalcy'],
      corruption: ['integrity', 'transparency'],
    };

    let contradictions = 0;
    let totalComparisons = 0;

    for (const theme1 of themes1) {
      const contradictory = contradictoryPairs[theme1] || [];
      for (const theme2 of themes2) {
        totalComparisons++;
        if (contradictory.includes(theme2)) {
          contradictions++;
        }
      }
    }

    return totalComparisons > 0 ? contradictions / totalComparisons : 0;
  }

  private checkFramingOpposition(
    tone1: string,
    tone2: string
  ): number {
    const opposingTones: Record<string, string[]> = {
      positive: ['negative', 'alarmist'],
      negative: ['positive', 'celebratory'],
      alarmist: ['positive', 'celebratory'],
      celebratory: ['negative', 'alarmist'],
    };

    const opposing = opposingTones[tone1] || [];
    return opposing.includes(tone2) ? 1 : 0;
  }

  private hasDebunkingLanguage(text: string): boolean {
    const debunkingWords = [
      'false',
      'debunk',
      'myth',
      'misleading',
      'incorrect',
      'wrong',
      'fact-check',
    ];
    const lowerText = text.toLowerCase();
    return debunkingWords.some(word => lowerText.includes(word));
  }

  private hasContextualLanguage(text: string): boolean {
    const contextWords = [
      'context',
      'however',
      'actually',
      'in reality',
      'more accurately',
    ];
    const lowerText = text.toLowerCase();
    return contextWords.some(word => lowerText.includes(word));
  }

  private extractEvidence(narrative1: Narrative, narrative2: Narrative): string[] {
    const evidence: string[] = [];

    // Evidence from sentiment opposition
    if (
      (narrative1.sentiment > 0 && narrative2.sentiment < 0) ||
      (narrative1.sentiment < 0 && narrative2.sentiment > 0)
    ) {
      evidence.push('Opposing sentiment detected');
    }

    // Evidence from theme contradiction
    const themes1 = new Set(narrative1.themes);
    const themes2 = new Set(narrative2.themes);

    if (themes1.has('threat') && themes2.has('security')) {
      evidence.push('Contradictory themes: threat vs. security');
    }

    // Evidence from framing
    if (narrative1.framing.tone !== narrative2.framing.tone) {
      evidence.push(`Opposing tones: ${narrative1.framing.tone} vs. ${narrative2.framing.tone}`);
    }

    return evidence;
  }
}
