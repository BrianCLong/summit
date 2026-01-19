---
{
  "id": "prompt.daily_standup",
  "name": "Daily Standup Orchestrator",
  "version": "1.0.0",
  "owner": "release-captain",
  "status": "active",
  "intent": "Conduct a daily standup, produce actionable artifacts, and dispatch work to named agents with explicit deliverables.",
  "non_goals": [
    "Do not invent repository facts not present in provided context.",
    "Do not perform irreversible actions without an explicit user instruction to do so."
  ],
  "targets": {
    "models": ["gpt-5.2-thinking"],
    "min_context_tokens": 4096,
    "max_output_tokens": 2048
  },
  "inputs": {
    "required_fields": ["date", "participants", "context_summary"],
    "optional_fields": ["blockers", "recent_prs", "open_incidents"],
    "constraints": [
      "If inputs are incomplete, ask for missing fields but still produce a partial artifact set."
    ]
  },
  "outputs": {
    "format": "json",
    "schema": {
      "type": "object",
      "required": ["standup_notes", "decisions", "risks", "actions", "agent_dispatch"],
      "properties": {
        "standup_notes": { "type": "array", "items": { "type": "string" } },
        "decisions": { "type": "array", "items": { "type": "string" } },
        "risks": { "type": "array", "items": { "type": "string" } },
        "actions": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["owner", "task", "due"],
            "properties": {
              "owner": { "type": "string" },
              "task": { "type": "string" },
              "due": { "type": "string" }
            }
          }
        },
        "agent_dispatch": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["agent", "prompt_ref", "deliverables"],
            "properties": {
              "agent": { "type": "string" },
              "prompt_ref": { "type": "string" },
              "deliverables": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
  },
  "invariants": [
    { "id": "inv.output_json_only", "level": "must", "assertion": "Return a single JSON object and nothing else." },
    { "id": "inv.dispatch_explicit", "level": "must", "assertion": "Every dispatched agent task must list concrete deliverables." },
    { "id": "inv.no_fabrication", "level": "must", "assertion": "Do not fabricate repo state, PR numbers, or external facts." }
  ],
  "determinism": {
    "temperature": 0,
    "seed_policy": "none",
    "cache_policy": "content_addressed",
    "replay_policy": "replay_only_ci",
    "prompt_fingerprint": "sha256"
  },
  "tools": {
    "allowed": ["file_search", "web.run", "python", "github"],
    "forbidden": ["send_email", "purchase", "delete_data"],
    "tool_contract_version": "1.0.0"
  },
  "safety": {
    "redaction": ["secrets", "api_keys", "tokens", "private_keys"],
    "prohibited": ["credential exfiltration", "instructions to bypass security controls"],
    "data_handling": "Hash-only logging for sensitive fields; do not echo secrets."
  },
  "evals": {
    "gates": ["schema", "invariants"],
    "datasets": ["prompts/evals/datasets/daily_standup.jsonl"]
  },
  "composition": {
    "order": ["role", "policy", "tools", "task", "io", "style"],
    "fragments": [
      { "type": "role", "path": "prompts/fragments/role/base.md" },
      { "type": "policy", "path": "prompts/fragments/policy/governance.md" },
      { "type": "tools", "path": "prompts/fragments/tools/default.md" },
      { "type": "task", "path": "prompts/fragments/task/daily-standup.task.md" },
      { "type": "io", "path": "prompts/fragments/io/strict-json.io.md" },
      { "type": "style", "path": "prompts/fragments/style/strict-json.style.md" }
    ]
  }
}
---

This file is source-of-truth for metadata and task-specific details.
The compiler will assemble a compiled prompt from fragments plus this body.
