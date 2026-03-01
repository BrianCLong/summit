# Subsumption Plan: Claude Skills and Subagents

## 1. Core Thesis
The article "Claude Skills and Subagents: Escaping the Prompt Engineering Hamster Wheel" states that static prompt engineering is not a scalable architecture for production AI systems. The future requires:
- **Skills** (reusable, structured capabilities)
- **Subagents** (specialized, scoped agent instances)
- **Composable agent systems**

Rather than endlessly tuning monolithic prompts, Summit should design **agentic systems with modular execution and separation of concerns**.

## 2. The "Prompt Engineering Hamster Wheel" Problem
The structural issues identified in the article are:
- **Long, fragile prompts:** Small changes cause regressions.
- **Instruction drift:** Hard to reason about emergent behavior.
- **Context overload:** Token limits and degraded performance.
- **Hidden coupling:** Logic buried in prompt text.
- **No reusability:** Everything rewritten per task.

**Key Insight:** Prompt engineering centralizes too much logic inside opaque text blobs.

## 3. Claude Skills (Conceptual Model)
"Skills" are structured capabilities that move AI from **prompt scripting → software architecture**.
In the Summit platform, skills must:
- Have defined, deterministic inputs and outputs.
- Perform a narrow task (e.g., `summarize_document`, `extract_entities`, `generate_sql`).
- Be invoked programmatically (tool boundary gates).
- Be testable and reusable, with evidence bundles.

## 4. Subagents
Subagents in Summit should be:
- Independently scoped LLM instances given a focused role.
- Operated with limited context to reduce bloat.
- Returning structured output to a parent agent.
For example, instead of an overloaded agent, use a Planner agent, Research agent, Validation agent, and Execution agent. This provides separation of reasoning, easier debugging, and modular scaling.

## 5. Architectural Shift
The shift aligns with Summit's Provable Intelligence and Minimal Proof Moat model:
**From ❌ Prompt-Centric Systems:** Monolithic, opaque, hard to test, hard to evolve.
**To ✅ Agentic Systems with Skills + Subagents:** Modular, observable, testable, extensible, easier to benchmark.

## 6. Production Implications
Implementing this architecture in Summit will:
- Reduce regression risk.
- Improve reliability.
- Enable composability.
- Support our evaluation frameworks (Provable Action Latency).
- Allow versioning of capabilities (Prompt Registry).

## 7. Derived Implicit Design Patterns
1. Capability isolation
2. Contract-based skill invocation
3. Typed outputs (JSON schemas, EVID tags)
4. Orchestrator pattern
5. Layered agent design
6. Structured evaluation loops
7. State passing between agents

## 8. Strategic Insight
Winning AI systems rely on the cleanest architectures, not the cleverest prompts. This mirrors software engineering shifts from monoliths to microservices, and from implicit logic to typed APIs. In Summit, this supports our strict Governance Scribe, Evidence Bundling, and deterministic artifact generation.
