// @ts-nocheck
import fs from "fs-extra";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { loadAdapterModule, resolveEntry } from "./adapter-loader.js";
import { AdapterContext, AdapterEvent, AdapterResponse, RunOptions } from "./types.js";
import { basicContext, basicEvent } from "./testing/fixtures/index.js";

async function loadJsonFile<T>(filePath?: string): Promise<T | undefined> {
  if (!filePath) {
    return undefined;
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!(await fs.pathExists(absolutePath))) {
    throw new Error(`Fixture file not found at ${absolutePath}`);
  }

  return fs.readJSON(absolutePath) as Promise<T>;
}

export async function executeAdapter(options: RunOptions): Promise<AdapterResponse> {
  const entryPath = await resolveEntry(options.entry);
  const adapter = await loadAdapterModule(entryPath);
  const event: AdapterEvent = (await loadJsonFile<AdapterEvent>(options.eventPath)) ?? basicEvent;
  const context: AdapterContext =
    (await loadJsonFile<AdapterContext>(options.contextPath)) ?? basicContext;

  const started = performance.now();
  const result = await adapter.handleEvent(event, context);
  const elapsed = Math.round(performance.now() - started);

  return {
    ...result,
    durationMs: result.durationMs ?? elapsed,
  };
}
