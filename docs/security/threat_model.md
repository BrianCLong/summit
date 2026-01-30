# Repo Defense Plane (RDP) Threat Model

**ITEMSLUG**: `GITHUB_ESPIONAGE`
**Status**: ACTIVE
**Last Updated**: 2026-01-24

## 1. Overview

This threat model addresses rising cyber-espionage and supply-chain threats targeting GitHub-hosted software development. It specifically focuses on social engineering, malicious dependencies, and GitHub Actions/workflow abuse, amplified by AI-assisted/agentic developer workflows.

## 2. Threat Landscape

### T1 — Social Engineering → Dev Workstation Compromise → Repo Compromise
- **Vectors**: Fake job/assignment repos, "open this project" style lures, VS Code task abuse, malicious extensions.
- **Impact**: Attacker gains local environment access, steals credentials (PATs, SSH keys), and can push malicious code or exfiltrate sensitive data.

### T2 — Malicious Dependency / Lockfile Drift
- **Vectors**: npm/PyPI compromise, maintainer takeover, transitive payloads, typosquatting. AI agents may "helpfully" add or update packages without sufficient vetting.
- **Impact**: Remote code execution (RCE) in CI/CD or production environments; data exfiltration via malicious post-install scripts.

### T3 — GitHub Actions Secrets Exfiltration
- **Vectors**: Malicious workflow commits, PRs from forks triggering workflows with secrets, credential theft via `actions/checkout` or environment dumping.
- **Impact**: Mass theft of cloud credentials, PATs, and other repository secrets. (Ref: GhostAction campaign).

### T4 — Token Sprawl from Agentic Tooling
- **Vectors**: Long-lived PATs in local environments, automation credentials, copied `.env` files, credentials in chat/build logs.
- **Impact**: Increased attack surface; compromise of one tool leads to wider platform access.

### T5 — Repo Integrity Erosion
- **Vectors**: Backdoored commits, base64 blobs, "generated" PRs with obfuscated logic, compromised maintainer accounts.
- **Impact**: Loss of trust in the codebase; persistent backdoors in the software supply chain.

## 3. Defensive Strategy: Repo Defense Plane (RDP)

Summit implements a multi-lane defense strategy to mitigate these threats.

### Lane 1: Foundation (Always ON)
- **Workflow Change Gate**: Mandatory security acknowledgement and CODEOWNER approval for all `.github/workflows/**` changes.
- **Secret Leak Scanning**: CI-integrated scanning for high-entropy secrets and known key patterns.
- **Dependency Controls**: Allowlist-based dependency management and lockfile integrity verification.

### Lane 2: Innovation (Flagged OFF by Default)
- **Agent Least-Authority Profiles (ALAP)**: Explicitly defined scopes for AI agents (deps, workflows, releases).
- **Suspicious Diff Heuristics**: Detection of base64 blobs, new executables, and obfuscated scripts.
- **Actions Hardening**: Enforced OIDC, minimal permissions, and commit-SHA pinning for all actions.

## 4. Requirement Matrix

| Threat | Control | Gate | Evidence ID |
| --- | --- | --- | --- |
| T1 (Social Eng) | Devcontainer/VM Sandbox | Policy/Doc | EVD-GITHUB_ESPIONAGE-SCHEMA-001 |
| T2 (Malicious Deps) | Allowlist + Delta Doc | `GATE-DEPS-DELTA` | EVD-GITHUB_ESPIONAGE-DEPS-001 |
| T3 (WF Secret Theft)| Fork Safety + OIDC | `GATE-PR-FORK-EXEC` | EVD-GITHUB_ESPIONAGE-ACTIONS-001 |
| T4 (Token Sprawl) | ALAP / Short-lived tokens | `GATE-ALAP` | EVD-GITHUB_ESPIONAGE-ALAP-001 |
| T5 (Integrity) | Suspicious Diff Alerts | `GATE-SUSPICIOUS-DIFF`| EVD-GITHUB_ESPIONAGE-HEUR-001 |

## 5. Harvestable Lessons
- **Workflow security is first-class supply-chain security.**
- **Secret exfiltration is the primary win condition for attackers.**
- **AI-assisted changes need automated guardrails.**
