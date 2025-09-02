#!/usr/bin/env bash
set -euo pipefail
command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }
command -v jq >/dev/null || { echo "jq required"; exit 1; }

echo "Creating labels (idempotent)…"
gh label create epic --color 8250DF --force >/dev/null || true
gh label create router --color 0E8A16 --force >/dev/null || true
gh label create agent-graph --color 1D76DB --force >/dev/null || true
gh label create serving --color B60205 --force >/dev/null || true
gh label create evalops --color 5319E7 --force >/dev/null || true
gh label create otel --color FBCA04 --force >/dev/null || true
gh label create canary --color BFDADC --force >/dev/null || true
gh label create docs --color 0E8A16 --force >/dev/null || true
gh label create ui --color 1D76DB --force >/dev/null || true
gh label create task --color E6E6E6 --force >/dev/null || true

echo "Creating epics and tasks…"

EPIC=$(gh issue create --title "Epic A — Portfolio Model Router (LiteLLM‑backed)" --label epic --label "router" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "A1. Integrate LiteLLM Router service" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "A2. Policy gate: step tags → OPA" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "A3. Fallback chains + circuit breakers" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "A4. Per‑step routing hints + auto content tagging" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "A5. Telemetry: route spans + counters (OTEL)" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "A6. UI: Route Decision Panel" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "A7. Chaos tests for provider brownouts" --label task --label router --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true

EPIC=$(gh issue create --title "Epic B — Agent Graph Templates (Planner/Executor, Debate, Critique‑Improve, Toolformer)" --label epic --label "agent-graph" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "B1. Agent Graph SDK (@maestro/agents)" --label task --label agent-graph --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "B2. Built‑in patterns + YAML recipes" --label task --label agent-graph --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "B3. HITL widget in UI (Approve/Edit/Block)" --label task --label agent-graph --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "B4. Cost preview & SLO burn forecast" --label task --label agent-graph --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "B5. Persist/restore checkpoints" --label task --label agent-graph --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "B6. Policy hooks on transitions (OPA)" --label task --label agent-graph --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true

EPIC=$(gh issue create --title "Epic C — vLLM + Ray Serve Inference Lane (High‑Utilization Serving)" --label epic --label "serving" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "C1. Ray cluster Helm chart + GPU selectors" --label task --label serving --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "C2. vLLM images with quantization presets" --label task --label serving --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "C3. Batching knobs exposed to Maestro" --label task --label serving --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "C4. Telemetry export: queue depth, batch size, p95" --label task --label serving --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "C5. Health checks + request shedding; spillover" --label task --label serving --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true

EPIC=$(gh issue create --title "Epic D — EvalOps (Golden Tasks, Scorecards, Autonomy Gating)" --label epic --label "evalops" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "D1. Eval runner lib + provider adapters" --label task --label evalops --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "D2. Datasets versioning + manifests" --label task --label evalops --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "D3. Scorecard UI with trendlines" --label task --label evalops --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "D4. Autonomy gate: L2→L3 requires pass" --label task --label evalops --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true

EPIC=$(gh issue create --title "Epic E — OpenTelemetry Normalization (Traces, Metrics, Logs)" --label epic --label "otel" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "E1. OTEL SDK wrappers in Maestro packages" --label task --label otel --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "E2. Collector Helm values & exporters" --label task --label otel --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "E3. Grafana dashboards JSONs" --label task --label otel --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "E4. Alert rules for error budget & backpressure" --label task --label otel --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true

EPIC=$(gh issue create --title "Epic F — Progressive Delivery (Canary + Auto‑Rollback) for Agents & Prompts" --label epic --label "canary" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "F1. Package agent/prompt versions as OCI w/ provenance" --label task --label canary --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "F2. Canary analysis templates (eval+SLO)" --label task --label canary --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "F3. UI Version Switcher & audit log" --label task --label canary --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "F4. Auto‑rollback + Slack/ticket updates" --label task --label canary --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true

EPIC=$(gh issue create --title "Epic G — Asset Graph for Everything (Optional)" --label epic --label "docs" --body "**Problem**: See PRD section 7.
**Goals**: See PRD section 2.
**Acceptance Criteria**: See PRD section 12 & 8.
**Links**: PRD in repo/canvas." --json number,url) 
EPIC_NUM=$(echo "$EPIC" | jq -r .number)
echo "Epic #${EPIC_NUM}"
TASKS=""
TJ=$(gh issue create --title "G1. Asset registry schema + UI graph" --label task --label docs --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
TJ=$(gh issue create --title "G2. Drift detection + reconcile jobs" --label task --label docs --body "Parent epic: #${EPIC_NUM}\n\nAcceptance: see epic + PRD." --json number,url) 
TN=$(echo "$TJ" | jq -r .number); echo "  - Task #$TN"; TASKS="$TASKS\n- [ ] #$TN"
gh issue edit "$EPIC_NUM" --body "$(printf '%s\n\n**Tasks**:%s\n' \"$(gh issue view $EPIC_NUM --json body -q .body)\" \"$TASKS\")" >/dev/null || true
