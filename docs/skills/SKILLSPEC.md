# Summit Skillpack Standard

**Status:** Draft (PR-1)
**Owner:** Governance / Maestro Team

## Overview

A **Summit Skill** is a governed, portable unit of **procedural knowledge**. Unlike a "tool" (which is an atomic function call), a Skill is a **workflow with guardrails**—a sequence of actions, checks, and decisions that encapsulates "how we do things" for a specific task.

Skillpacks are the distribution mechanism for these skills, designed to be:

1. **Discoverable:** Via intent classification and "triggers".
2. **Governed:** Every execution emits an **Evidence Bundle** proving what was done.
3. **Safe:** Bounded by permissions, token budgets, and risk policies.
4. **Verifiable:** Includes "pre-flight" checks and "post-flight" verification steps.

## The "Moat": Governance & Provenance

Summit Skills distinguish themselves from standard agent tools via **Evidence Layers**:

* **Layer A (Provenance):** Every skill execution is signed and logged to the `ProvenanceLedger`.
* **Layer B (Contracts):** Skills define a typed `SkillSpec` that is validated at compile-time.
* **Layer C (Routing):** Skills are selected deterministically based on `triggers` and policy, not just LLM whim.

## SkillSpec Schema (`skill.yaml`)

Every skill must define a `skill.yaml` (or embedded Frontmatter) conforming to the `v2` schema.

```yaml
schema_version: "v2"
metadata:
  name: "repo-foundry-scaffold"
  version: "1.0.0"
  description: "Scaffolds a new package with Summit standard directory structure."
  author: "Platform Engineering"
  license: "MIT"

triggers:
  intents: ["create new package", "scaffold module"]
  keywords: ["mkdir", "new package"]
  file_patterns: ["packages/*/package.json"]

inputs:
  properties:
    package_name:
      type: string
      description: "Name of the package (e.g., 'osint-collector')"
    scope:
      type: string
      default: "@summit"

required_env: ["GITHUB_TOKEN"]

steps:
  - id: check_exists
    type: verify
    name: "Check if package already exists"
    check: "! -d packages/${input.package_name}"
    on_fail: "abort"

  - id: create_dir
    type: exec
    command: "mkdir -p packages/${input.package_name}/src"

  - id: init_package
    type: exec
    command: "pnpm init"
    cwd: "packages/${input.package_name}"

  - id: apply_template
    type: edit
    file: "packages/${input.package_name}/package.json"
    merge_diff: |
      <<<<<<< SEARCH
      "name": "${input.package_name}",
      =======
      "name": "${input.scope}/${input.package_name}",
      "private": true,
      >>>>>>> REPLACE

  - id: verify_structure
    type: verify
    name: "Confirm structure"
    check: "test -f packages/${input.package_name}/package.json"

outputs:
  properties:
    path:
      type: string
      description: "Path to the created package"

governance:
  risk_level: "low" # low, medium, high, critical
  evidence_requirements:
    - "command_logs"
    - "file_diffs"
```

## Step Types

The `steps` array is the core of a Skill. It defines a deterministic or bounded-agency workflow.

### 1. `exec`

Executes a shell command.

* **Properties:** `command` (string), `cwd` (optional), `env` (optional).
* **Safety:** Subject to sandbox restrictions (no network unless permitted, blocked dangerous commands).

### 2. `edit`

Modifies a file.

* **Properties:** `file` (path), `merge_diff` (Git merge conflict format) OR `content` (full overwrite).
* **Safety:** Must operate on non-ignored files, subject to `file_patterns` allowlist.

### 3. `verify`

Runs a check that *must* pass for the skill to continue or succeed.

* **Properties:** `check` (shell command returning 0 for success), `name` (description).
* **Failure:** Can trigger `on_fail: abort` (default) or `on_fail: warn`.

### 4. `cite`

Injects documentation or context into the agent's working memory.

* **Properties:** `source` (file path or URL), `excerpt` (optional range).
* **Use Case:** "Read the style guide before writing code."

### 5. `ask_user`

Requests explicit user input or confirmation.

* **Properties:** `prompt` (string), `schema` (JSON schema for answer).
* **Governance:** Required for `high` risk skills.

## Evidence Bundle Artifacts

When a skill completes, the runner produces an **Evidence Bundle**:

1. **Manifest:** Copy of the resolved `SkillSpec`.
2. **Trace:** Log of all steps executed (commands, outputs, exit codes).
3. **Diffs:** Unified diff of all file changes.
4. **Verification Results:** Pass/Fail status of all `verify` steps.

This bundle is attached to PRs as a `evidence.json` or `check-run` artifact.
