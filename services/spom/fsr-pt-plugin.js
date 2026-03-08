"use strict";
/**
 * FSR-PT plug-in that attaches SPOM ontology tags to registry schemas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotateSchema = annotateSchema;
function annotateSchema(schema, mappings, threshold = 0.6) {
    const index = new Map();
    for (const mapping of mappings) {
        index.set(mapping.field, mapping);
    }
    return schema.map((field) => {
        const mapping = index.get(field.name);
        if (!mapping || mapping.confidence < threshold) {
            return {
                ...field,
                ontologyTag: null,
                confidence: mapping?.confidence ?? 0,
                explanations: mapping?.explanations ?? [],
            };
        }
        return {
            ...field,
            ontologyTag: mapping.tag,
            confidence: mapping.confidence,
            explanations: mapping.explanations,
        };
    });
}
