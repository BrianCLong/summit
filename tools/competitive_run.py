#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path

# Scaffolding content
SYSTEM_MAP_CONTENT = """# System Map: {target}

## Architecture

* [Describe services, data stores, queues, runtimes]

## Interfaces

* [APIs, webhooks, SDKs, CLI]

## Deployment

* [Cloud/self-host, k8s/compose, tenancy]

## Operational Loops

* [Ingestion, enrichment, search, export, alerting]
"""

PATTERNS_CONTENT = """# Pattern Harvest: {target}

## Decomposition & Boundaries

* [Modules, packages, services]

## Failure Semantics

* [Retries, idempotency, circuit breakers]

## Data Flow

* [Event sourcing vs CRUD, ETL/ELT]

## Test & Release

* [Test strategy, gating]
"""

AGENTS_CONTENT = """# Agent & AI Mechanics: {target}

## Tooling Interface

* [Tools, schemas, permissions]

## Orchestration

* [Planner/executor, roles]

## Prompt Patterns

* [Templates, routing, evals]

## RAG Shape

* [Retriever, reranker, chunking]
"""

KG_CONTENT = """# KG & Data Engineering: {target}

## Entity Model

* [Entities, relationships]

## Entity Resolution

* [Dedupe strategy]

## Graph Patterns

* [Query, traversal]

## Vector Strategy

* [Embeddings, search, scoring]
"""

UX_CONTENT = """# UX & Workflow Analysis: {target}

## Journeys

* [OSINT, analyst, reporting]

## Collaboration

* [Sharing, review, audit]

## Export/Interop

* [STIX/TAXII, CSV, graph]

## Friction Points

* [Time-to-first-value]
"""

RISK_CONTENT = """# Risk Readout: {target}

## Security Posture

* [AuthN/AuthZ, secrets, isolation]

## Attack Surface

* [Tool execution, prompt injection]

## Supply Chain

* [Deps, provenance, SBOM]
"""

COMPATIBILITY_CONTENT = """# Compatibility Matrix: {target}

## Graph Stack

* [Neo4j/Postgres/GraphRAG]

## Agent Spine

* [Jules/Codex/Observer]

## Ingestion

* [Connector SDK]

## Ops Stack

* [CI, provenance, audit]
"""

BACKLOG_CONTENT = """# Integration Backlog: {target}

- [ ] Item 1 (P0, Effort: S, Risk: Low)
  - Evidence: [Test/Eval]
"""

PR_STACK_CONTENT = """# PR Stack Plan: {target}

## PR1: Documentation & Gates
- [ ] Docs committed
- [ ] Backlog defined

## PR2: Minimal Slice
- [ ] Core implementation
- [ ] Feature flags

## PR3: Evals
- [ ] Eval harness
- [ ] Benchmarks

## PR4: Security
- [ ] Permission gates
- [ ] Audit hooks

## PR5: Moats
- [ ] Differentiators
"""

TRANSCENDENCE_CONTENT = """# Transcendence Design: {target}

## Governance Upgrades

* [Policy-as-code]

## Determinism

* [Evidence pipeline]

## Separation of Duties

* [Multi-agent roles]

## Typed Contracts

* [Tool schemas]
"""

SECURITY_GATES_CONTENT = """# Security Gates: {target}

## Tool Permissioning

* [Scoped tokens]

## Sandbox

* [Allowlist]

## Prompt Hardening

* [Injection defense]

## Audit Logging

* [Who/what/when/why]
"""

MOATS_CONTENT = """# Platform Moats: {target}

## Marketplace

* [Contracts, signing]

## Provenance

* [Lineage, confidence]

## Governance

* [RBAC, compliance]

## Performance

* [Hybrid retrieval, caching]
"""

def create_file(path, content):
    p = Path(path)
    if p.exists():
        print(f"Skipping existing file: {path}")
        return

    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w") as f:
        f.write(content)
    print(f"Created: {path}")

def cmd_init(args):
    target = args.target_slug
    print(f"Initializing competitive run for target: {target}")

    # Define file mappings
    files = {
        f"docs/competitive/{target}/system_map.md": SYSTEM_MAP_CONTENT,
        f"docs/competitive/{target}/patterns.md": PATTERNS_CONTENT,
        f"docs/competitive/{target}/agents_and_rag.md": AGENTS_CONTENT,
        f"docs/competitive/{target}/kg_and_data.md": KG_CONTENT,
        f"docs/competitive/{target}/ux_workflows.md": UX_CONTENT,
        f"docs/competitive/{target}/risk_readout.md": RISK_CONTENT,
        f"docs/competitive/{target}/compatibility_matrix.md": COMPATIBILITY_CONTENT,
        f"docs/competitive/{target}/integration_backlog.yml": BACKLOG_CONTENT,
        f"docs/competitive/{target}/pr_stack_plan.md": PR_STACK_CONTENT,
        f"docs/competitive/{target}/transcendence_design.md": TRANSCENDENCE_CONTENT,
        f"docs/security/{target}_gates.md": SECURITY_GATES_CONTENT,
        f"docs/strategy/{target}_moats.md": MOATS_CONTENT,
    }

    for path, content in files.items():
        create_file(path, content.format(target=target))

    print("\nInitialization complete. Next steps:")
    print(f"1. Fill out docs/competitive/{target}/system_map.md")
    print(f"2. Run 'python3 tools/competitive_run.py validate {target}'")

def cmd_validate(args):
    target = args.target_slug
    print(f"Validating competitive run for target: {target}")

    required_files = [
        f"docs/competitive/{target}/system_map.md",
        f"docs/competitive/{target}/patterns.md",
        f"docs/competitive/{target}/agents_and_rag.md",
        f"docs/competitive/{target}/kg_and_data.md",
        f"docs/competitive/{target}/ux_workflows.md",
        f"docs/competitive/{target}/risk_readout.md",
        f"docs/competitive/{target}/compatibility_matrix.md",
        f"docs/competitive/{target}/integration_backlog.yml",
        f"docs/competitive/{target}/pr_stack_plan.md",
        f"docs/competitive/{target}/transcendence_design.md",
        f"docs/security/{target}_gates.md",
        f"docs/strategy/{target}_moats.md",
    ]

    missing = []
    for path in required_files:
        if not Path(path).exists():
            missing.append(path)

    if missing:
        print("Validation FAILED. Missing files:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)
    else:
        print("Validation PASSED. All required artifacts exist.")

def main():
    parser = argparse.ArgumentParser(description="Summit Competitive Intelligence Run Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize a new competitive run")
    init_parser.add_argument("target_slug", help="Slug for the target (e.g., 'competitor-x')")
    init_parser.set_defaults(func=cmd_init)

    val_parser = subparsers.add_parser("validate", help="Validate artifacts for a run")
    val_parser.add_argument("target_slug", help="Slug for the target")
    val_parser.set_defaults(func=cmd_validate)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
