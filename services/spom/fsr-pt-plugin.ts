/**
 * FSR-PT plug-in that attaches SPOM ontology tags to registry schemas.
 */

export interface SchemaField {
  name: string;
  description?: string;
  sampleValues?: string[];
}

export interface SpomMapping {
  field: string;
  tag: {
    label: string;
    category: string;
    sensitivity: string;
    jurisdictions: string[];
  };
  confidence: number;
  explanations: string[];
}

export interface AnnotatedField extends SchemaField {
  ontologyTag: SpomMapping["tag"] | null;
  confidence: number;
  explanations: string[];
}

export function annotateSchema(
  schema: SchemaField[],
  mappings: SpomMapping[],
  threshold = 0.6,
): AnnotatedField[] {
  const index = new Map<string, SpomMapping>();
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
