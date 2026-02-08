# Prompt: Graph Tech Signal Update Brief (v1)

## Purpose

Produce a Daily Graph Tech & Neo4j Automation incremental signal update brief with evidence-first structure, governance alignment, and deterministic action guidance. Update the roadmap status to reflect publication.

## Required Outputs

1. A brief in `briefs/` titled `Daily Graph Tech & Neo4j Automation — Incremental Signal Update` with:
   * Evidence-first UEF section.
   * Summit Readiness Assertion alignment references.
   * Deterministic actions and MAESTRO threat modeling alignment.
   * Final directive with closure language.
2. Update `docs/roadmap/STATUS.json` to record the brief publication and update `last_updated`.

## Constraints

* Use evidence-first structure; avoid uncertainty language.
* Keep outputs deterministic and audit-friendly.
* No changes outside declared scope.

## Scope

Paths:
- briefs/2026-02-09-graph-tech-signal-update.md
- docs/roadmap/STATUS.json
- prompts/briefs/graph-tech-signal-update@v1.md
- prompts/registry.yaml
- agents/examples/GRAPH_TECH_SIGNAL_UPDATE_20260209.json

Allowed operations: create, edit.

## Verification Tier

Tier C: documentation update with roadmap status update.
