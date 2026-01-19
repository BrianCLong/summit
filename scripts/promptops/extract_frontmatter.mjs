import { readUtf8, normalizeNewlines } from "./_lib.mjs";

export function extractFrontMatterJson(filePath) {
  const src = normalizeNewlines(readUtf8(filePath));

  if (!src.startsWith("---\n")) {
    throw new Error(`PAM: missing front matter delimiter at top: ${filePath}`);
  }

  const end = src.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error(`PAM: missing closing front matter delimiter: ${filePath}`);
  }

  const fmRaw = src.slice(4, end).trim();

  let meta;
  try {
    meta = JSON.parse(fmRaw);
  } catch (e) {
    throw new Error(
      `PAM: front matter must be JSON (JSON is valid YAML). Parse failed in ${filePath}: ${e.message}`
    );
  }

  const body = src.slice(end + "\n---\n".length);
  return { meta, body, fmRaw };
}
