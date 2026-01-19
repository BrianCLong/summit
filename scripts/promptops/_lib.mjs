import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export function stableStringify(obj) {
  const seen = new WeakSet();
  const normalize = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) throw new Error("stableStringify: circular reference");
    seen.add(v);

    if (Array.isArray(v)) return v.map(normalize);

    const out = {};
    for (const k of Object.keys(v).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
      out[k] = normalize(v[k]);
    }
    return out;
  };
  return JSON.stringify(normalize(obj));
}

export function readUtf8(p) {
  return fs.readFileSync(p, "utf8");
}

export function normalizeNewlines(s) {
  // Normalize CRLF/CR to LF.
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeUtf8Deterministic(filePath, contents) {
  // Ensure parent exists, newline normalized, and final newline.
  mkdirp(path.dirname(filePath));
  const normalized = normalizeNewlines(contents);
  const final = normalized.endsWith("\n") ? normalized : normalized + "\n";
  fs.writeFileSync(filePath, final, "utf8");
}
