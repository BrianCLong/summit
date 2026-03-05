# Master Plan: Summit Agent Skill Factory (ASF)

## 1. Context & Motivation
Summit's Agent Control Plane (ACP) and TMAML provide the foundational runtime and memory for agents. The next step is a self-improvement loop: the Agent Skill Factory (ASF).
This initiative transforms agents from static executors into a compounding ecosystem where they discover, refine, and promote capabilities as first-class, versioned "Skills."

## 2. Architecture & Components

### 2.1 Skill Model & Registry (`summit/skills/`, `summit/registry/`)
- Define the `Skill` model (name, signatures, preconditions, tests).
- Build the Skill Registry to allow ACP agents to query, discover, and invoke skills as portable MCP-addressable artifacts.

### 2.2 Autonomous Skill Discovery & Refinement (`summit/skillforge/`)
- Implement the discovery loop parsing TMAML episodic memories to identify common trajectory patterns.
- Propose skills using LLM tool-making patterns.
- Add evaluation (AEGS-driven) for robustness and safety.
- Introduce curriculum generation for underperforming skills.

### 2.3 Governed Promotion Pipeline (`summit/skills/runtime/`, `docs/governance/`)
- Implement lifecycle states: `experimental -> staged -> production -> deprecated`.
- Enforce lineage, evaluation scores, and human review for high-risk domain promotions.
- Enforce environment governance rules per tenant.

### 2.4 Runtime Integration with ACP & TMAML (`summit/acp/`, `summit/agentloop/`)
- Extend the ACP to invoke discovered skills via the registry.
- Enable chaining into playbooks.
- Feed execution telemetry back into TMAML for regression testing and continuous learning.

## 3. Sub-Agent Prompts
To be placed in `prompts/architecture/asf/`.
1. **Discoverer:** Analyzes TMAML logs for skill candidates.
2. **Refiner:** Implements and iteratively refines proposed skills via AEGS feedback.
3. **Evaluator:** Scores skills against safety and robustness benchmarks.
4. **Promoter:** Manages lifecycle states and enforces governance rules.
5. **Orchestrator:** Integrates the registry with ACP and chains skills into playbooks.

## 4. Convergence Protocol
- PRs split into deterministic lanes. No client-side inference in CI.
- All evidence strictly uses `summit.lineage.stamp.v1`.
- Max 7 PRs to merge the entire capability.

## 5. Artifacts
- Skill Schema & `SKILL.md` update.
- Registry Service & ACP integration.
- `summit/skillforge/discovery.py` & `refiner.py`.
- Playbook executor in `summit/agentloop/`.
