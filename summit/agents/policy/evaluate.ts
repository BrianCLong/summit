import { minimatch } from "minimatch";

import type { PolicyRule, SkillPolicy } from "./load-policy.js";
import type { PolicyDecision, SkillInvocation } from "../skills/types.js";

function intersects(needles: string[] | undefined, haystack: string[]): boolean {
  if (!needles || needles.length === 0) {
    return true;
  }
  return needles.some((v) => haystack.includes(v));
}

function globMatch(patterns: string[] | undefined, values: string[] | undefined): boolean {
  if (!patterns || patterns.length === 0) {
    return true;
  }
  if (!values || values.length === 0) {
    return false;
  }
  return values.every((value) => patterns.some((pattern) => minimatch(value, pattern)));
}

function matchesRule(invocation: SkillInvocation, rule: PolicyRule): boolean {
  const { when } = rule;
  return (
    intersects(when.agent_names, [invocation.agent_name]) &&
    intersects(when.roles, [invocation.agent_role]) &&
    intersects(when.skills, [invocation.skill]) &&
    intersects(when.envs, [invocation.env]) &&
    globMatch(when.repo_paths_glob, invocation.scope.repo_paths) &&
    intersects(when.dataset_ids, invocation.scope.dataset_ids ?? []) &&
    intersects(when.connector_ids, invocation.scope.connector_ids ?? [])
  );
}

export function evaluate(invocation: SkillInvocation, policy: SkillPolicy): PolicyDecision {
  const matched = policy.rules.filter((rule) => matchesRule(invocation, rule));
  const matchedRuleIds = matched.map((rule) => rule.id);
  const denyMatches = matched.filter((rule) => !rule.allow);

  if (denyMatches.length > 0) {
    return {
      decision: "deny",
      reason: `Denied by explicit rule(s): ${denyMatches.map((r) => r.id).join(", ")}`,
      matched_rules: matchedRuleIds,
    };
  }

  const allowMatches = matched.filter((rule) => rule.allow);
  if (allowMatches.length > 0) {
    return {
      decision: "allow",
      reason: `Allowed by rule(s): ${allowMatches.map((r) => r.id).join(", ")}`,
      matched_rules: matchedRuleIds,
    };
  }

  return {
    decision: "deny",
    reason: "Denied by default policy: no matching allow rule.",
    matched_rules: matchedRuleIds,
  };
}
