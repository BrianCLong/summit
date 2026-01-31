import { createHash } from "crypto";
import { ChunkRef } from "../interfaces.js";

export interface Chunker {
  chunk(filePath: string, content: string): ChunkRef[];
}

export class LineChunker implements Chunker {
  constructor(private readonly maxLines = 200) {}
  chunk(filePath: string, content: string): ChunkRef[] {
    const lines = content.split("\n");
    const out: ChunkRef[] = [];
    for (let i = 0; i < lines.length; i += this.maxLines) {
      const start = i + 1;
      const end = Math.min(lines.length, i + this.maxLines);
      const chunkContent = lines.slice(i, end).join("\n");
      const hash = createHash("sha256").update(chunkContent).digest("hex");
      out.push({
        doc_id: `${filePath}#${start}-${end}`,
        start_line: start,
        end_line: end,
        content_hash: hash,
        path_token: filePath
      });
    }
    return out;
  }
}
