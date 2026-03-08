"use strict";
/**
 * Coreference resolution
 * Links pronouns and mentions to their antecedents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreferenceResolver = void 0;
class CoreferenceResolver {
    /**
     * Resolve coreferences in text
     */
    resolve(entities, text) {
        const chains = [];
        // Group entities that refer to the same real-world entity
        const pronouns = this.findPronouns(text);
        for (const pronoun of pronouns) {
            const antecedent = this.findAntecedent(pronoun, entities, text);
            if (antecedent) {
                // Find or create chain
                let chain = chains.find((c) => c.entities.some((e) => e.text === antecedent.text));
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
    findPronouns(text) {
        const pronouns = [];
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
    findAntecedent(pronoun, entities, text) {
        // Find entities before the pronoun
        const candidates = entities.filter((e) => e.start < pronoun.start);
        if (candidates.length === 0) {
            return null;
        }
        // Sort by distance (closest first)
        candidates.sort((a, b) => pronoun.start - b.start - (pronoun.start - a.start));
        // Filter by gender/number agreement
        const filtered = this.filterByAgreement(pronoun.text, candidates);
        return filtered[0] || null;
    }
    /**
     * Filter candidates by pronoun agreement
     */
    filterByAgreement(pronoun, candidates) {
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
    mergeChains(chains) {
        const merged = [];
        for (const chain of chains) {
            const existing = merged.find((m) => this.chainsOverlap(m, chain));
            if (existing) {
                existing.entities.push(...chain.entities);
                existing.confidence = (existing.confidence + chain.confidence) / 2;
            }
            else {
                merged.push(chain);
            }
        }
        return merged;
    }
    /**
     * Check if chains refer to same entity
     */
    chainsOverlap(chain1, chain2) {
        return chain1.entities.some((e1) => chain2.entities.some((e2) => e1.text === e2.text));
    }
}
exports.CoreferenceResolver = CoreferenceResolver;
