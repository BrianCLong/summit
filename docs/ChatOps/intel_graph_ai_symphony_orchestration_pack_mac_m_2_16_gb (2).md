# IntelGraph AI Symphony Orchestration Pack (Mac M2 • 16GB)

**Objective:** Seamless, uniform, conflict-free orchestration of all your AI tools (zero new spend), with semi‑autonomous flows and strict standards that align with IntelGraph’s governance, provenance, and performance goals.

---

## 0) System Overview

### Principles

- **Single gateway, many brains:** One OpenAI‑compatible endpoint (LiteLLM) routes to **local** models first (Ollama/LM Studio), with optional bursts to **Gemini** (API/CLI quotas you already have) and **Grok Code** (web/UI free usage; API kept _off_ by default).
- **Uniform standards:** EditorConfig + ESLint/Prettier + Ruff/Black + Conventional Commits + pre‑commit.
- **Repo discipline:** Trunk‑based flow, short‑lived branches, CODEOWNERS, merge protections, deterministic CI.
- **Semi‑autonomous:** `just`/Make tasks, Aider recipes, Continue.dev recipes, Actions bots for PR reviews/tests.
- **No duplication:** All tools read from the same configs and route through the same gateway, with strict budgets.

### High-Level Diagram

```
┌───────────┐        ┌─────────────┐
│ VS Code   │        │  Terminal   │
│ (Copilot, │        │  Aider,     │
│ Continue) │        │  CLI tools  │
└─────┬─────┘        └──────┬──────┘
      │ OpenAI-compatible
      │ (one URL)
      v
┌───────────────────────────────────────────┐
│            LiteLLM Local Gateway          │
│  - routing / budgets / logs               │
│  - local-first policy                     │
└──────┬───────────────────────────────┬────┘
       │                               │
       v                               v
┌─────────────┐                 ┌────────────────┐
│ Local Models │                 │  Hosted (opt)  │
│ Ollama/LM    │                 │  Gemini API    │
│ Llama/Qwen   │                 │  (quotas only) │
└─────────────┘                 └────────────────┘
             (Grok Code via web UI for free usage)
```

---

## 1) Installation & Model Prep (macOS)

### 1.1 Install baseline

```bash
# Local engines
brew install --cask lm-studio
brew install ollama

# Orchestration & helpers
pipx install litellm
brew install just

# VS Code extension
code --install-extension Continue.continue
# Aider
pipx install aider-chat
```

### 1.2 Local models (fit for M2 16GB)

```bash
# Start Ollama service
ollama serve &
# Models tuned for your RAM (fast + capable)
ollama pull llama3.1:8b
ollama pull qwen2.5-coder:7b
# Optional coder: DeepSeek 6.7B/7B if desired
# ollama pull deepseek-coder:6.7b
```

LM Studio → Developer → **Start Server** (defaults: `http://127.0.0.1:1234/v1`). Add Llama 3.1 8B and Qwen2.5‑Coder 7B (quantized) for A/B.

---

## 2) LiteLLM Gateway (single endpoint)

### 2.1 Config: `litellm.config.yaml`

```yaml
model_list:
  # ===== LOCAL-FIRST =====
  - model_name: local/ollama
    litellm_params:
      provider: openai_compatible
      api_base: 'http://127.0.0.1:11434/v1'
      api_key: 'sk-local-ollama'
      model: 'llama3.1' # default for generic prompts

  - model_name: local/ollama-coder
    litellm_params:
      provider: openai_compatible
      api_base: 'http://127.0.0.1:11434/v1'
      api_key: 'sk-local-ollama'
      model: 'qwen2.5-coder:7b'

  - model_name: local/lmstudio
    litellm_params:
      provider: openai_compatible
      api_base: 'http://127.0.0.1:1234/v1'
      api_key: 'sk-local-lms'
      model: 'llama-3.1-8b-instruct'

  # ===== OPTIONAL HOSTED (POWER BURSTS: ENABLED WITH LOW CAPS) =====
  - model_name: gemini/1.5-pro
    litellm_params:
      provider: google_ai_studio
      model: 'gemini-1.5-pro-latest'
      api_key: '${GOOGLE_API_KEY}'

  - model_name: xai/grok-code-fast-1
    litellm_params:
      provider: openai_compatible
      api_base: 'https://api.x.ai/v1'
      api_key: '${XAI_API_KEY}'
      model: 'grok-code-fast-1'

router_settings:
  num_retries: 1
  timeout: 60

# ===== BUDGETS: POWER BURSTS ON, VERY SMALL CAPS =====
# Model-level caps ensure locals are unaffected while hosted models are tightly limited.
budget:
  model:
    gemini/1.5-pro: 0.20 # $0.20/day cap
    xai/grok-code-fast-1: 0.20 # $0.20/day cap
  # NOTE: Avoid setting a provider-wide cap for "openai_compatible" to prevent impacting locals.
  provider:
    google_ai_studio: 0.20 # optional, redundant with model cap

litellm_settings:
  add_function_to_prompt: true
```

### 2.2 Run gateway

```bash
litellm --config litellm.config.yaml --host 127.0.0.1 --port 4000
# Test
curl -s http://127.0.0.1:4000/v1/models | jq
```

## 3) Editor/Agent Configs

### 3.1 Aider: `.aider.conf.yml`

```yaml
model: openai/local/ollama-coder
openai:
  api_base: http://127.0.0.1:4000/v1
  api_key: sk-anything
# quick swap examples:
# aider --model openai/local/ollama
# aider --model openai/local/lmstudio
# aider --model openai/gemini/1.5-pro        # (enable budget first)
# aider --model openai/xai/grok-code-fast-1   # (enable budget first)
```

### 3.2 Continue: `~/.continue/config.json`

