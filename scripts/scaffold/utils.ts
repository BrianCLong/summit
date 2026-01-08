import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readFile(filepath: string): Promise<string> {
  try {
    return await fs.readFile(filepath, "utf-8");
  } catch (error) {
    console.error(`Error reading file ${filepath}:`, error);
    throw error;
  }
}

export async function writeFile(filepath: string, content: string): Promise<void> {
  try {
    // Check if file exists
    try {
      await fs.access(filepath);
      console.error(`❌ File already exists: ${filepath}`);
      console.error("   Aborting to prevent overwrite.");
      throw new Error(`File already exists: ${filepath}`);
    } catch (error: any) {
      if (error.code !== "ENOENT" && !error.message.includes("File already exists")) {
        throw error;
      }
    }

    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, content, "utf-8");
    console.log(`Created: ${filepath}`);
  } catch (error) {
    console.error(`Error writing file ${filepath}:`, error);
    throw error;
  }
}

export function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

export const TEMPLATES_DIR = path.join(__dirname, "templates");
export const PROJECT_ROOT = path.resolve(__dirname, "../../");
