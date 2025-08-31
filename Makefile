# ---------- Conductor Monorepo Makefile (resolved) ----------
SHELL := /bin/bash
.DEFAULT_GOAL := help

# --- Variables ---
PY  ?= python3
LOG ?= runs/offline-replay.jsonl
OUT ?= reports

# Detect package managers if you need build/test hooks later
NPM ?= npm
PNPM ?= pnpm

# --- Phony targets ---
.PHONY: help build test lint format clean \
        offline-eval offline-eval-large

# --- Help ---
help:
	@printf "%s\n" \
"Conductor Make targets:" \
"  make build              # build (placeholder; wire to your stack)" \
"  make test               # run tests (placeholder)" \
"  make lint               # lint (placeholder)" \
"  make format             # format (placeholder)" \
"  make clean              # clean artifacts" \
"  make offline-eval       # run IPS/DR evaluator on sample or LOG=<path>" \
"  make offline-eval-large LOG=<path>  # big replay run"

# --- Build/Test hooks (safe placeholders; customize as needed) ---
build:
	@echo ">> build: wire this to your repo (e.g., $(PNPM) -w -r build)"

test:
	@echo ">> test: wire this to your repo (e.g., $(PNPM) -w -r test)"

lint:
	@echo ">> lint: wire this to your repo (e.g., $(PNPM) -w -r lint)"

format:
	@echo ">> format: wire this to your repo (e.g., $(PNPM) -w -r format)"

clean:
	@echo ">> clean: removing temp artifacts"
	@server/src/tests/entityResolution.normalization.test.ts -rf "$(OUT)" 2>/dev/null || true

# --- Offline evaluator (ready now) ---
offline-eval:
	@mkdir -p "$(OUT)"
	$(PY) services/analytics/simulator/offline_eval.py \
	--log "$(LOG)" \
	--out "$(OUT)"

# Usage: make offline-eval-large LOG=runs/my.jsonl OUT=reports
offline-eval-large:
	@mkdir -p "$(OUT)"
	$(PY) services/analytics/simulator/offline_eval.py \
	--log "$(LOG)" \
	--out "$(OUT)"
# ---------- end ----------