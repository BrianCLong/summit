# Jules Rosetta Stone: The Master Prompt Architecture (MPA)

**Status:** Canonical Reference
**Role:** The Ultimate Unifier
**Version:** 1.0

---

## 🏛️ Prime Directive: The Unified Field of Prompts

**The Master Prompt Architecture (MPA)** is the "Rosetta Stone" of the Summit agent ecosystem. It synthesizes all roles, standards, patterns, and instructions into a single, modular, and extensible language.

### Core Philosophy
1.  **Uniformity:** All prompts share the same DNA. There are no "bespoke" formats.
2.  **Modularity:** Prompts are assembled from reusable, standard components.
3.  **Recursion:** The architecture itself is defined by the patterns it enforces.
4.  **Completeness:** Every prompt must account for Governance, Operations, Security, and Architecture.

---

## 🧱 Universal Primitives

These are the atomic units of the MPA. Every prompt module consists of these primitives.

### 1. The Role Identity `[RoleDeclaration]`
*   **Purpose:** Anchors the agent's persona, context, and authority level.
*   **Format:** "You are [Name], the [Role]. Your mission is [Mission]."

### 2. The Operational Loop `[OperationalLoop]`
*   **Purpose:** Defines the iterative process of execution.
*   **Format:** Explore -> Plan -> Execute -> Verify -> Refine.

### 3. The Constraint Lattice `[Constraints]`
*   **Purpose:** Defines the boundaries of operation (Negative constraints: "Do NOT...").
*   **Format:** Bulleted list of inviolable rules.

### 4. The Output Contract `[OutputContract]`
*   **Purpose:** Specifies exactly what must be delivered.
*   **Format:** Required artifacts, file structures, and quality gates.

### 5. The Self-Reflection Hook `[Reflection]`
*   **Purpose:** Forces the agent to simulate the user/reviewer experience before finalizing.
*   **Format:** "Before submitting, ask: Is this perfect? Does it compile?"

---

## 🧩 Architectural Modules

Modules are higher-level assemblies of primitives.

### 🛡️ Module A: Governance & Standards (The "4th Order" Layer)
*   **Inherits:** `enterprise-4th-order.md`
*   **Responsibilities:** Security, Auditability, Maintainability, Compliance.
*   **Usage:** Mandatory for all Production agents.

### 🧠 Module B: Reasoning Engine
*   **Components:** Chain of Thought, Risk Assessment, Alternative Analysis.
*   **Usage:** Mandatory for Architect and Planner roles.

### ⚡ Module C: Execution Core
*   **Components:** File Operations, Test Generation, Simulation, Verification.
*   **Usage:** Mandatory for Coder and Builder roles.

### 🔄 Module D: Interaction Protocol
*   **Components:** User confirmation steps, PR templates, Clarification loops.
*   **Usage:** Mandatory for Interactive agents.

---

## 🏗️ The Canonical Prompt Structure

All prompts in the Summit ecosystem must follow this structure:

```markdown
# [AGENT NAME] — [ROLE DESCRIPTION]

## 1. IDENTITY & PRIME DIRECTIVE
[RoleDeclaration]

## 2. CONTEXT & SCOPE
[ContextIntegration]

## 3. OPERATIONAL LOOP
[OperationalLoop]

## 4. CONSTRAINTS & STANDARDS
[Constraints]
[GovernanceModule]

## 5. REQUIRED OUTPUTS
[OutputContract]

## 6. REFLECTION & VERIFICATION
[Reflection]
```

---

## 🧬 How to Derive New Prompts

1.  **Select a Base Template** from `prompts/lib/`.
2.  **Import Required Modules** (e.g., "Include the Governance Module").
3.  **Define Specific Constraints** relevant to the task.
4.  **Set the Output Contract**.
5.  **Compile** into the Canonical Structure.

---

## 📚 Prompt Design Language (PDL)

*   **Imperative Mood:** Use strong verbs ("Execute," "Verify," "Enforce").
*   **No Ambiguity:** Avoid "try," "maybe," "should." Use "MUST," "SHALL," "REQUIRED."
*   **Visual Hierarchy:** Use Headers, Bold text, and Lists to guide the LLM's attention.
*   **Self-Correction:** Embed instructions for the agent to fix its own mistakes.

---

## 🔗 The Unification Library

*   `prompts/lib/RoleDeclaration.md`
*   `prompts/lib/OperationalLoop.md`
*   `prompts/lib/StandardsCompliance.md`
*   `prompts/lib/ReasoningScaffold.md`
*   `prompts/lib/OutputContract.md`

---

**This document is the single source of truth for all agent prompt generation.**
