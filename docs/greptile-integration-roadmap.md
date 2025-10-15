# Greptile Integration Roadmap

## Overview
Greptile adds an AI-driven code review layer that complements Summit (IntelGraph) by generating full codebase context, actionable review comments, and live collaboration experiences. This roadmap captures the scope surfaced in the recent comparison exercise and converts it into actionable follow-up workstreams.

## Capability Alignment
- **Contextual Code Graphs** – Import Greptile’s repository maps to extend Summit graph analytics beyond investigation data and unlock richer code intelligence.
- **Automated PR Reviews** – Trigger Greptile reviews inside existing CI/CD flows so Maestro Conductor can enforce quality gates without manual reviewer bottlenecks.
- **Adaptive Feedback Loops** – Capture thumbs-up/down feedback, store it in Summit telemetry, and push the signals back to Greptile to personalize future reviews.
- **Interactive Review Threads** – Embed the `@greptileai` conversational loop inside Summit’s React diff viewer and IDE extensions to keep discussions and fixes close to the code.
- **Visual Summaries** – Surface Greptile mermaid diagrams, confidence scores, and scoped review reports alongside Summit’s investigation narratives.
- **Enterprise Posture** – Map shared SOC2/GDPR controls, encryption paths, and audit logging so Greptile data flows inherit existing compliance guarantees.

## Phase Plan
1. **API & Webhook Connectivity**
   - Establish OAuth-protected connectors to pull review summaries, inline comments, suggested fixes, and confidence telemetry.
   - Normalize payloads into Summit’s investigation graph schema and persist Greptile review nodes with traceable provenance metadata.
   - Subscribe to webhook topics for new reviews, comment updates, and autofix readiness signals.

2. **Workflow Automation**
   - Extend Maestro Conductor pipelines to request Greptile reviews on PR creation/update events.
   - Fan-in review outcomes to automated risk scoring, auto-merge policies, and autofix application workflows.
   - Attach Greptile insights to investigation graphs so analysts see review data in the same workspace.

3. **UI & IDE Embedding**
   - Add Summit UI components that render line-level Greptile comments, review summaries, and thumbs-up/down reactions in real time via WebSockets.
   - Update VS Code/JetBrains extensions to stream `@greptileai` chat commands, inline fixes, and follow-up prompts alongside Summit agents.

4. **Feedback & Learning Loop**
   - Store developer reactions, manual overrides, and policy outcomes for every Greptile comment.
   - Provide scheduled jobs that aggregate the feedback and forward tuned preferences to Greptile reinforcement endpoints.
   - Maintain configurable style/rule packs (JSON/YAML) versioned in Summit repos for easy rollback and audit.

5. **Compliance & Reporting**
   - Enrich compliance dashboards with Greptile-derived metrics (defect catch rate, merge velocity, review confidence).
   - Ensure encryption, retention, and audit trails align with Summit’s security posture across transport, storage, and access layers.

## Immediate Next Steps
- Prioritize API connector scaffolding (OAuth client, webhook receiver, schema mapping) and capture open questions for Greptile integration partners.
- Draft Codex UI prompt sequences for each phase to accelerate agent-assisted implementation once resourcing is approved.
- Define success KPIs (bug catch rate lift, merge time reduction, AI feedback adoption) and embed them into Summit observability tooling.
