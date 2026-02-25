# Summit IntelGraph Platform v5.0.0-rc.1 Release Notes

**Release Date:** 2026-02-25
**Release Type:** Release Candidate (RC1) for General Availability
**Previous Version:** v4.2.3
**Integration Branch:** `claude/merge-prs-ga-release-XjiVk`

---

## Overview

Summit IntelGraph Platform v5.0.0 is a major release incorporating **597 pull requests** from 5 contributors, representing the largest single integration in the project's history. This release delivers substantial expansions across AI-augmented intelligence analysis, multi-agent orchestration, governance automation, and supply-chain security.

### Release Highlights

- **170 new features** spanning GraphRAG, agent orchestration, OSINT connectors, and cognitive security
- **89 security & governance enhancements** including RBAC hardening, evidence verification, and compliance frameworks
- **74 infrastructure improvements** to CI/CD, deployment pipelines, and workflow automation
- **13 dependency upgrades** including security-critical Dependabot patches
- **29 bug fixes** addressing XSS, authorization, path traversal, and data integrity issues

---

## Major Features

### GraphRAG & Knowledge Graph

- Modular GraphRAG pipeline with hybrid retrieval and community detection (#17242, #17250)
- Neo4j vector indexes and real-time stream processing (#17220, #17246)
- Temporal graph reasoning and temporally-aware entity extraction (#17245, #17248)
- Semantic-aware chunking subsystem (#17257)
- Multi-region GraphRAG architecture (#17229)
- LightRAG indexing optimizations and dual-level retrieval (#17223)
- Elasticsearch GraphRAG backend (#17235)
- NebulaGraph Fusion GraphRAG scaffolding (#17232)
- Incremental graph update foundation (#17230)
- Narrative analysis and information operations primitives (#17823, #17838)

### Multi-Agent Orchestration

- Summit Swarm initial scaffolding (#17579)
- Agent orchestrator with modes, router, and policy gates (#17919)
- Dual reasoning loop scaffold with feature flag (#17909)
- GitHub Agent HQ integration pack (#17897)
- MARS Reflective Search Architecture (#17922)
- Team orchestration with deterministic artifacts (#17940)
- Merge Manager Agent directive and local tooling (#17867)
- Safe local model execution sandbox (#17873)
- FS-Researcher subsumption (#17923)

### OSINT & Intelligence

- SYNINT OSINT connector with GraphQL mutation and MCP tool (#17807)
- Platform watch capability for competitive intelligence (#17814, #17815)
- Adaptive Influence & Swarm Detection System (#18355)
- Cognitive Security Fusion Pack (#18307)
- Cognitive Ops Campaign Graph (#18309)
- Adaptive Tradecraft Graph (ATG) v1 (#18030)
- Sheepdip detector package (#17953)
- CTI evidence schema and claim registry (#17816)

### MCP & Protocol

- gRPC transport with policy receipts and transport negotiation (#17769)
- MCP manifest and catalog parser with deterministic hashing (#17878)
- MCP-first agent platform signals (#17973)
- SummitContext and MCP Governance (#17883)
- Context Pack schema, validation, and deterministic stamps (#17997)

### Evidence & Provenance

- Evidence Contract and Stamp.json implementation (#17971)
- Evidence Bundle standard (#17821)
- Deterministic lineage/provenance automation (#16434)
- Forensic lineage trace architecture (#17231)
- Lineage Collector and Debezium 3.4 config (#17334)
- Evidence timestamp guard with runtime stamp.json (#17990)
- Run Integrity Gate (#17842)

### AI & ML Capabilities

- SAGE Self-Hinting for GRPO (#17920)
- UPLiFT Feature Upsampling Subsystem (#17243)
- Competitive Intelligence Protocol (#17279)
- Maltego Subsumption Engine v4.1 (#17274)
- OpenAI Responses migration tools & MCP server skeleton (#17560)
- WideSeek-R1 subsumption (#17921)
- Fine-Grained ContextBundle schema and types (#17933)
- BioSeq promoter activity and ISM evaluation scaffolding (#17931)

### Platform & Infrastructure

- Week 1 Multi-Product Scaffolding (#17652)
- FactAPI Pro MWS (#17653)
- AgentKit framework scaffold (#17203)
- Personal Brand Storytelling Module (#17619)
- Deprecation-aware provider layer (#17820)
- Google Developer Knowledge connector (#17935)

---

## Security & Governance

### Critical Fixes

- **[CRITICAL]** Fix insecure signature verification in InboundAlertService (#17890)
- **[HIGH]** Fix Stored XSS in IntelligentCopilot (#18063)
- **[HIGH]** Harden authorization and multi-tenant isolation (#17899)
- **[HIGH]** Harden Search Evidence and Auth Middleware (#18322)
- **[HIGH]** Harden evidence search with RBAC and tenant isolation (#18045)
- **[HIGH]** CVE-2026-25145 Melange Path Traversal Remediation (#17972)

### Governance Enhancements

- DAE, AEG, and RTGO governance implementation (#17573)
- OPA-based GovernanceVerdict CI gate (#17979)
- Governance Operations Plane Foundation (#18168)
- Deny-by-default OPA preflight with per-env allowlists (#17980)
- Authoritative policy registry for GA release gating (#17974)
- GA assurance snapshot pipeline scaffolding (#17985)
- CI/CD Security Governance Verdict System (#18006)
- Action pinning preflight gate (#18233)
- Sigstore bundle-first supply-chain governance spec (#18302)
- SBOM governance and melange mitigation (#18026)

### Compliance

- EU Omnibus 2026 Regulatory Signals and Evidence Packs (#17813)
- BYO-AI app governance lane (#17808, #17812)
- Regulatory Controls Pack pipeline (#17877)
- CI/CD signal delta action register (SSDF, OSPS, SLSA, ISO, NIST) (#18089)
- GitHub Actions OIDC to AWS STS hardening guide (#18231)

---

## Bug Fixes

- Harden evidence verifier path and stamp checks (#17283)
- Harden pruning fallback and provenance-aware packing (#17289)
- Harden scheduler recovery with enqueue dedupe (#18057)
- Harden data product exports with tenant scoping (#18267)
- Refine evidence determinism guardrails (#18255)
- De-risk GA merge train (remove broken types, fix governance) (#18310)
- Fix auto-enqueue.yml duplicate configuration key (post-merge fix)

---

## Infrastructure & CI/CD

- Comprehensive Testing Suite & Coverage Pipeline (#18356)
- SBOM merge gate hardening with pinned sbom-action (#17991)
- Sigstore verifier guardrails with pinned Cosign v3.0.2 (#18157)
- Automated Branch Protection & Required Checks Governance (#17325)
- GA readiness parallel tracks (Security, Runtime, Ops) (#18252)
- Security Batch issue template, CIS runbook, and nightly lane labels (#18205)
- Release train dashboard and ops orchestrator (multiple PRs)

---

## Dependencies

- Bump express from 4.21.1 to 4.21.2 (#17329)
- Bump nanoid from 3.3.7 to 3.3.8 (#17330)
- Bump cross-spawn from 7.0.3 to 7.0.6 (#17335)
- Bump cookie from 0.7.1 to 0.7.2 (#17331)
- Bump path-to-regexp from 6.3.0 to 8.2.0 (#17332)
- Bump @babel/traverse from 7.25.9 to 7.26.5 (#17333)
- Plus 7 additional dependency updates

---

## Documentation

- 122 documentation PRs covering playbooks, governance runbooks, architecture docs, and operational guides
- New prompt engineering docs and registry entries
- Expanded agent skills governance runbook
- Cyber threat intel briefs and market analysis
- Comprehensive testing strategy documentation

---

## Migration Guide

### From v4.2.3 to v5.0.0

1. **Node.js**: Requires Node.js v22+ (verified with v22.22.0)
2. **pnpm**: Requires pnpm 10.0.0+
3. **Dependencies**: Run `pnpm install` after updating
4. **Environment**: Review new OPA policy configs if using governance gates
5. **Feature Flags**: Several new features are behind feature flags — review `config/` for new flag definitions

### Breaking Changes

- Package version bump from 4.2.3 to 5.0.0
- New governance verdict system may affect existing CI/CD pipelines
- Updated RBAC model with stricter tenant isolation

---

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| TypeScript type errors in services/graph-core | Medium | Pre-existing; missing type definitions |
| ESLint missing @eslint/js package | Low | Pre-existing; lint config issue |
| Jest missing ts-jest/presets/default-esm | Low | Pre-existing; test preset |
| Docker-dependent tests require running stack | Medium | test:smoke, health checks |

---

## Validation Summary

| Check | Result |
|-------|--------|
| test:quick | PASS |
| build:server | PASS |
| check:governance | PASS |
| security:check | PASS |
| format:check | PASS |
| check:jest-config | PASS |
| lint:cjs | PASS |
| partners:check | PASS |
| ci:evidence-id-consistency | PASS |
| verify:living-documents | PASS |
| ga:smoke | PASS |
| test:release-bundle-sdk | PASS |

---

## Contributors

| Contributor | PRs | Role |
|-------------|----:|------|
| @BrianCLong | 573 | Primary author |
| @BrianAtTopicality | 11 | Security hardening |
| @dependabot[bot] | 10 | Dependency automation |
| @TopicalitySummit | 2 | Documentation |
| @google-labs-jules[bot] | 1 | Lineage automation |

---

## What's Next

- [ ] Security review of 28 Tier 7 (Security/Governance) PRs
- [ ] Full regression suite in CI/CD environment
- [ ] Staging deployment and smoke testing
- [ ] Promote to v5.0.0-GA after validation
- [ ] Production canary deployment

---

**Full Changelog:** See `docs/ga-merge-train/CHANGELOG-v5.0.0.md`
**Merge Assessment:** See `docs/ga-merge-train/GA-MERGE-ASSESSMENT.md`
