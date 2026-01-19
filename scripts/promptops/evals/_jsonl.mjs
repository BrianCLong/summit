import fs from "node:fs";
import { normalizeNewlines } from "../_lib.mjs";

export function readJsonl(filePath) {
  const raw = normalizeNewlines(fs.readFileSync(filePath, "utf8"));
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      out.push(JSON.parse(line));
    } catch (e) {
      throw new Error(`JSONL parse error in ${filePath} at line ${i + 1}: ${e.message}`);
    }
  }
  return out;
}
