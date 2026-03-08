import { Document, Chunk } from '../data-model/types.js';

export class ChunkingService {

  chunkDocument(doc: Document, chunkSize: number = 1000, overlap: number = 200): Chunk[] {
    const text = doc.text;
    const chunks: Chunk[] = [];

    // Semantic splitting strategy:
    // 1. Split by paragraphs (double newline)
    // 2. Split by newlines
    // 3. Fallback to character slicing

    // Split by paragraphs first to respect semantic boundaries
    const paragraphs = text.split(/(\n\n+)/).filter(p => p.length > 0);

    let currentChunkText = '';
    let chunkStartOffset = 0; // The offset in the original text where the current chunk starts
    let currentWalkOffset = 0; // The current position in the original text we are processing

    // Buffer to hold text for overlap
    // For simple paragraph overlap, we can look back.
    // If the previous chunk ended, we might want to start the next chunk
    // including the last N characters of the previous chunk.

    // Actually, 'overlap' usually means:
    // Chunk N: [0, 1000]
    // Chunk N+1: [800, 1800] (Start is 1000 - 200)

    // With semantic boundaries, this is harder because we don't want to start in the middle of a sentence if possible.
    // Improved strategy:
    // Accumulate paragraphs until > chunkSize.
    // When pushing a chunk, we set the start of the *next* accumulation to be back-shifted by 'overlap'.
    // BUT we must align that back-shift to a paragraph boundary if possible, or just string slicing.

    // Let's implement a simpler accumulator that keeps a "window" of paragraphs.
    // This is complex. Let's stick to the previous robust logic but add overlap prepending.

    // To implement overlap: when we flush `currentChunkText`, we shouldn't just empty it.
    // We should keep the suffix of it as the prefix for the next chunk.

    for (const part of paragraphs) {
      const partLen = part.length;

      // If adding this part would exceed chunk size
      if (currentChunkText.length + partLen > chunkSize) {
          // If current chunk is not empty, push it
          if (currentChunkText.length > 0) {
              chunks.push({
                  id: `${doc.id}-chunk-${chunks.length}`,
                  tenantId: doc.tenantId,
                  documentId: doc.id,
                  text: currentChunkText,
                  offset: chunkStartOffset,
                  metadata: { ...doc.metadata, chunkIndex: chunks.length }
              });

              // Prepare for next chunk WITH OVERLAP
              // We want to keep the last 'overlap' characters of currentChunkText
              if (overlap > 0 && currentChunkText.length > overlap) {
                   const overlapText = currentChunkText.slice(-overlap);
                   // Reset current chunk to just the overlap text
                   // NOTE: The start offset for the *next* chunk is confusing here.
                   // The next chunk starts effectively at (chunkStartOffset + currentChunkText.length - overlap)
                   // But physically we are constructing it from overlap + next part.

                   // New Start Offset
                   chunkStartOffset = (chunkStartOffset + currentChunkText.length) - overlap;
                   currentChunkText = overlapText;
              } else {
                   // Overlap covers whole chunk or no overlap requested
                   // Ideally we don't duplicate the whole chunk, but if overlap > text, we essentially do.
                   // Let's just reset if it's too small to meaningfully overlap?
                   // Or just keep it all.
                   if (overlap > 0) {
                       // Handle overlap edge case
                       // If overlap is huge, just keep it.
                       // But effectively we just advanced by (length - overlap)
                       chunkStartOffset = chunkStartOffset + (currentChunkText.length - overlap);
                       // Wait, if overlap > length, we advance by negative? That implies infinite loop.
                       // Guard:
                       const advance = Math.max(1, currentChunkText.length - overlap);
                       chunkStartOffset = (chunkStartOffset + currentChunkText.length) - (currentChunkText.length - advance);
                       // Simplify: chunkStartOffset += advance
                       // But we need to verify exact char mapping.
                       // Let's rely on `currentWalkOffset` which tracks the *end* of what we processed from source.
                       // This is getting messy mixing "re-used text" and "new source text".

                       // Simpler approach:
                       // When flushing, just take the overlap suffix.
                       currentChunkText = currentChunkText.slice(-overlap);
                       chunkStartOffset = currentWalkOffset - currentChunkText.length;
                   } else {
                       currentChunkText = '';
                       chunkStartOffset = currentWalkOffset;
                   }
              }
          }

          // If the part itself is huge (larger than chunk size), split it using sliding window
          if (partLen > chunkSize) {
              // If we have overlap text in buffer, prepend it?
              // Mixing huge split + overlap buffer is tricky.
              // Let's flush buffer first as its own small chunk if meaningful, or just discard/prepend.

              // Simplification: Treat huge part standalone.
              let subOffset = 0;
              while (subOffset < partLen) {
                  const end = Math.min(subOffset + chunkSize, partLen);
                  const subText = part.substring(subOffset, end);

                  chunks.push({
                      id: `${doc.id}-chunk-${chunks.length}`,
                      tenantId: doc.tenantId,
                      documentId: doc.id,
                      text: subText,
                      offset: currentWalkOffset + subOffset,
                      metadata: { ...doc.metadata, chunkIndex: chunks.length }
                  });

                  subOffset += (chunkSize - overlap);
              }
              // After processing the huge part, move cursor
              currentWalkOffset += partLen;
              chunkStartOffset = currentWalkOffset;
              currentChunkText = '';
              continue; // Next part
          }
      }

      // Add part to current chunk
      if (currentChunkText.length === 0) {
          chunkStartOffset = currentWalkOffset;
      }
      currentChunkText += part;
      currentWalkOffset += partLen;
    }

    // Add remaining text
    if (currentChunkText.length > 0) {
        chunks.push({
            id: `${doc.id}-chunk-${chunks.length}`,
            tenantId: doc.tenantId,
            documentId: doc.id,
            text: currentChunkText,
            offset: chunkStartOffset,
            metadata: { ...doc.metadata, chunkIndex: chunks.length }
        });
    }

    // Fallback if semantic splitting failed to produce chunks
    if (chunks.length === 0 && text.length > 0) {
         return this.slidingWindowChunk(doc, chunkSize, overlap);
    }

    return chunks;
  }

  private slidingWindowChunk(doc: Document, chunkSize: number, overlap: number): Chunk[] {
    const text = doc.text;
    const chunks: Chunk[] = [];
    let offset = 0;

    while (offset < text.length) {
      const end = Math.min(offset + chunkSize, text.length);
      const chunkText = text.substring(offset, end);

      chunks.push({
        id: `${doc.id}-chunk-${chunks.length}`,
        tenantId: doc.tenantId,
        documentId: doc.id,
        text: chunkText,
        offset: offset,
        metadata: { ...doc.metadata, chunkIndex: chunks.length }
      });

      offset += (chunkSize - overlap);
      if (offset >= text.length) break;
    }
    return chunks;
  }
}
