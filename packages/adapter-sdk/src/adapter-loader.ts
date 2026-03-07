// @ts-nocheck
import fs from "fs-extra";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AdapterRuntime } from "./types.js";

const SUPPORTED_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

export async function resolveEntry(entry: string): Promise<string> {
  const candidate = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry);
  const normalized = path.normalize(candidate);

  if (!(await fs.pathExists(normalized))) {
    throw new Error(`Adapter entry not found at ${normalized}`);
  }

  const extension = path.extname(normalized);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(
      `Unsupported adapter entry extension ${extension}. Build TypeScript before running the CLI.`
    );
  }

  return normalized;
}

export async function loadAdapterModule(entry: string): Promise<AdapterRuntime> {
  const resolvedEntry = await resolveEntry(entry);
  const moduleUrl = pathToFileURL(resolvedEntry).href;
  const imported = (await import(moduleUrl)) as Partial<AdapterRuntime> & Record<string, unknown>;

  const candidate = (imported.default ?? imported.adapter ?? imported) as
    | Partial<AdapterRuntime>
    | undefined;

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Adapter module did not export a runtime object.");
  }

  if (typeof candidate.handleEvent !== "function") {
    throw new Error("Adapter module is missing a handleEvent implementation.");
  }

  if (!candidate.metadata) {
    throw new Error("Adapter module is missing required metadata.");
  }

  return candidate as AdapterRuntime;
}
