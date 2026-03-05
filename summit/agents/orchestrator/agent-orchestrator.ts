import crypto from "node:crypto";
import path from "node:path";

import type { SkillInvocation } from "../skills/types.js";
import type { SkillPolicy } from "../policy/load-policy.js";
import { loadPolicyFromFile } from "../policy/load-policy.js";
import { evaluate } from "../policy/evaluate.js";

export type SkillHandler = (invocation: SkillInvocation) => Promise<unknown>;

export interface AgentEvent {
  type: "SKILL_ALLOWED" | "SKILL_DENIED" | "SKILL_EXEC_STARTED" | "SKILL_EXEC_FINISHED";
  run_id: string;
  task_id: string;
  agent_name: string;
  skill: string;
  decision: "allow" | "deny";
  reason: string;
  inputs_hash: string;
  outputs_hash: string | null;
  matched_rules?: string[];
  ts: string;
}

export interface AgentOrchestratorOptions {
  policy?: SkillPolicy;
  policyPath?: string;
  eventSink?: (event: AgentEvent) => void;
  provenanceSink?: (event: AgentEvent) => void;
}

export class AgentOrchestrator {
  private readonly policy: SkillPolicy;
  private readonly handlers = new Map<string, SkillHandler>();
  private readonly eventSink?: (event: AgentEvent) => void;
  private readonly provenanceSink?: (event: AgentEvent) => void;

  constructor(options: AgentOrchestratorOptions = {}) {
    this.policy =
      options.policy ??
      loadPolicyFromFile(
        options.policyPath ?? path.resolve(process.cwd(), "summit/agents/policy/policy.example.yml")
      );
    this.eventSink = options.eventSink;
    this.provenanceSink = options.provenanceSink;
  }

  registerSkill(name: string, handler: SkillHandler): void {
    this.handlers.set(name, handler);
  }

  async invokeSkill(invocation: SkillInvocation): Promise<unknown> {
    const decision = evaluate(invocation, this.policy);
    const inputsHash = stableHash(invocation.inputs);

    if (decision.decision === "deny") {
      this.emit({
        type: "SKILL_DENIED",
        run_id: invocation.run_id,
        task_id: invocation.task_id,
        agent_name: invocation.agent_name,
        skill: invocation.skill,
        decision: "deny",
        reason: decision.reason,
        inputs_hash: inputsHash,
        outputs_hash: null,
        matched_rules: decision.matched_rules,
        ts: new Date().toISOString(),
      });
      throw new Error(`Skill invocation denied: ${decision.reason}`);
    }

    const handler = this.handlers.get(invocation.skill);
    if (!handler) {
      const reason = `Skill handler is not registered: ${invocation.skill}`;
      this.emit({
        type: "SKILL_DENIED",
        run_id: invocation.run_id,
        task_id: invocation.task_id,
        agent_name: invocation.agent_name,
        skill: invocation.skill,
        decision: "deny",
        reason,
        inputs_hash: inputsHash,
        outputs_hash: null,
        matched_rules: decision.matched_rules,
        ts: new Date().toISOString(),
      });
      throw new Error(reason);
    }

    this.emit({
      type: "SKILL_ALLOWED",
      run_id: invocation.run_id,
      task_id: invocation.task_id,
      agent_name: invocation.agent_name,
      skill: invocation.skill,
      decision: "allow",
      reason: decision.reason,
      inputs_hash: inputsHash,
      outputs_hash: null,
      matched_rules: decision.matched_rules,
      ts: new Date().toISOString(),
    });

    this.emit({
      type: "SKILL_EXEC_STARTED",
      run_id: invocation.run_id,
      task_id: invocation.task_id,
      agent_name: invocation.agent_name,
      skill: invocation.skill,
      decision: "allow",
      reason: decision.reason,
      inputs_hash: inputsHash,
      outputs_hash: null,
      matched_rules: decision.matched_rules,
      ts: new Date().toISOString(),
    });

    const result = await handler(invocation);
    this.emit({
      type: "SKILL_EXEC_FINISHED",
      run_id: invocation.run_id,
      task_id: invocation.task_id,
      agent_name: invocation.agent_name,
      skill: invocation.skill,
      decision: "allow",
      reason: decision.reason,
      inputs_hash: inputsHash,
      outputs_hash: stableHash(result),
      matched_rules: decision.matched_rules,
      ts: new Date().toISOString(),
    });

    return result;
  }

  private emit(event: AgentEvent): void {
    this.eventSink?.(event);
    this.provenanceSink?.(event);
  }
}

function stableHash(input: unknown): string {
  const normalized = stableStringify(input);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}
