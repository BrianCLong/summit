import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BundleValidationError } from "./types.js";

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new BundleValidationError(
      `Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

export async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const file = await fs.readFile(filePath);
  hash.update(file);
  return hash.digest("hex");
}

export async function hashDirectory(root: string): Promise<string> {
  const hash = createHash("sha256");

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relative = path.relative(root, fullPath);
        hash.update(relative);
        const content = await fs.readFile(fullPath);
        hash.update(content);
      }
    }
  }

  await walk(root);
  return hash.digest("hex");
}
