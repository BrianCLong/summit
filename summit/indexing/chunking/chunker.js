"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineChunker = void 0;
const crypto_1 = require("crypto");
class LineChunker {
    maxLines;
    constructor(maxLines = 200) {
        this.maxLines = maxLines;
    }
    chunk(filePath, content) {
        const lines = content.split("\n");
        const out = [];
        for (let i = 0; i < lines.length; i += this.maxLines) {
            const start = i + 1;
            const end = Math.min(lines.length, i + this.maxLines);
            const chunkContent = lines.slice(i, end).join("\n");
            const hash = (0, crypto_1.createHash)("sha256").update(chunkContent).digest("hex");
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
exports.LineChunker = LineChunker;