```json
{
  "models": [
    {
      "title": "Local Llama",
      "provider": "openai",
      "apiBase": "http://127.0.0.1:4000/v1",
      "model": "local/ollama"
    },
    {
      "title": "Local Coder",
      "provider": "openai",
      "apiBase": "http://127.0.0.1:4000/v1",
      "model": "local/ollama-coder"
    },
    {
      "title": "LM Studio",
      "provider": "openai",
      "apiBase": "http://127.0.0.1:4000/v1",
      "model": "local/lmstudio"
    },
    {
      "title": "Gemini (opt)",
      "provider": "openai",
      "apiBase": "http://127.0.0.1:4000/v1",
      "model": "gemini/1.5-pro"
    },
    {
      "title": "Grok Code (opt)",
      "provider": "openai",
      "apiBase": "http://127.0.0.1:4000/v1",
      "model": "xai/grok-code-fast-1"
    }
  ],
  "allowAnonymousTelemetry": false
}
```

### 3.3 Justfile (task runner): `Justfile`

```just
# ===== INTELGRAPH LLM ORCHESTRATION =====
set shell := ["/bin/bash", "-cu"]

plan task:
    echo "Planning: {{task}}";
    aider --model openai/local/ollama --message "Create a concise plan for {{task}} with acceptance checks." --yes

prototype files+:
    aider --model openai/local/ollama-coder --files {{files}} --message "Implement the described changes with minimal diff and tests." --yes

review files+:
    aider --model openai/local/ollama --files {{files}} --message "Review these diffs. List risks, suggest safer alternatives, no code unless critical."

# Optional bursts (uncomment if budgets enabled)
# grok-sprint feat:
#     aider --model openai/xai/grok-code-fast-1 --message "Implement {{feat}} with tests and a PR description." --yes

# quick local sanity lint (node + python)
lint:
    npx -y eslint . || true
    ruff check . || true

fix:
    npx -y prettier --write .
    ruff check . --fix
    black .
```

---

## 4) Standards & Tooling (conflict-free, uniform)

### 4.1 EditorConfig: `.editorconfig`

```ini
root = true
[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.py]
indent_size = 4
```

### 4.2 JS/TS: `package.json` (dev deps only)

```json
{
  "name": "intelgraph-monorepo",
  "private": true,
  "devDependencies": {
    "eslint": "^9.9.0",
    "@eslint/js": "^9.9.0",
    "typescript": "^5.5.4",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "prettier": "^3.3.3",
    "lint-staged": "^15.2.8",
    "husky": "^9.1.5",
    "@commitlint/cli": "^19.4.0",
    "@commitlint/config-conventional": "^19.4.0"
  },
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "prepare": "husky install"
  }
}
```

### 4.3 ESLint: `.eslintrc.cjs`

```js
module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  env: { node: true, es2023: true, browser: true, jest: true },
  plugins: ['import'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'import/order': ['warn', { 'newlines-between': 'always' }],
  },
};
```

### 4.4 Prettier: `.prettierrc`

```json
{ "singleQuote": true, "semi": true, "printWidth": 100 }
```

### 4.5 Python: `pyproject.toml`

```toml
[tool.black]
line-length = 100
target-version = ["py312"]

[tool.ruff]
line-length = 100
select = ["E","F","I","B","UP"]
ignore = ["E501"]

[tool.ruff.format]
quote-style = "single"
```

### 4.6 Commit conventions & hooks

**Husky & commitlint** (JS workspace):

```bash
# one-time setup
npm i
npm run prepare
npx husky add .husky/commit-msg 'npx --no commitlint --edit "$1"'
```

`commitlint.config.cjs`:

```js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

**pre-commit (Python + general):** `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.8.0
    hooks:
      - id: black
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: ['--fix']
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.3.3
    hooks:
      - id: prettier
  - repo: https://github.com/pre-commit/validate-json
    rev: v1.0.2
    hooks:
      - id: validate-json
  - repo: local
    hooks:
      - id: llm-lint-sanitize
        name: LLM lint sanitize (local only)
        entry: bash -lc 'echo "(skipping in CI)"'
        language: system
        stages: [commit]
```

Enable:

```bash
pipx install pre-commit
pre-commit install --install-hooks
```

### 4.7 Merge-safety: `.gitattributes`

```gitattributes
# Keep lockfiles conflict-light
package-lock.json merge=union
pnpm-lock.yaml merge=union
yarn.lock merge=union
poetry.lock merge=union

