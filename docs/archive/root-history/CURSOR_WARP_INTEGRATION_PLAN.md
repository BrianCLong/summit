# Cursor & Warp Capability Integration Blueprint

## Executive Summary
This document outlines an actionable roadmap for incrementally incorporating Cursor and Warp IDE capabilities into Summit's build, developer experience (DevEx), and software engineering intelligence ecosystems. The approach prioritizes staged enablement, observability, and guardrails to ensure adoption without destabilizing delivery pipelines.

## Objectives
- Provide AI-assisted code intelligence (Cursor) inside existing Summit workflows without displacing required compliance and review checkpoints.
- Introduce Warp's modern terminal automation, workflow sharing, and collaborative command execution in a manner that complements current Justfile-based operations.
- Extend Summit's telemetry and intelligence surfaces so activity originating from Cursor and Warp is measurable, auditable, and can feed existing engineering intelligence systems.

## Integration Pillars

### 1. Build Systems
- **IDE Command Palette Bridge**: Expose npm/turbo build recipes and Docker compose scripts through Cursor's task runner API via a lightweight extension that proxies to `npm run`/`just` commands.
- **Context-Aware Build Recommendations**: Surface build caching guidance in Cursor using repo metadata (e.g., `turbo.json`, `tsconfig` files) to recommend incremental builds and highlight required environment variables.
- **Warp Workflows for Builds**: Encode common build permutations (local, CI parity, Docker) as Warp Workflows, parameterized with environment profiles stored in `./ops/build-profiles.yaml` (new artifact) and synchronized to the repo.

### 2. Developer Experience (DevEx)
- **Shared Workspace Templates**: Publish Cursor project templates that pre-load Summit coding standards, AGENTS guidelines, and lint configurations. Templates would live under `./docs/devex/cursor-templates/`.
- **Terminal Automation**: Map recurring DevEx tasks (dependency refresh, bootstrap scripts, environment validation) to Warp Workflows with inline documentation. Provide direct links from CONTRIBUTING.md.
- **Pairing & Replay**: Leverage Warp's block sharing to capture complex debugging sessions and feed them into Summit's knowledge base (`docs/devex/playbooks/`).

### 3. Software Engineering Intelligence
- **Event Ingestion**: Emit structured events from Cursor extensions and Warp workflows into Summit's internal event bus (`ga-graphai/packages/prov-ledger`). Include metadata: user, command, repo path, success/failure.
- **Telemetry Dashboards**: Extend existing GA GraphAI observability dashboards to display adoption metrics, build success correlation, and time-to-feedback trends for AI-assisted interactions.
- **Policy Enforcement Hooks**: Integrate with `services/authz-gateway` to require policy acceptance before enabling advanced AI suggestions and ensure generated patches still route through mandated review flows.

## Implementation Phases

1. **Discovery & Enablement (Weeks 0-2)**
   - Inventory current build tasks, DevEx rituals, and telemetry touchpoints.
   - Define MVP Cursor plugin scope (build commands + lint support).
   - Prototype Warp workflows for bootstrap + local build.

2. **Pilot (Weeks 3-6)**
   - Onboard a single squad using feature flags via `ops/feature-flags.yaml`.
   - Capture feedback through daily Warp block exports and Cursor usage logs.
   - Harden observability ingestion path with synthetic events.

3. **Scale Out (Weeks 7-10)**
   - Promote templates/workflows to default developer onboarding packages.
   - Automate Warp workflow distribution via repo sync and CLI installer script.
   - Integrate telemetry dashboards into weekly engineering reviews.

4. **Optimization (Weeks 11+)**
   - Tune AI prompt libraries, caching strategies, and GPU resource allocation.
   - Expand to automated code review suggestions, multi-repo builds, and outage simulations guided by Cursor agents.
   - Continuously evaluate compliance, audit logging, and ROI metrics.

## Dependencies & Risks
- **Security Review**: Third-party tools must pass Summit's supply chain policy. Engage security early to vet Cursor/Warp binaries and API usage.
- **Change Management**: Provide extensive training, office hours, and rollback plans to minimize disruption.
- **Network & Licensing**: Ensure enterprise licensing covers peak concurrency; coordinate with IT for proxy/firewall adjustments.

## Success Metrics
- ≥70% of targeted squads using at least one Cursor-assisted build action weekly.
- 30% reduction in time-to-green for local build/test cycles.
- Documented Warp workflows covering 90% of high-frequency DevEx tasks.
- Telemetry coverage capturing ≥95% of AI-assisted build invocations with <1% ingestion error rate.

## Next Actions
1. Form cross-functional tiger team (DevEx, Build, Security, Intelligence).
2. Draft detailed Cursor extension spec referencing Summit command catalog.
3. Author initial Warp workflow YAML files and distribute to pilot squad.
4. Schedule security and compliance reviews; define success guardrails.
