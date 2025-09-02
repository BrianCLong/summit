#!/usr/bin/env bash
set -euo pipefail
require() { command -v "$1" >/dev/null 2>&1 || { echo >&2 "$1 is required"; exit 1; }; }
require gh
require jq
echo "Creating epics and tasks..."

echo "\n==> Epic A — Portfolio Model Router (LiteLLM‑backed)"
EPIC_JSON=$(gh issue create --title "Epic A — Portfolio Model Router (LiteLLM‑backed)" --label epic --label "router" --body "**Problem**: Need multi‑objective routing across providers/models per step.
**Goals**: Dynamic per‑step routing, fallbacks, content tagging, policy compliance.
**Acceptance Criteria**:
- 99% of decisions < 50ms p95 in‑cluster.
- Fallback success > 98% during brownouts.
- ≥15% cost/1k tokens reduction with equal/better evals.
- All PII steps in approved jurisdictions." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "A1. Integrate LiteLLM Router service" --label "router" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "A2. Policy gate: step tags → OPA" --label "router" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "A3. Fallback chains + circuit breakers" --label "router" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "A4. Per‑step routing hints + auto content tagging" --label "router" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "A5. Telemetry: route spans + counters (OTEL)" --label "otel" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "A6. UI: Route Decision Panel" --label "ui" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "A7. Chaos tests for provider brownouts" --label "router" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true

echo "\n==> Epic B — Agent Graph Templates (Planner/Executor, Debate, Critique‑Improve, Toolformer)"
EPIC_JSON=$(gh issue create --title "Epic B — Agent Graph Templates (Planner/Executor, Debate, Critique‑Improve, Toolformer)" --label epic --label "agent-graph" --body "**Problem**: Repeated multi‑agent patterns lack standard state, recovery, and HITL.
**Goals**: First‑class Agent Graph SDK, HITL gates, cost preview & risk budgets.
**Acceptance Criteria**:
- Resume from failure with ≤1 step replay.
- HITL decision latency < 250ms p95.
- Recipes definable in YAML + visualized in UI." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "B1. Agent Graph SDK (@maestro/agents)" --label "agent-graph" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "B2. Built‑in patterns + YAML recipes" --label "agent-graph" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "B3. HITL widget in UI (Approve/Edit/Block)" --label "ui" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "B4. Cost preview & SLO burn forecast" --label "agent-graph" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "B5. Persist/restore checkpoints" --label "agent-graph" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "B6. Policy hooks on transitions (OPA)" --label "security" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true

echo "\n==> Epic C — vLLM + Ray Serve Inference Lane (High‑Utilization Serving)"
EPIC_JSON=$(gh issue create --title "Epic C — vLLM + Ray Serve Inference Lane (High‑Utilization Serving)" --label epic --label "serving" --body "**Problem**: Need high‑throughput, low‑latency serving with continuous batching.
**Goals**: vLLM for paged attention; Ray Serve for autoscale and composition.
**Acceptance Criteria**:
- Throughput ≥2.5× baseline; cost/req ↓ ≥20%.
- SLO p95 ≤ baseline +10% under 2× load.
- Zero‑downtime model updates." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "C1. Ray cluster Helm chart + GPU selectors" --label "serving" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "C2. vLLM images with quantization presets" --label "serving" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "C3. Batching knobs exposed to Maestro" --label "serving" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "C4. Telemetry export: queue depth, batch size, p95" --label "otel" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "C5. Health checks + request shedding; spillover" --label "serving" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true

echo "\n==> Epic D — EvalOps (Golden Tasks, Scorecards, Autonomy Gating)"
EPIC_JSON=$(gh issue create --title "Epic D — EvalOps (Golden Tasks, Scorecards, Autonomy Gating)" --label epic --label "evalops" --body "**Problem**: Changes must be evaluated for quality/safety/cost before rollout.
**Goals**: Golden tasks, A/B/C prompt tests, scorecards, autonomy gates.
**Acceptance Criteria**:
- PRs blocked on failing thresholds.
- Nightly variance <2% on stable seeds.
- Scorecards render with diffs vs baseline." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "D1. Eval runner lib + provider adapters" --label "evalops" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "D2. Datasets versioning + manifests" --label "evalops" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "D3. Scorecard UI with trendlines" --label "ui" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "D4. Autonomy gate: L2→L3 requires pass" --label "evalops" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true

echo "\n==> Epic E — OpenTelemetry Normalization (Traces, Metrics, Logs)"
EPIC_JSON=$(gh issue create --title "Epic E — OpenTelemetry Normalization (Traces, Metrics, Logs)" --label epic --label "otel" --body "**Problem**: Inconsistent telemetry across components.
**Goals**: Adopt OTEL semantic conventions; default dashboards and alerts.
**Acceptance Criteria**:
- 95%+ requests linked via trace IDs.
- Dashboards render OOTB; alerts link to runbooks." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "E1. OTEL SDK wrappers in Maestro packages" --label "otel" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "E2. Collector Helm values & exporters" --label "otel" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "E3. Grafana dashboards JSONs" --label "otel" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "E4. Alert rules for error budget & backpressure" --label "otel" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true

echo "\n==> Epic F — Progressive Delivery (Canary + Auto‑Rollback) for Agents & Prompts"
EPIC_JSON=$(gh issue create --title "Epic F — Progressive Delivery (Canary + Auto‑Rollback) for Agents & Prompts" --label epic --label "canary" --body "**Problem**: Agent/prompt changes risk regressions and budget blowouts.
**Goals**: Canary analysis, rollback on SLO/eval miss, UI version switcher.
**Acceptance Criteria**:
- Canary completes within policy windows.
- Rollback < 2 minutes with audit trail." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "F1. Package agent/prompt versions as OCI w/ provenance" --label "canary" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "F2. Canary analysis templates (eval+SLO)" --label "canary" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "F3. UI Version Switcher & audit log" --label "ui" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "F4. Auto‑rollback + Slack/ticket updates" --label "canary" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true

echo "\n==> Epic G — Asset Graph for Everything (Optional)"
EPIC_JSON=$(gh issue create --title "Epic G — Asset Graph for Everything (Optional)" --label epic --label "docs" --body "**Goal**: First‑class assets (models, datasets, policies, prompts, evals) with lineage & reconciliation.
**Acceptance Criteria**:
- Asset registry with lineage edges.
- Drift detection and reconcile jobs." --json number,url)
EPIC_NUM=$(echo "$EPIC_JSON" | jq -r .number)
EPIC_URL=$(echo "$EPIC_JSON" | jq -r .url)
echo "EPIC: $EPIC_URL"
TASK_LIST=""
TASK_JSON=$(gh issue create --title "G1. Asset registry schema + UI graph" --label "docs" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
TASK_JSON=$(gh issue create --title "G2. Drift detection + reconcile jobs" --label "docs" --label task --body "Parent epic: #{EPIC_NUM}

Acceptance Criteria: see epic." --json number,url)
TASK_NUM=$(echo "$TASK_JSON" | jq -r .number)
TASK_URL=$(echo "$TASK_JSON" | jq -r .url)
echo "  - $TASK_URL"
TASK_LIST="$TASK_LIST\n- [ ] #$TASK_NUM"
NEW_BODY=$(printf "%s\n\n**Tasks**:%s\n" "$(echo "$EPIC_JSON" | jq -r .body // empty || true)" "$TASK_LIST")
gh issue edit "$EPIC_NUM" --body "$NEW_BODY" >/dev/null || true
