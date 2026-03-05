export interface RawDocument {
  content: string;
  sourceUri: string;
  type: string;
  timestamp?: string;
}

export interface NormalizedDocument {
  text: string;
  source: string;
  timestamp: string;
  contentType: string;
}

export class DocumentNormalizer {
  normalize(doc: RawDocument): NormalizedDocument {
    return {
      text: doc.content.trim(),
      source: doc.sourceUri,
      timestamp: doc.timestamp || "1970-01-01T00:00:00Z",
      contentType: doc.type
    };
  }
}
