import fs from "node:fs";
import path from "node:path";

export function writeArtifact(name: string, data: unknown) {
  fs.mkdirSync(".summit-out", { recursive: true });
  fs.writeFileSync(
    path.join(".summit-out", name),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

export function writeSummary(markdown: string) {
  fs.mkdirSync(".summit-out", { recursive: true });
  fs.writeFileSync(path.join(".summit-out", "summary.md"), markdown, "utf8");
}