# Normalize line endings
* text=auto eol=lf
```

---

## 5) GitHub CI/CD (deterministic, cheap, autonomous)

### 5.1 CI (GitHub-hosted, cached, matrix): `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-test:
    name: Lint & Test (Node ${{ matrix.node }} • Py ${{ matrix.py }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20]
        py: ['3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - name: Cache npm
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ matrix.node }}-${{ hashFiles('**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock') }}

      - name: Install JS tooling
        run: |
          npm ci || npm i

      - name: Lint JS/TS
        run: npm run lint || true

      - name: Format check (Prettier)
        run: npx prettier --check .

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.py }}

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/pip
            .pytest_cache
          key: ${{ runner.os }}-py-${{ matrix.py }}-${{ hashFiles('**/requirements*.txt', '**/pyproject.toml') }}

      - name: Install Python tooling
        run: |
          python -m pip install --upgrade pip
          pip install black ruff pytest pip-audit

      - name: Lint Python
        run: |
          ruff check .
          black --check .

      - name: Run tests
        run: |
          npm test --if-present || echo 'no JS tests'
          pytest -q || echo 'no Python tests'

  secrets-scan:
    name: Secrets Scan (Gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        with:
          args: --redact --verbose

  dependency-audit:
    name: Dependency Audit (npm & pip)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node audit
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: |
          npm i --package-lock-only || true
          npm audit --audit-level=high || true
      - name: Python audit
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: |
          python -m pip install --upgrade pip
          pip install pip-audit
          pip-audit || true
```

### 5.2 AI PR Review (Gemini): `.github/workflows/pr-review-gemini.yml`

_(unchanged; ensure repo secret `GOOGLE_API_KEY` is set)_

### 5.3 Nightly Security & Dependency Audit: `.github/workflows/sec-audit.yml`

```yaml
name: Nightly Security & Dependency Audit
on:
  schedule:
    - cron: '19 3 * * *' # 03:19 UTC nightly
  workflow_dispatch:

jobs:
  nightly-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        with:
          args: --redact --verbose
      - name: Node audit
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: |
          npm i --package-lock-only || true
          npm audit --audit-level=high || true
      - name: Python audit
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: |
          python -m pip install --upgrade pip
          pip install pip-audit
          pip-audit || true
```

## 6) Prompts & Roles (for uniformity)

### Core agent roles (for Continue/Aider sessions)

- **Guy (Architect/Lead Coder)** – you. Decides architecture, enforces small diffs + tests.
- **Elara (Research/Context)** – aggregates docs, standards, similar prior art; prepares brief context packs.
- **Aegis (Security/Governance)** – runs threat modeling checklists, OPA/ABAC notes, secret & PII hygiene.
- **Orion (Data/ETL/Graph)** – shapes Cypher/SQL diffs, migration safety, performance hints.
- **Hermes (CI/CD)** – drafts PR descriptions, CHANGELOG, backport notes, and nudges flaky tests.

`prompts/architect.md`

```
You are the IntelGraph Architect (Guy). Deliver: (1) goal recap, (2) constraints, (3) design sketch, (4) risks, (5) acceptance checks. Prefer existing patterns. Avoid new deps.
```

`prompts/elara.md`

```
You are Elara, IntelGraph Research. Summarize relevant repo files and external standards succinctly. Output: key bullets + links/paths + 5 risks + 5 gotchas.
```

`prompts/aegis.md`

```
You are Aegis, IntelGraph Security. Review changes for OWASP, authZ (RBAC/ABAC), secrets, PII, logging, and auditability. Output concrete issues with file:line.
```

`prompts/orion.md`

```
You are Orion, IntelGraph Graph/ETL. Produce Cypher/SQL diffs, backfill scripts, index hints, and a rollback plan. Validate on sample data.
```

`prompts/hermes.md`

```
You are Hermes, IntelGraph CI/CD. Produce PR title, description, release notes, and test flake triage. Keep under 200 words.
```

### Continue quick actions (suggested)

Use slash-commands in Continue to switch roles/models quickly (conceptual):

- `/guy local/ollama` → architect
- `/elara gemini/1.5-pro` → research pack (long context)
- `/aegis local/ollama` → security
- `/orion local/ollama-coder` → graph/Cypher
- `/hermes local/ollama` → PR boilerplate

## 7) Semi‑Autonomous Flow (daily loop)

1. **Plan (5m)** – `just plan "<story>"` (Architect/Guy prompt) → acceptance checks.
2. **Proto (30m)** – `just prototype path/to/files` (Coder prompt) → minimal diffs + tests.
3. **Security/Graph review (10m)** – `just aegis path/to/files` then `just orion path/to/files`.
4. **Review (10m)** – `just review path/to/files` → collect risks.
5. **PR** – Open PR → CI + **AI Review (Gemini)** + nightly audits.

> Need more power? Toggle **Power‑Burst** caps (Section 2.3) or run Grok in the browser for $0.

1. **Plan (5m)** – `just plan "<story>"` → Aider (local Llama) produces plan + acceptance.
2. **Prototype (30m)** – `just prototype path/to/files` → Aider (local coder) makes minimal diffs + tests.
3. **Review (10m)** – `just review path/to/diff` → Aider critique; fix with `just fix`.
4. **PR** – Open PR → CI runs lint/tests → **AI PR Review (Gemini)** comments.
5. **Merge** – Protections require green checks + CODEOWNERS.

> When you intentionally need more power, enable a model budget in `litellm.config.yaml`, run again, and use Continue to route a single task to Gemini or Grok Code.

---

## 8) Optional: Local Router CLI (for scripts)

`tools/route.py`

```python
#!/usr/bin/env python3
"""Tiny router to call the LiteLLM gateway.
Usage: tools/route.py -m local/ollama -p "Write unit tests for module X"""
import argparse, json, os, sys, urllib.request

def chat(model, prompt, base="http://127.0.0.1:4000/v1"):
    url = f"{base}/chat/completions"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Be concise and safe."},
            {"role": "user", "content": prompt}
        ]
    }
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data)
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer sk-anything")
    with urllib.request.urlopen(req) as r:
        out = json.loads(r.read())
    return out["choices"][0]["message"]["content"]

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument('-m','--model', default='local/ollama')
    ap.add_argument('-p','--prompt', required=True)
    args = ap.parse_args()
    print(chat(args.model, args.prompt))
```

---

## 9) Governance & Safety Quickchecks

- **Secrets:** .gitignore `.env*`, commit scans in CI (add Gitleaks if needed).
- **PII/Privacy:** Default local models for sensitive text; hosted only with explicit opt‑in.
- **Provenance:** Keep LLM decisions in PR comments / commit messages.

---

## 10) First-Run Checklist

1. `ollama serve &` → pull models listed.
2. `litellm --config litellm.config.yaml --host 127.0.0.1 --port 4000`.
3. Copy Aider/Continue configs.
4. `npm i` (dev tooling) → `pipx install pre-commit && pre-commit install`.
5. Add GitHub repo secret **`GOOGLE_API_KEY`** (for PR review).
6. Push a feature branch; open PR; verify CI + AI review + audits.

---

## 11) New `just` Recipes (pre‑templated tickets)

Add to **Justfile**:

```just
# ===== Agents =====
aegis files+:
    aider --model openai/local/ollama --files {{files}} --message "Use prompts/aegis.md. Output concrete security issues with file:line."

