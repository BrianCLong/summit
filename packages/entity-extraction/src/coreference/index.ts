/**
 * Coreference resolution
 * Links pronouns and mentions to their antecedents
 */

import type { Entity, CoreferenceChain } from '../types';

export class CoreferenceResolver {
  /**
   * Resolve coreferences in text
   */
  resolve(entities: Entity[], text: string): CoreferenceChain[] {
    const chains: CoreferenceChain[] = [];

    // Group entities that refer to the same real-world entity
    const pronouns = this.findPronouns(text);

    for (const pronoun of pronouns) {
      const antecedent = this.findAntecedent(pronoun, entities, text);

      if (antecedent) {
        // Find or create chain
        let chain = chains.find((c) =>
          c.entities.some((e) => e.text === antecedent.text)
        );

        if (!chain) {
          chain = {
            entities: [antecedent],
            representativeIndex: 0,
            confidence: 0.8,
          };
          chains.push(chain);
        }

        chain.entities.push({
          text: pronoun.text,
          type: antecedent.type,
          start: pronoun.start,
          end: pronoun.end,
          confidence: 0.7,
        });
      }
    }

    return chains;
  }

  /**
   * Find pronouns in text
   */
  private findPronouns(text: string): Array<{ text: string; start: number; end: number }> {
    const pronouns: Array<{ text: string; start: number; end: number }> = [];
    const pronounPattern = /\b(he|she|it|they|him|her|them|his|her|their|its)\b/gi;

    let match;
    while ((match = pronounPattern.exec(text)) !== null) {
      pronouns.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return pronouns;
  }

  /**
   * Find antecedent for a pronoun
   */
  private findAntecedent(
    pronoun: { text: string; start: number },
    entities: Entity[],
    text: string
  ): Entity | null {
    // Find entities before the pronoun
    const candidates = entities.filter((e) => e.start < pronoun.start);

    if (candidates.length === 0) return null;

    // Sort by distance (closest first)
    candidates.sort((a, b) => pronoun.start - b.start - (pronoun.start - a.start));

    // Filter by gender/number agreement
    const filtered = this.filterByAgreement(pronoun.text, candidates);

    return filtered[0] || null;
  }

  /**
   * Filter candidates by pronoun agreement
   */
  private filterByAgreement(pronoun: string, candidates: Entity[]): Entity[] {
    const lower = pronoun.toLowerCase();

    // Singular male pronouns
    if (['he', 'him', 'his'].includes(lower)) {
      return candidates.filter((e) => e.type === 'PERSON');
    }

    // Singular female pronouns
    if (['she', 'her'].includes(lower)) {
      return candidates.filter((e) => e.type === 'PERSON');
    }

    // Plural pronouns
    if (['they', 'them', 'their'].includes(lower)) {
      return candidates;
    }

    // Neutral pronoun
    if (lower === 'it') {
      return candidates.filter((e) => e.type !== 'PERSON');
    }

    return candidates;
  }

  /**
   * Merge coreference chains
   */
  mergeChains(chains: CoreferenceChain[]): CoreferenceChain[] {
    const merged: CoreferenceChain[] = [];

    for (const chain of chains) {
      const existing = merged.find((m) =>
        this.chainsOverlap(m, chain)
      );

      if (existing) {
        existing.entities.push(...chain.entities);
        existing.confidence = (existing.confidence + chain.confidence) / 2;
      } else {
        merged.push(chain);
      }
    }

    return merged;
  }

  /**
   * Check if chains refer to same entity
   */
  private chainsOverlap(chain1: CoreferenceChain, chain2: CoreferenceChain): boolean {
    return chain1.entities.some((e1) =>
      chain2.entities.some((e2) => e1.text === e2.text)
    );
  }
}
