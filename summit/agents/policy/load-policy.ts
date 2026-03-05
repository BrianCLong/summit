import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "js-yaml";
import Ajv from "ajv";

import type { SkillInvocation } from "../skills/types.js";

export interface PolicyRule {
  id: string;
  allow: boolean;
  when: {
    agent_names?: string[];
    roles?: SkillInvocation["agent_role"][];
    skills?: string[];
    envs?: SkillInvocation["env"][];
    repo_paths_glob?: string[];
    dataset_ids?: string[];
    connector_ids?: string[];
  };
}

export interface SkillPolicy {
  version: 1;
  default: "deny";
  rules: PolicyRule[];
}

const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "policy.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile<SkillPolicy>(schema);

export function loadPolicyFromFile(filePath: string): SkillPolicy {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.load(raw);

  if (!validate(parsed)) {
    const details = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "/"} ${e.message}`)
      .join("; ");
    throw new Error(`Invalid policy file: ${details}`);
  }

  return normalizePolicy(parsed);
}

export function normalizePolicy(policy: SkillPolicy): SkillPolicy {
  return {
    version: 1,
    default: "deny",
    rules: policy.rules.map((rule) => ({
      id: rule.id,
      allow: Boolean(rule.allow),
      when: {
        agent_names: rule.when.agent_names ? [...rule.when.agent_names] : undefined,
        roles: rule.when.roles ? [...rule.when.roles] : undefined,
        skills: rule.when.skills ? [...rule.when.skills] : undefined,
        envs: rule.when.envs ? [...rule.when.envs] : undefined,
        repo_paths_glob: rule.when.repo_paths_glob ? [...rule.when.repo_paths_glob] : undefined,
        dataset_ids: rule.when.dataset_ids ? [...rule.when.dataset_ids] : undefined,
        connector_ids: rule.when.connector_ids ? [...rule.when.connector_ids] : undefined,
      },
    })),
  };
}