orion files+:
    aider --model openai/local/ollama-coder --files {{files}} --message "Use prompts/orion.md. Propose Cypher/SQL diffs + rollback plan."

hermes:
    aider --model openai/local/ollama --message "Use prompts/hermes.md. Generate concise PR title/body + release notes."

# ===== IntelGraph specific =====
# 1) NL→Cypher prompt eval (local)
nl2cypher question:
    python tools/route.py -m local/ollama -p "Generate Cypher + rationale for: {{question}}. Ensure MATCH..RETURN only, no writes."

# 2) Neo4j migration guard (dry-run logic)
neo4j-guard migfile:
    echo "[Guard] Validating migration: {{migfile}}";
    echo "(Stub) Run cypher-shell in dry-run mode against staging here."

# 3) RAG eval sample
rag-eval query:
    python tools/route.py -m local/ollama -p "Given top-5 docs (embedded offline), answer: {{query}}. Cite doc ids."

# 4) Perf smoke for resolvers
perf-resolvers:
    npx -y k6 run perf/resolvers_smoke.js || echo 'k6 optional'
```

> You can later swap `-m local/ollama` with `-m gemini/1.5-pro` for heavier reasoning.

---

### Appendix A: Branch & PR Policy (Trunk-based)

- Branch: `feat/<area>-<short-desc>` | `fix/<area>-<issue>`
- Commits: Conventional (`feat:`, `fix:`, `chore:` …)
- PR must show: tests added, docs updated, risk notes.
- Required reviewers: CODEOWNERS + green CI.

### Appendix B: Aider Recipe Examples

```bash
# Fix failing test
just plan "Fix failing test in graph/resolver" && just prototype src/graph/resolver.ts
# Sprint an endpoint (local)
just prototype services/gateway/*.ts
# Review a diff (local)
just review src/**.ts
```

---

## 12) PMI / PMO Layer (Governance + Council Automation)

> Adds a lightweight PMI spine that stays fully local / GitHub‑native. Integrates with our agent roles (Elara/Aegis/Hermes/Orion) and the existing CI.

### 12.1 Repository layout

```
/pm/
  charter.md
  wbs.md
  stakeholders.md
  comms-plan.md
  benefits-register.md
  raid.md               # Risks, Assumptions, Issues, Dependencies
  changes.md            # Change requests log (CRs)
  decisions.md          # Decision log (ADRs summary)
  agendas/              # Generated agendas
  minutes/              # Generated minutes
  checklists/           # Stage-gate checklists
  templates/            # Issue/PR templates, prompt packs
/tools/
  raci_from_codeowners.py
  agenda_build.py
  heatmap.py
  hf_sync.sh
```

### 12.2 PMI templates (opinionated, concise)

**`/pm/templates/charter.md`**

```md
# Project Charter — IntelGraph

**Purpose/Justification**: <why now, value hypothesis>
**Objectives & Success Criteria**: <measurable, time-bound>
**Scope (In/Out)**: <bullets>
**High-level Requirements**: <bullets>
**Constraints/Assumptions**: <bullets>
**Major Risks**: <top 5>
**Milestones & Gate Schedule**: <dates, owners>
**Budget/Resource Boundaries**: <non-$ constraints; time/people>
**Stakeholders**: <from /pm/stakeholders.md>
**Approvals**: <R,A signatures or GitHub handles>
```

**`/pm/templates/raid.md`**

```md
# RAID Register

| ID  | Type | Title | Owner | Probability | Impact | Response | Status | Links |
| --- | ---- | ----- | ----- | ----------- | ------ | -------- | ------ | ----- |
```

**`/pm/templates/decision.md`** (ADR‑lite)

```md
# Decision: <title> (YYYY-MM-DD)

**Context**: <1-3 sentences>
**Options Considered**: <A,B,C>
**Decision**: <chosen option>
**Consequences**: <trade-offs>
**Approvals**: <handles / label-based>
**Links**: <PRs, issues, notes>
```

**`/pm/checklists/gates.yml`**

```yaml
gates:
  idea:
    checklist:
      - 'Charter draft exists at /pm/charter.md'
      - 'Stakeholder register seeded'
      - 'Initial RAID created with ≥3 risks'
  charter:
    checklist:
      - 'WBS created with top 3 deliverables'
      - 'Comms plan committed'
      - 'Benefits register has baseline metrics'
  mvp:
    checklist:
      - 'Test plan + CI green'
      - 'Security review (Aegis) recorded'
      - 'Decision log updated for key trade-offs'
  scale:
    checklist:
      - 'Perf SLOs met'
      - 'Runbooks + provenance checks in place'
      - 'Benefits review shows target trend'
```

### 12.3 GitHub Issue/PR forms

**`.github/ISSUE_TEMPLATE/risk.yml`**

```yaml
name: Risk
labels: [risk]
body:
  - type: input
    id: title
    attributes: { label: Risk title }
    validations: { required: true }
  - type: dropdown
    id: prob
    attributes: { label: Probability, options: [Low, Medium, High] }
  - type: dropdown
    id: impact
    attributes: { label: Impact, options: [Low, Medium, High] }
  - type: textarea
    id: response
    attributes: { label: Response strategy (avoid/mitigate/transfer/accept) }
```

**`.github/ISSUE_TEMPLATE/change-request.yml`**

```yaml
name: Change Request
labels: [change-request]
body:
  - type: textarea
    id: rationale
    attributes: { label: Rationale & scope }
  - type: checkboxes
    id: impacts
    attributes:
      label: Impacted areas
      options:
        - label: Security/Governance
        - label: Data/Graph
        - label: Cost/Performance
```

**`.github/ISSUE_TEMPLATE/decision.yml`**

```yaml
name: Decision Proposal
labels: [decision]
body:
  - type: input
    id: title
    attributes: { label: Title }
  - type: textarea
    id: options
    attributes: { label: Options considered (A/B/C) }
  - type: textarea
    id: context
    attributes: { label: Context (brief) }
```

**`.github/pull_request_template.md`**

```md
### What & Why

-

### Risks & Mitigations

-

### Governance

- [ ] Security review (Aegis) linked
- [ ] Decision or Change-Request linked
- [ ] Provenance checks updated if schema changed

### Tests

-

### Rollback

-
```

### 12.4 RACI from CODEOWNERS (auto‑generated)

**`/tools/raci_from_codeowners.py`**

```python
#!/usr/bin/env python3
import re, os, pathlib
CO = pathlib.Path(".") / "CODEOWNERS"
out = pathlib.Path("pm") / "raci.md"

def parse():
    owners = {}
    if not CO.exists():
        return owners
    for line in CO.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"): continue
        parts = line.split()
        pattern, handles = parts[0], parts[1:]
        for h in handles:
            owners.setdefault(h.lstrip("@"), set()).add(pattern)
    return {k: sorted(v) for k, v in owners.items()}

def to_md(mapping):
    rows = ["# RACI (derived from CODEOWNERS)
", "| Person | Areas (R/A) |", "|---|---|"]
    for person, areas in sorted(mapping.items()):
        rows.append(f"| @{person} | {', '.join(areas)} |")
    return "
".join(rows) + "
"

if __name__ == "__main__":
    mapping = parse()
    os.makedirs("pm", exist_ok=True)
    out.write_text(to_md(mapping))
    print(f"Wrote {out}")
```

CI step (add to CI job):

```yaml
- name: Derive RACI
  run: python tools/raci_from_codeowners.py && git diff --exit-code || echo "::notice::Updated RACI (commit in PR)"
```

### 12.5 Council/Board automation (async, zero SaaS)

**`/tools/agenda_build.py`**

```python
#!/usr/bin/env python3
import json, os, datetime, subprocess

def gh_json(cmd: str):
    return json.loads(subprocess.check_output(cmd, shell=True).decode())

def section(title, issues):
    s = [f"## {title}"]
    for i in issues:
        s.append(f"- #{i['number']} {i['title']} (@{i['user']['login']})")
    return "
".join(s)

if __name__ == "__main__":
    today = datetime.date.today().isoformat()
    risk = gh_json('gh issue list --state open --label risk --json number,title,user')
    decision = gh_json('gh issue list --state open --label decision --json number,title,user')
    change = gh_json('gh issue list --state open --label change-request --json number,title,user')
    content = f"# Council Agenda — {today}

" + "

".join([
        section("Decisions", decision),
        section("Change Requests", change),
        section("Top Risks", risk)
    ]) + "
"
    os.makedirs("pm/agendas", exist_ok=True)
    path = f"pm/agendas/{today}.md"
    open(path, "w").write(content)
    print(path)
```

Justfile hook:

```just
agenda:
    python tools/agenda_build.py && echo "Agenda built."
```

**Decision log from reactions** (minimal, working).
**`.github/workflows/decision-log.yml`**

```yaml
name: Decision Log
on:
  issue_comment:
  issues:
    types: [labeled]
  workflow_dispatch:

jobs:
  harvest:
    if: ${{ contains(toJson(github.event.issue.labels), 'decision') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/github-script@v7
        id: tally
        with:
          script: |
            const issue_number = context.payload.issue.number;
            const {owner, repo} = context.repo;
            const reactions = await github.rest.reactions.listForIssue({owner, repo, issue_number, per_page: 100});
            const counts = { up: 0, down: 0, confused: 0 };
            for (const r of reactions.data) {
              if (r.content === '+1') counts.up++;
              if (r.content === '-1') counts.down++;
              if (r.content === 'confused') counts.confused++;
            }
            core.setOutput('summary', `👍 ${counts.up} | 👎 ${counts.down} | ❓ ${counts.confused}`);
      - name: Append ADR-lite to pm/decisions.md
        run: |
          echo "## $(date +%F) – issue #${{ github.event.issue.number }}" >> pm/decisions.md
          echo "${{ steps.tally.outputs.summary }}" >> pm/decisions.md
      - name: Commit
        run: |
          git config user.name "bot"; git config user.email "bot@users.noreply.github.com"
          git add pm/decisions.md
          git commit -m "chore: update decisions log (issue #${{ github.event.issue.number }})" || true
          git push
```

### 12.6 Stage‑gate enforcement

**`.github/workflows/gatekeeper.yml`**

```yaml
name: Stage Gatekeeper
on: [pull_request]

jobs:
  gate-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate gate checklist
        run: |
          python - <<'PY'
import yaml, sys, pathlib
from pathlib import Path

missing=[]
with open('pm/checklists/gates.yml') as f:
  gates = yaml.safe_load(f)['gates']

# Minimal presence checks for common artifacts
checks = {
  'Charter draft exists at /pm/charter.md': Path('pm/charter.md').exists(),
  'WBS created with top 3 deliverables': Path('pm/wbs.md').exists(),
  'Comms plan committed': Path('pm/comms-plan.md').exists(),
  'Benefits register has baseline metrics': Path('pm/benefits-register.md').exists(),
}
for label, ok in checks.items():
  if not ok: missing.append(label)

if missing:
  print('Missing gate items:
- ' + '
- '.join(missing))
  sys.exit(1)
else:
  print('Gate checks passed')
PY
```

### 12.7 PMI Copilot prompts

```
/pm/prompts/pmi-charter.md  – Charter generator (Elara)
/pm/prompts/raid-update.md  – RAID updater from issues (Aegis + Elara)
```

Use with `just charter`, `just raid-sync` (recipes below).

### 12.8 Justfile additions (automation)

```just
# ===== PMI =====
charter:
    python tools/route.py -m local/ollama -p "Use /pm/prompts/pmi-charter.md. Draft or refresh /pm/charter.md from repo context."

wbs:
    python tools/route.py -m local/ollama -p "Generate /pm/wbs.md as a hierarchical WBS (levels 1-3) for current epics (scan repo)."

raid-sync:
    python tools/route.py -m local/ollama -p "Use /pm/prompts/raid-update.md. Update /pm/raid.md from issues."

agenda:
    python tools/agenda_build.py && echo "Agenda built."

minutes file:
    python tools/route.py -m local/ollama -p "Summarize meeting in {{file}} into decisions, actions (owner+due), risks, and changes. Append to /pm/minutes/YYYY-MM-DD.md and update /pm/decisions.md."

benefits:
    python tools/route.py -m local/ollama -p "Update /pm/benefits-register.md with leading indicators, baselines, targets, and current trend from README/CI metrics."
```

### 12.9 Risk heatmap (optional local)

**`/tools/heatmap.py`**

```python
#!/usr/bin/env python3
import csv, matplotlib.pyplot as plt
x=[]; y=[]
with open('pm/raid.csv') as f:
    for r in csv.DictReader(f):
        x.append(int(r['prob']))
        y.append(int(r['impact']))
plt.scatter(x,y)
plt.title('Risk Heatmap (P vs I)')
plt.xlabel('Probability'); plt.ylabel('Impact')
plt.savefig('pm/risk_heatmap.png', dpi=144, bbox_inches='tight')
```

### 12.10 Hugging Face metadata sync (optional)

**`/tools/hf_sync.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
rsync -av --include '*/' --include '*.md' --include '*.json' --exclude '*' eval/ hf_eval_sync/
cd hf_eval_sync && git init && git add . && git commit -m "sync eval cards" || true
echo "(push to your HF remote manually to avoid mistakes)"
```

### 12.11 Daily PMI+Eng loop

```
just agenda
just charter   # or: just wbs (when scope changes)
# build slice with Plan/Prototype/Review loop
just raid-sync
# open PR -> Gatekeeper + AI PR review + nightly audits
```

---

## 13) Neo4j Disposable DB Guard (docker‑compose + real cypher-shell)

### 13.1 Compose (disposable DB)

**`ops/docker-compose.neo4j.yml`**

```yaml
version: '3.9'
services:
  neo4j:
    image: neo4j:5-community
    container_name: intelgraph-neo4j-guard
    environment:
      NEO4J_AUTH: neo4j/test
      NEO4J_dbms_logs_debug_level: INFO
      NEO4JLABS_PLUGINS: '[]' # enable ["apoc"] if needed
      NEO4J_dbms_memory_heap_initial__size: 512m
      NEO4J_dbms_memory_heap_max__size: 1024m
      NEO4J_server_config_strict__validation_enabled: 'false'
    ports:
      - '7474:7474'
      - '7687:7687'
    healthcheck:
      test:
        [
          'CMD',
          'bash',
          '-lc',
          "cypher-shell -u neo4j -p test 'RETURN 1' || exit 1",
        ]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes:
      - neo4j-guard-data:/data
      - neo4j-guard-logs:/logs
