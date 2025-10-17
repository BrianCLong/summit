# Aikido.dev Integration Plan for Summit (IntelGraph)

## Overview
This document captures the comparative analysis between Aikido.dev and Summit (IntelGraph) and outlines the phased plan to incorporate Aikido.dev security capabilities into Summit's developer operations and orchestration layers.

## Feature Comparison

### Aikido.dev
- **Code Security (ASPM):** AI autofix for SAST, secrets detection, malware scanning, and IaC scanning with noise reduction.
- **Open Source Dependencies:** Software composition analysis, license risk monitoring, outdated dependency detection, SBOM generation.
- **Cloud Security (CSPM):** Agentless VM and container scanning, Kubernetes runtime scanning, misconfiguration detection.
- **Runtime Security:** Runtime protection firewall, threat detection, API rate limiting.
- **Dynamic Testing:** Authenticated DAST with upcoming API discovery/fuzzing and autonomous AI pentesting.
- **Alert Management:** Deduplication, auto-triage with context, and custom rules.
- **Developer Experience:** IDE and CI/CD integrations, Jira/Linear integration, sub-10-minute onboarding.
- **Data Privacy & Security:** Read-only repo access, short-lived tokens, containerized scanning, SOC 2 Type II and ISO 27001 compliance.
- **Reporting & Remediation:** Bulk auto-fix pull requests, vulnerability summaries, streamlined issue assignment.
- **Pricing & Adoption:** Competitive pricing with positive community feedback.

### Summit (IntelGraph)
- **Authentication & Security:** JWT auth, RBAC, OPA policies, rate limiting.
- **Graph Analytics:** Neo4j and TimescaleDB analytics, collaborative graph workflows.
- **AI/ML Intelligence:** Multimodal analytics, AI copilot for investigation queries.
- **Development Operations:** Docker orchestration, CI/CD automation, linting, formatting, type checking.
- **Data Ingestion & Exports:** STIX/TAXII, CSV, semantic search, multi-format exports.
- **Narrative Simulation:** Real-time event injection and rule/LLM-based storytelling.
- **Observability:** OpenTelemetry instrumentation with Prometheus and Grafana dashboards.
- **User Interface:** React frontend with Cytoscape.js visualization and real-time collaboration.
- **API & Integration:** GraphQL, REST, and WebSocket endpoints.
- **Security Compliance:** Protection against code injection, XSS, CSRF; audit logs; encryption; GDPR/SOC 2/NIST alignment.

## Gap Analysis and Opportunities
- **SAST & Secrets Detection:** Integrate Aikido's AI SAST and secrets scanning into Summit CI/CD pipelines.
- **Software Composition Analysis:** Add OSS license and vulnerability scanning plus SBOM generation.
- **IaC Scanning:** Extend infrastructure scanning for Terraform, CloudFormation, and Kubernetes manifests.
- **Container & Runtime Security:** Incorporate container image, runtime scanning, and in-app firewall protections.
- **Dynamic Testing:** Plan for DAST, API discovery, fuzzing, and AI-driven pentesting workflows.
- **AI Autofix:** Enable automated remediation PRs and TL;DR summaries to accelerate fixes.
- **Alert Triage:** Enhance prioritization and false-positive filtering using Aikido auto-triage signals.
- **Developer Experience:** Explore IDE integration and developer-centric workflows inspired by Aikido.
- **Cloud Posture Management:** Integrate CSPM telemetry to identify and remediate misconfigurations.
- **Runtime Protection:** Feed runtime firewall alerts into observability and response automations.
- **Compliance Reporting:** Combine Summit audit data with Aikido insights for enhanced compliance reporting.

## Integration Plan

### Phase 1 — Assessment & API Integration
- Evaluate Aikido APIs, authentication, and webhook capabilities.
- Build backend connectors to ingest SAST, SCA, IaC, and secrets scan results.
- Normalize vulnerability data into Summit's Neo4j graph models with severity and remediation metadata.
- Implement pagination handling, retry logic, and structured logging.

### Phase 2 — Pipeline & Workflow Enhancement
- Embed Aikido scanning steps into Maestro Conductor and CI/CD flows.
- Convert scan results into investigation nodes/edges and trigger automated workflows.
- Surface autofixable vulnerabilities and orchestrate GitHub PR generation.
- Provide project-level configuration for scan scope and autofix policies.

### Phase 3 — UI/UX & Developer Tooling
- Add security dashboards to the React frontend with severity breakdowns and triage controls.
- Deliver inline vulnerability annotations within investigation views and IDE integrations via LSP/webhooks.
- Stream scan and autofix status updates over WebSockets, ensuring accessibility and responsive design.

### Phase 4 — Runtime & Cloud Security
- Integrate runtime firewall and CSPM telemetry, storing events in TimescaleDB and linking to Neo4j entities.
- Update Grafana dashboards with incident trends and risk heatmaps.
- Automate mitigations via Maestro Conductor and enrich narrative simulations with security events.

### Phase 5 — Quality Control & Assurance
- Enforce security gates in CI for critical/high findings and automate regression scenarios.
- Prioritize tests using AI confidence scores and generate risk scoring dashboards.
- Auto-create Jira/Linear tasks with remediation details.

### Phase 6 — Compliance & Reporting
- Aggregate vulnerability and remediation data for SOC 2/GDPR reporting.
- Produce downloadable PDF/JSON reports with audit trail integration and role-based access controls.
- Schedule automated report delivery via email or webhook.

## Success Metrics
- Reduced false positives and alert noise across security tooling.
- Faster vulnerability triage and fix cycles through automation.
- Broader security coverage across code, cloud, and runtime layers.
- Higher developer engagement with actionable security insights.
- Strengthened compliance posture and audit readiness.
