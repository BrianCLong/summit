import fs from "node:fs";
import path from "node:path";

export function writeFile(outPath: string, data: string) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, data, "utf8");
}

export function writeSummary(markdown: string) {
  writeFile(path.join(".summit-out", "summary.md"), markdown);
}