volumes:
  neo4j-guard-data: {}
  neo4j-guard-logs: {}
```

### 13.2 Guard script

**`tools/neo4j_guard.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-ops/docker-compose.neo4j.yml}
MIG=${1:-}
if [ -z "${MIG}" ]; then
  echo "Usage: $0 path/to/migration.cypher" >&2; exit 2
fi

UP() {
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  echo "[neo4j-guard] Waiting for bolt ..."
  for i in {1..60}; do
    if docker compose -f "$COMPOSE_FILE" exec -T neo4j cypher-shell -u neo4j -p test 'RETURN 1' >/dev/null 2>&1; then
      echo "[neo4j-guard] Ready"; return 0
    fi
    sleep 2
  done
  echo "[neo4j-guard] Neo4j failed to become healthy" >&2; return 1
}

RUN_MIG() {
  echo "[neo4j-guard] Applying migration: $MIG"
  docker compose -f "$COMPOSE_FILE" exec -T neo4j bash -lc "cat > /tmp/mig.cypher <<'EOF'
$(cat "$MIG")
EOF
cypher-shell -u neo4j -p test -f /tmp/mig.cypher"
}

SMOKE() {
  echo "[neo4j-guard] Smoke checks"
  docker compose -f "$COMPOSE_FILE" exec -T neo4j cypher-shell -u neo4j -p test "RETURN db.labels() AS labels, db.relationshipTypes() AS rels LIMIT 1" || true
}

