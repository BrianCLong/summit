import type { EvidenceChunk } from '../types/index.js';
import type { HighlightResponse } from './types.js';

export interface PackedContext {
  chunks: EvidenceChunk[];
  keptTokenCount: number;
  compressionRate: number;
}

export function packContext(
  chunks: EvidenceChunk[],
  highlight: HighlightResponse | null,
  budget?: number,
): PackedContext {
  if (!budget || !highlight) {
    return {
      chunks,
      keptTokenCount: highlight?.kept_token_count ?? 0,
      compressionRate: highlight?.compression_rate ?? 1,
    };
  }

  const sentencesByDoc = highlight.selected_sentences.reduce(
    (acc, sentence) => {
      const list = acc.get(sentence.doc_id) ?? [];
      list.push(sentence);
      acc.set(sentence.doc_id, list);
      return acc;
    },
    new Map<string, HighlightResponse['selected_sentences']>(),
  );

  const scoredChunks = chunks.map((chunk) => {
    const citationDocIds = chunk.citations.map((citation) => citation.documentId);
    const docMatches = citationDocIds.flatMap(
      (docId) => sentencesByDoc.get(docId) ?? [],
    );
    const textMatches = highlight.selected_sentences.filter((sentence) =>
      chunk.content.includes(sentence.text),
    );
    const matching = [...docMatches, ...textMatches];
    const score = matching.reduce((sum, sentence) => sum + sentence.score, 0);
    const tokenEstimate = Math.max(chunk.content.split(/\s+/).length, 1);
    const utility = tokenEstimate > 0 ? score / tokenEstimate : score;
    return { chunk, score, tokenEstimate, utility };
  });

  const packed: EvidenceChunk[] = [];
  let remaining = budget;

  for (const item of scoredChunks.sort((a, b) => b.utility - a.utility)) {
    if (item.tokenEstimate <= remaining) {
      packed.push(item.chunk);
      remaining -= item.tokenEstimate;
    }
  }

  return {
    chunks: packed.length ? packed : chunks.slice(0, 1),
    keptTokenCount: highlight.kept_token_count,
    compressionRate: highlight.compression_rate,
  };
}
