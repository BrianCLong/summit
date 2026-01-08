import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function hasPlaceholders(content: string): boolean {
  return /<<[^>]+>>/.test(content) || /TODO/i.test(content) || /CHANGEME/i.test(content);
}

describe("prompt integrity", () => {
  it("ensures prompt templates are present and free from placeholders", () => {
    const promptDir = join(__dirname, "..", "src", "prompt");
    const files = readdirSync(promptDir).filter((file) => file.endsWith(".ts"));
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(join(promptDir, file), "utf-8");
      if (content.trim().length === 0) {
        violations.push(`${file}: empty content`);
      }
      if (hasPlaceholders(content)) {
        violations.push(`${file}: contains placeholder tokens`);
      }
    }

    expect(violations).toEqual([]);
  });
});