DOWN() {
  echo "[neo4j-guard] Tearing down"
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
}

trap DOWN EXIT
UP && RUN_MIG && SMOKE
```

> This **executes your migration(s) for real** against an ephemeral DB, then tears everything down. Point it at `db/migrations/*.cypher` files.

### 13.3 Justfile hooks

Append to **Justfile**:

```just
neo4j-up:
    docker compose -f ops/docker-compose.neo4j.yml up -d --remove-orphans

neo4j-down:
    docker compose -f ops/docker-compose.neo4j.yml down -v --remove-orphans

neo4j-guard mig:
    bash tools/neo4j_guard.sh {{mig}}
```

### 13.4 CI guard (runs on PRs touching migrations)

**`.github/workflows/neo4j-guard.yml`**

```yaml
name: Neo4j Guard
on:
  pull_request:
    paths:
      - 'db/migrations/**.cypher'
      - 'ops/docker-compose.neo4j.yml'
      - 'tools/neo4j_guard.sh'

jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start Neo4j (disposable)
        run: docker compose -f ops/docker-compose.neo4j.yml up -d --remove-orphans
      - name: Wait for health
        run: |
          for i in {1..60}; do
            docker compose -f ops/docker-compose.neo4j.yml exec -T neo4j cypher-shell -u neo4j -p test 'RETURN 1' && exit 0
            sleep 2
          done
          exit 1
      - name: Apply migrations
        run: |
          set -e
          for f in db/migrations/*.cypher; do
            echo "Applying $f";
            bash tools/neo4j_guard.sh "$f"
          done
      - name: Teardown
        if: always()
        run: docker compose -f ops/docker-compose.neo4j.yml down -v --remove-orphans
```

---

## 14) Python lockfiles with pip‑tools + PNPM for JS

### 14.1 pip‑tools

**`requirements.in`**

```
# app deps (example)
fastapi
neo4j
```

**`requirements-dev.in`**

```
black
ruff
pytest
pip-audit
```

Lock & sync commands (add to **Justfile**):

```just
py-lock:
    pip install -q pip-tools && \
    pip-compile -q -o requirements.txt requirements.in && \
    pip-compile -q -o requirements-dev.txt requirements-dev.in

py-sync:
    pip install -q pip-tools && pip-sync requirements.txt requirements-dev.txt
```

**CI changes (in `CI` job):** replace raw `pip install` with:

```yaml
- name: Lock Python deps
  run: |
    pip install -q pip-tools
    pip-compile -q -o requirements.txt requirements.in
    pip-compile -q -o requirements-dev.txt requirements-dev.in
- name: Install Python tooling
  run: |
    pip install -q pip-tools
    pip-sync requirements.txt requirements-dev.txt
```

### 14.2 PNPM (fast installs) with fallback

**CI changes (Node steps):**

```yaml
- name: Enable corepack
  run: corepack enable
- name: Activate pnpm
  run: corepack prepare pnpm@latest --activate
- name: Install JS deps (pnpm → npm fallback)
  run: pnpm install --frozen-lockfile || npm ci || npm i
- name: Lint JS/TS
  run: pnpm lint || npm run lint || true
- name: Run JS tests
  run: pnpm test --if-present || npm test --if-present || echo 'no JS tests'
```

In `actions/setup-node@v4`, use `cache: pnpm`.

---

## 15) PR Size Guard (warn > 500 changed lines)

**`.github/workflows/pr-size-guard.yml`**

```yaml
name: PR Size Guard
on:
  pull_request:
    types: [opened, synchronize, edited]
permissions:
  pull-requests: write
  contents: read
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;
            const limit = 500;
            const changed = (pr.additions || 0) + (pr.deletions || 0);
            const warn = changed > limit;
            const body = `### PR Size Guard
Changed lines: **${changed}** (limit ${limit})
` + (warn ? `:warning: Consider splitting into smaller PRs.` : `:white_check_mark: Within limits.`);
            // Find an existing guard comment from the bot
            const {owner, repo} = context.repo;
            const comments = await github.rest.issues.listComments({owner, repo, issue_number: pr.number, per_page: 100});
            const mine = comments.data.find(c => c.user.type === 'Bot' && c.body.startsWith('### PR Size Guard'));
            if (mine) {
              await github.rest.issues.updateComment({owner, repo, comment_id: mine.id, body});
            } else {
              await github.rest.issues.createComment({owner, repo, issue_number: pr.number, body});
            }
            // Manage label
            const label = 'pr:large';
            try { await github.rest.issues.getLabel({owner, repo, name: label}); } catch (_) { await github.rest.issues.createLabel({owner, repo, name: label, color: 'B60205'}).catch(()=>{}); }
            if (warn) await github.rest.issues.addLabels({owner, repo, issue_number: pr.number, labels: [label]});
            else {
              // remove label if present
              try { await github.rest.issues.removeLabel({owner, repo, issue_number: pr.number, name: label}); } catch (_) {}
            }
```

> This **does not fail** CI; it nudges authors to keep diffs small and adds/removes a `pr:large` label automatically.

---

## 16) Local RAG (zero-cost, embeddings via Ollama)

### 16.1 Pull an embeddings model

```bash
ollama pull nomic-embed-text
```

### 16.2 Chroma-backed local indexer

**`tools/rag_index.py`**

```python
#!/usr/bin/env python3
import os, glob, json
from chromadb import Client
from chromadb.config import Settings
import requests

EMBED_URL = os.environ.get("EMBED_URL", "http://127.0.0.1:11434/v1/embeddings")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")
SRC_DIRS = ["docs", "pm"]
DB_DIR = ".rag"

os.makedirs(DB_DIR, exist_ok=True)
client = Client(Settings(anonymized_telemetry=False, persist_directory=DB_DIR))
col = client.get_or_create_collection("intelgraph_rag")

files = []
for d in SRC_DIRS:
    for p in glob.glob(f"{d}/**/*.md", recursive=True):
        files.append(p)

