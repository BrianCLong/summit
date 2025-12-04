# Product Brief: Summit Reasoning Evaluator (SRE)

## 1. Executive Summary
SRE is the first "White-Box" evaluation platform for agentic AI. While competitors (LangSmith, Arize) focus on *observing* what happened, SRE focuses on *grading the reasoning process* itself using a proprietary Graph-based methodology. It is designed to be sold as a standalone SDK for LLM developers and as a premium compliance module for Enterprise users.

## 2. Product Units

### A. SRE SDK (Open Core)
*   **Description**: Python library + CLI for local evaluation.
*   **License**: MIT (Core schema/runners) + Polyform (Advanced metrics).
*   **Value**: "Pytest for Agents". Runs in CI/CD.
*   **Target**: Individual developers, AI Engineers.

### B. SRE Enterprise (SaaS / Self-Hosted)
*   **Description**: Hosted dashboard for long-term capability tracking, "Curriculum" management, and Team collaboration.
*   **Value**: "Audit Trail for Agency". Proving to stakeholders that the agent is improving and safe.
*   **Target**: Enterprise AI teams, Compliance Officers.

### C. Summit Integration (OEM)
*   **Description**: Deep integration into the Summit Orchestrator.
*   **Value**: "Continuous Improvement". Automatically turns production traces into evaluation test cases.

## 3. Target Segments
1.  **LLM Infra Vendors**: (e.g., Vector DBs, Model Hosts) needing to prove their infra improves agent performance.
2.  **Regulated Enterprises**: (Finance, Healthcare) needing "Explainable Evals" (Why did it fail? Was the logic sound?).
3.  **Foundation Model Labs**: Needing better signal than "MMLU accuracy" for reasoning model fine-tuning.

## 4. Value Propositions
*   **Process > Outcome**: Don't just check if the answer is "42". Check if the math used to get there was valid.
*   **Dynamic Hardening**: The "Curriculum" feature finds breaking points automatically, saving manual red-teaming effort.
*   **Standardized Provenance**: The JSONL Graph Schema becomes the standard interchange format for reasoning traces.

## 5. Pricing Sketches
*   **SDK**: Free (MIT).
*   **SRE SaaS**: $50/seat/month + Usage ($0.01 per eval step).
*   **OEM License**: Custom pricing for integrating SRE into internal platforms (e.g., $50k/year base).

## 6. Strategic Hooks
*   **OpenTelemetry**: Emit SRE traces as OTel spans to capture existing market share.
*   **MLOps Standards**: Position SRE metrics as standard "Model Cards" for Agents.
