import fs from "node:fs";
import path from "node:path";

import { sha256, stableStringify } from "../../../packages/dpec/src/hash";

export interface SkillRegistrySnapshot {
  snapshot_version: 1;
  skills: Array<{
    id: string;
    version?: string;
    path?: string;
    schema?: Record<string, unknown>;
  }>;
}

export function buildSkillRegistrySnapshot(registry: unknown): SkillRegistrySnapshot {
  if (registry && typeof registry === "object") {
    const candidate = registry as Record<string, unknown>;
    if (candidate.snapshot_version === 1 && Array.isArray(candidate.skills)) {
      return {
        snapshot_version: 1,
        skills: (candidate.skills as Array<Record<string, unknown>>)
          .map((skill) => ({
            id: String(skill.id ?? ""),
            version: typeof skill.version === "string" ? skill.version : undefined,
            path: typeof skill.path === "string" ? skill.path : undefined,
            schema:
              skill.schema && typeof skill.schema === "object"
                ? (skill.schema as Record<string, unknown>)
                : undefined,
          }))
          .filter((skill) => skill.id.length > 0)
          .sort((a, b) => a.id.localeCompare(b.id)),
      };
    }
  }

  const entries = Array.isArray(registry)
    ? registry
    : Object.entries((registry ?? {}) as Record<string, unknown>).map(([id, value]) => ({
        id,
        ...(typeof value === "object" && value ? (value as Record<string, unknown>) : {}),
      }));

  const skills = entries
    .map((entry) => {
      const skill = entry as Record<string, unknown>;
      return {
        id: String(skill.id ?? ""),
        version: typeof skill.version === "string" ? skill.version : undefined,
        path: typeof skill.path === "string" ? skill.path : undefined,
        schema:
          skill.schema && typeof skill.schema === "object"
            ? (skill.schema as Record<string, unknown>)
            : undefined,
      };
    })
    .filter((skill) => skill.id.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    snapshot_version: 1,
    skills,
  };
}

export function snapshotSha256(snapshot: SkillRegistrySnapshot): string {
  return sha256(stableStringify(snapshot));
}

export function writeSkillRegistrySnapshot(
  registry: unknown,
  outFile = path.resolve(process.cwd(), "summit/agents/skills/registry.snapshot.json")
): SkillRegistrySnapshot {
  const snapshot = buildSkillRegistrySnapshot(registry);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${stableStringify(snapshot)}\n`, "utf8");
  return snapshot;
}
