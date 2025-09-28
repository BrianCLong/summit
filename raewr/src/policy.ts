import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import type { ResidencyPolicy } from "./types.js";

export async function loadPolicy(path: string): Promise<ResidencyPolicy> {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw) as ResidencyPolicy;
}

export function hashPolicy(policy: ResidencyPolicy): string {
  const canonical = canonicalize(policy);
  return createHash("sha256").update(canonical).digest("hex");
}

export function canonicalize(value: unknown): string {
  return stringifyCanonical(value);
}

function stringifyCanonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stringifyCanonical(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `"${key}":${stringifyCanonical(val)}`);
    return `{${entries.join(",")}}`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function assertRegionAllowed(policy: ResidencyPolicy, region: string): void {
  if (!policy.allowedRegions.includes(region)) {
    throw new Error(
      `Region ${region} is not authorized by policy ${policy.policyId}. Allowed regions: ${policy.allowedRegions.join(", ")}`
    );
  }
}
