import fs from "node:fs";
import path from "node:path";

export function writeJsonDeterministic(outPath: string, obj: unknown) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(obj, null, 2) + "\n");
}
