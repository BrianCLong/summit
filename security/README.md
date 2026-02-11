# Repo Defense Plane (RDP) Documentation

## Overview
The Repo Defense Plane (RDP) is a set of security controls designed to protect the Summit repository from supply-chain attacks, credential theft, and unauthorized workflow modifications.

## Modules

### 1. Workflow Security
- **Gate**: `security/gates/gate_workflow_changes.sh`
- **Enforcement**: Blocks PRs that modify `.github/workflows/` without a `SECURITY_ACK` in the commit message.
- **Killswitch**: `SEC_GATE_WF_CHANGES_DISABLED=true`

### 2. Secret Leak Prevention
- **Gate**: `security/gates/gate_secret_leaks.sh`
- **Enforcement**: Scans diffs for common secret patterns (AWS, GitHub, Slack).
- **Killswitch**: `SEC_GATE_SECRET_LEAKS_DISABLED=true`

### 3. Fork Safety
- **Gate**: `security/gates/gate_fork_actions_safety.sh`
- **Enforcement**: Blocks workflow changes coming from external forks.
- **Killswitch**: `SEC_GATE_FORK_SAFETY_DISABLED=true`

### 4. Dependency Governance
- **Gate**: `security/gates/gate_dependency_allowlist.py`
- **Policy**: `security/policy/dependency_allowlist.json`
- **Enforcement**: Ensures all dependencies are allowlisted and documented in `deps/dependency_delta.md`.
- **Killswitch**: `SEC_GATE_DEPS_DISABLED=true`

### 5. Innovation Lane (Flagged OFF)
- **ALAP**: Agent Least-Authority Profiles (`security/agent/`). Enable with `SEC_AGENT_ALAP_ENABLED=true`.
- **Heuristics**: Suspicious diff alerts (`security/heuristics/`). Enable with `SEC_SUSPICIOUS_DIFF_ALERTS=true`.

## Emergency Killswitch (Master)
To disable all RDP gates in an emergency, set:
`SEC_RDP_ALL_DISABLED=true` (Implementation pending in master wrapper)

## Incident Response
Refer to `security/runbooks/incident_repo_compromise.md` for procedures during a suspected compromise.
