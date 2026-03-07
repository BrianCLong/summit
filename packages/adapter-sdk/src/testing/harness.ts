import { loadAdapterModule, resolveEntry } from "../adapter-loader.js";
import { AdapterContext, AdapterEvent, ContractTestResult } from "../types.js";
import { basicContext, basicEvent } from "./fixtures/index.js";

function validateResponseShape(response: unknown, issues: string[]): void {
  if (!response || typeof response !== "object") {
    issues.push("Adapter response must be an object.");
    return;
  }

  const typedResponse = response as { status?: unknown; message?: unknown };
  if (typedResponse.status !== "ok" && typedResponse.status !== "error") {
    issues.push('Adapter response must include a status of "ok" or "error".');
  }

  if (typeof typedResponse.message !== "string" || typedResponse.message.length === 0) {
    issues.push("Adapter response must include a non-empty message.");
  }
}

export async function runContractTests(
  entry: string,
  event: AdapterEvent = basicEvent,
  context: AdapterContext = basicContext
): Promise<ContractTestResult> {
  const entryPath = await resolveEntry(entry);
  const adapter = await loadAdapterModule(entryPath);
  const issues: string[] = [];

  if (!adapter.metadata?.name) {
    issues.push("Adapter metadata must include a name.");
  }

  if (!adapter.metadata?.version) {
    issues.push("Adapter metadata must include a version.");
  }

  let response: unknown;
  try {
    response = await adapter.handleEvent(event, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`handleEvent threw an error: ${message}`);
  }

  if (response) {
    validateResponseShape(response, issues);
  }

  return {
    passed: issues.length === 0,
    issues,
    response: response as ContractTestResult["response"],
  };
}