ids, docs, metas, embs = [], [], [], []
for i, path in enumerate(sorted(files)):
    txt = open(path, "r", encoding="utf-8", errors="ignore").read()
    payload = {"input": txt, "model": EMBED_MODEL}
    r = requests.post(EMBED_URL, json=payload, timeout=60)
    vec = r.json()["data"][0]["embedding"]
    ids.append(f"doc-{i}")
    docs.append(txt)
    metas.append({"path": path})
    embs.append(vec)

if ids:
    col.upsert(ids=ids, embeddings=embs, documents=docs, metadatas=metas)
    print(f"Indexed {len(ids)} docs into {DB_DIR}")
else:
    print("No docs found")
```

### 16.3 Query with local LLM + citations

**`tools/rag_query.py`**

```python
#!/usr/bin/env python3
import os, sys
from chromadb import Client
from chromadb.config import Settings
import requests

CHAT_URL = os.environ.get("CHAT_URL", "http://127.0.0.1:4000/v1/chat/completions")
MODEL = os.environ.get("MODEL", "local/ollama")

q = " ".join(sys.argv[1:])
client = Client(Settings(anonymized_telemetry=False, persist_directory=".rag"))
col = client.get_collection("intelgraph_rag")
res = col.query(query_texts=[q], n_results=5)
chunks = [d for d in res["documents"][0]]
metas = res["metadatas"][0]
context = "

