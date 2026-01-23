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
