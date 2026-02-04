# Summit Harness Contract

The **Summit Harness** is the high-level, opinionated "Deep Agent" system that orchestrates complex, long-running missions. It wraps the Runtime and SDK with enterprise-grade capabilities for autonomous operation.

## 1. The Planner

The Harness must include a robust planning capability to break down high-level goals into actionable steps.

*   **Task Decomposition:** Automatically break down a complex user request (e.g., "Research this company") into a series of smaller, executable tasks.
*   **Dynamic Re-planning:** If a step fails or new information is discovered, the Harness must automatically adjust the plan.
*   **Goal-Directed:** All actions must be traceable back to the original user intent.

## 2. Task Graph & To-Do Lists

Managing state across a multi-step mission requires structured tracking.

*   **Dependency Management:** Tasks can have dependencies (Task B cannot start until Task A finishes).
*   **Progress Tracking:** Users must have visibility into the current status of the mission (e.g., "3/5 tasks completed").
*   **Persistence:** The task graph is persisted to the Runtime's durable store, allowing missions to pause and resume.

## 3. Subagents & Delegation

For complex missions, a single agent is often insufficient.

*   **Delegation:** A main "Orchestrator" agent can spawn specialized sub-agents (e.g., "Researcher", "Coder") to handle specific sub-tasks.
*   **Budget Controls:** Each sub-agent operates within strict resource limits (tokens, API calls, time) to prevent runaway costs.
*   **Evidence Trails:** Every action taken by a sub-agent is logged and attributed back to the parent task, maintaining a clear chain of custody.

## 4. Workspace & Filesystem

Agents need a place to work and store intermediate results.

*   **Persistent Workspace:** A virtual filesystem where agents can read/write files that persist across sessions.
*   **Sandboxing:** Execution of code or file manipulation must happen in a secure, isolated sandbox to prevent system compromise.
*   **Context Management:** Automatic "folding" of long context windows (summarizing old steps) to keep the agent focused and within token limits.

## 5. Toolchains & Skills

The Harness comes with "batteries included."

*   **Integrated Tool Suites:** Pre-packaged sets of tools for common domains (e.g., coding, research, data analysis).
*   **Skill Management:** Mechanism to dynamically load/unload skills based on the current task or user permissions.
