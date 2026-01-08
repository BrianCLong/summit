import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function toCanonicalPath(root: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const resolved = path.resolve(root, normalized);
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error("Path escapes bundle root");
  }
  const canonical = path.relative(normalizedRoot, resolved);
  return canonical.split(path.sep).join("/");
}

export async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk: any) => hash.update(chunk));
    stream.on("end", () => resolve());
  });
  return hash.digest("hex");
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
