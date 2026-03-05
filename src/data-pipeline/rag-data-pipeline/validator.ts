import { Chunk, Metadata } from './pipeline';

export class RAGValidator {
  validate(chunks: Chunk[], metadata: Metadata[]): boolean {
    if (!chunks.length || !metadata.length) return false;

    // Check for PII or malicious patterns
    const maliciousPattern = /<script>|drop table/i;
    for (const chunk of chunks) {
      if (maliciousPattern.test(chunk.text)) {
        return false;
      }
    }

    return true;
  }
}
