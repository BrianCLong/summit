# CI Guardrails & Policy Hooks

This document outlines the **CI Policy and Governance Guardrails** implemented in `.github/workflows/ci-policy.yml`.

## Purpose
The primary goal is to surface and softly enforce modern SLSA-style source/build requirements and safe GraphRAG/narrative-intel governance practices. It sits as a parallel check during Pull Requests and cron cycles.

## Current Policies Enforced (Warning-Only)

### 1. Dependency Pinning (SLSA Source Requirements)
- **Check**: Scans `.github/workflows/` for uses of unpinned actions (e.g., `actions/checkout@v4`).
- **Reasoning**: Mutable tags can be replaced with malicious commits. SLSA mandates immutable references.
- **Future State**: Flip from warnings to errors when all workflows are pinned via SHAs.

### 2. Least Privilege `permissions`
- **Check**: Detects workflows lacking an explicit `permissions:` block.
- **Reasoning**: Missing permissions default to `write-all` or the repository's default setting, widening the blast radius of any compromised workflow.

### 3. Hardcoded Secret Detection
- **Check**: Looks for obvious patterns of hardcoded tokens (like `ghp_...`).
- **Reasoning**: Secrets must only live in GitHub Actions Secrets or environment variables mapped safely via OIDC.

### 4. GraphRAG / Ontology Change Control
- **Check**: Monitors PR diffs for modifications to files typically involving ontology, schemas, neo4j, or graphs.
- **Reasoning**: Core graph changes have high impact on the narrative intelligence engine. Modifications must be traceable, peer-reviewed, and signed-off by the governance council.

## Why Warning-Only?
We default to warnings initially to avoid breaking normal development velocity and to accommodate gradual transition paths.

**References:**
- SLSA Source Requirements: https://slsa.dev/spec/v1.0/requirements
- GitHub Security Checklists: https://www.reco.ai/hub/github-security-checklist
- GraphRAG RACI: https://graphwise.ai/blog/the-human-layer-in-graphrag-roles-raci-and-the-first-90-days/
