"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImplicitRelationshipExtractor = void 0;
class ImplicitRelationshipExtractor {
    /**
     * Extract relationships from context.
     * Now integrates with the structured output from the NER pipeline (which includes relationship extraction).
     * It also augments with heuristic-based implicit relationships from coreference chains.
     */
    extract(context, coref, structuredRelationships = []) {
        const relationships = [];
        // Add structured relationships from NER pipeline (Python/SpaCy)
        structuredRelationships.forEach(rel => {
            relationships.push({
                subject: rel.subject,
                object: rel.object,
                predicate: rel.predicate,
                confidence: rel.confidence || 0.8,
                provenance: rel.provenance || 'nlp_pipeline_dep_parse'
            });
        });
        // Fallback/Augment: Heuristic relationships from coreference
        const sentences = context.split(/[.!?]/).filter(Boolean);
        sentences.forEach((sentence, idx) => {
            const mentions = coref[`S${idx + 1}`] || [];
            if (mentions.length >= 2) {
                // Only add if not already covered by structured relationships (simplified check)
                const subj = mentions[0];
                const obj = mentions[mentions.length - 1];
                const exists = relationships.some(r => r.subject === subj && r.object === obj);
                if (!exists) {
                    relationships.push({
                        subject: subj,
                        object: obj,
                        predicate: 'related_to',
                        confidence: Math.min(0.5, sentence.length / 160), // Lower confidence for implicit
                        provenance: `heuristic_coref_sentence_${idx + 1}`,
                    });
                }
            }
        });
        return relationships;
    }
}
exports.ImplicitRelationshipExtractor = ImplicitRelationshipExtractor;