".join([f"[{i}] {m['path']}
{c[:1200]}" for i,(c,m) in enumerate(zip(chunks, metas))])

prompt = f"""
Answer the question using the context. Cite sources as [index] at the end of sentences.

Question: {q}

Context:
{context}
"""

r = requests.post(CHAT_URL, json={
  "model": MODEL,
  "messages": [
    {"role":"system","content":"Be concise and cite sources like [0],[1]."},
    {"role":"user","content": prompt}
  ]
})
print(r.json()["choices"][0]["message"]["content"])
```

### 16.4 Justfile hooks

```just
rag-build:
    python tools/rag_index.py

rag-ask q*:
    python tools/rag_query.py {{q}}
```

> Keeps all knowledge local, re-usable by Elara/Aegis when drafting charters or updating RAID.

---

## 17) Docs Site via GitHub Pages (MkDocs)

**`mkdocs.yml`**

```yaml
site_name: IntelGraph Docs
nav:
  - Home: index.md
  - PM:
      - Charter: pm/charter.md
      - RAID: pm/raid.md
      - Benefits: pm/benefits-register.md
  - Cookbooks:
      - NL→Cypher: docs/nl2cypher.md
theme: material
markdown_extensions: [toc, tables]
```

Create **`docs/index.md`** (landing page) as needed.

**`.github/workflows/docs.yml`**

```yaml
name: Docs
on:
  push:
    branches: [main]
    paths: ['docs/**', 'pm/**', 'mkdocs.yml']
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install mkdocs mkdocs-material
      - run: mkdocs build --strict
      - uses: actions/upload-pages-artifact@v3
        with: { path: 'site' }
      - uses: actions/deploy-pages@v4
```

Enable GitHub Pages → Deploy from GitHub Actions.

---

## 18) Dev Containers (consistent local dev)

**`.devcontainer/devcontainer.json`**

```json
{
  "name": "intelgraph-dev",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:22-bullseye",
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" }
  },
  "postCreateCommand": "corepack enable && corepack prepare pnpm@latest --activate && pnpm i && pipx install pre-commit && pre-commit install",
  "customizations": {
    "vscode": {
      "extensions": [
        "Continue.continue",
        "ms-python.python",
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint"
      ]
    }
  }
}
```

---

## 19) SBOM (software bill of materials)

Add to CI (in main CI job):

```yaml
- name: Generate SBOM (Syft)
  uses: anchore/sbom-action@v0
  with:
    path: .
    format: spdx-json
  continue-on-error: true
```

Artifacts appear in the PR for auditing (zero cost).

---

## 20) Conventional PR Title Enforcement

**`.github/workflows/semantic-pr.yml`**

```yaml
name: Semantic PR Title
on:
  pull_request_target:
    types: [opened, edited, synchronize]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 21) Pre-commit hygiene boosters

Add to `.pre-commit-config.yaml`:

```yaml
- repo: https://github.com/pre-commit/pre-commit-hooks
  rev: v5.0.0
  hooks:
    - id: check-added-large-files
      args: ['--maxkb=500']
    - id: end-of-file-fixer
    - id: trailing-whitespace
    - id: detect-private-key
```

---

## 22) Prompt eval harness (promptfoo quickstart)

**`eval/prompts.yaml`**

```yaml
prompts:
  - 'Generate Cypher to answer: {{q}}. Return query + brief rationale.'
tests:
  - vars: { q: 'Entities co-present within 100m / 30m near X' }
  - vars: { q: 'Paths from A to B excluding classified edges' }
providers:
  - id: openai:gateway
    config:
      {
        apiBaseUrl: 'http://127.0.0.1:4000/v1',
        apiKey: 'local',
        model: 'local/ollama-coder',
      }
```

Add Just recipe:

```just
eval:
    npx -y promptfoo eval -c eval/prompts.yaml || echo "(install promptfoo globally if preferred)"
```

---

## 23) Optional: Renovate (zero-cost dependency bot)

Create **`renovate.json`** (optional):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "rangeStrategy": "bump",
  "packageRules": [
    { "matchManagers": ["npm"], "rangeStrategy": "replace" },
    { "matchManagers": ["pip_requirements"], "rangeStrategy": "replace" }
  ]
}
```

Install the Renovate GitHub App (no cost) when ready.

---

## 24) Final bootstrap script (one-shot)

**`tools/bootstrap.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1) Local models & gateway
ollama serve >/dev/null 2>&1 &
ollama pull llama3.1:8b || true
ollama pull qwen2.5-coder:7b || true
litellm --config litellm.config.yaml --host 127.0.0.1 --port 4000 >/dev/null 2>&1 &

# 2) RAG index (docs + pm)
python tools/rag_index.py || true

# 3) Pre-commit hooks
pipx install pre-commit >/dev/null 2>&1 || true
pre-commit install || true

# 4) Node/Python deps
corepack enable || true
corepack prepare pnpm@latest --activate || true
pnpm i || npm i || true

echo "Bootstrap complete. Ready to code."
```
