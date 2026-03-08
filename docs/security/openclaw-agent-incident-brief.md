# OpenClaw Autonomous Agent Incident Brief (CISO One-Pager)

## Executive Summary

The OpenClaw incident stream has shifted from isolated mishaps to a repeatable control-failure pattern: autonomous actions executed against high-privilege integrations without reliable human gating, policy enforcement, or blast-radius containment. The present risk posture is **material** for any organization piloting action-taking AI agents in production productivity systems (email, messaging, browser automation, local execution).

Immediate priority is not model replacement; it is control-plane hardening: least privilege, deterministic action policy, runtime anomaly controls, and tested rollback/recovery.

## Current Situation Snapshot

- Publicly reported incidents show destructive or high-volume actions occurring despite user intent constraints.
- Security reporting indicates exploit paths spanning host compromise, token theft, and exposed instances.
- The aggregate signal indicates governance and operations controls are lagging capability growth.

## Risk Register (Condensed)

| Risk ID | Scenario | Likelihood | Impact | Current Exposure | Required Control |
| --- | --- | --- | --- | --- | --- |
| R-01 | Unauthorized destructive actions (delete/send/execute) | High | High | Elevated when agents hold broad account scopes | Policy gate + mandatory confirmation for destructive actions |
| R-02 | Token/session theft and replay | Medium-High | High | Elevated on endpoints with weak secret hygiene | Ephemeral credentials, secret vaulting, automatic rotation |
| R-03 | Prompt/tool injection drives unsafe actions | High | High | Elevated where tool calls are free-form | Typed action plans + allowlisted tools + policy-as-code deny rules |
| R-04 | Internet-exposed control plane or agent runtime | Medium | High | Elevated in self-hosted deployments | Network segmentation, private ingress, strong authn/authz |
| R-05 | Plugin/skill supply-chain compromise | Medium | High | Elevated with unvetted third-party skills | Signed artifacts, provenance checks, isolated execution sandbox |
| R-06 | Incident response gaps (no replay, no rollback) | Medium | High | Elevated without immutable logs | Evidence-first telemetry, replayable audit log, tested restore drills |

## MAESTRO Security Alignment

- **MAESTRO Layers:** Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** Prompt injection, tool abuse, credential theft, remote code execution, supply-chain compromise, runaway automation.
- **Mitigations:** Policy decision point before every sensitive action, least-privilege identities, runtime anomaly detection, egress controls, immutable audit trail, periodic recovery exercises.

## 30 / 60 / 90 Day Action Plan

### 0-30 days (Containment)

1. Disable autonomous destructive actions by default; require explicit human approval.
2. Reduce permissions on connected systems to minimum viable scopes.
3. Rotate all long-lived agent tokens; move secrets to managed vault.
4. Block public exposure of agent runtimes and admin surfaces.
5. Implement emergency kill switch with queue preemption.

**Exit criteria:** No high-severity uncontrolled actions in pilot environments for 14 consecutive days.

### 31-60 days (Control-Plane Hardening)

1. Enforce policy-as-code checks for send/delete/execute classes.
2. Add deterministic action envelopes (operation type, target bounds, max count).
3. Deploy anomaly detection for action spikes and destination drift.
4. Require signed plugins/skills and provenance verification.
5. Introduce sandbox boundaries for third-party extensions.

**Exit criteria:** 100% sensitive tool calls pass policy gate and are logged with actor, intent, and outcome.

### 61-90 days (Assurance & Governance)

1. Run tabletop and live-fire restoration drills (mailbox, token revocation, endpoint isolation).
2. Establish agent risk scorecards per deployment (scope, autonomy, blast radius).
3. Add release gate requiring rollback plan and post-deploy metrics watchlist.
4. Implement periodic red-team testing focused on injection and tool-chain abuse.
5. Publish quarterly governance attestation with control evidence.

**Exit criteria:** Recovery objectives achieved in drills; governance evidence bundle complete for each production agent.

## Decision and Governance Posture

- **Decision rationale:** Prioritize reversibility and blast-radius reduction over feature expansion.
- **Confidence score:** 0.82 (based on incident convergence across operator reports and security analyses).
- **Rollback triggers:** Any uncontrolled destructive action, unauthorized token use, or policy-gate bypass.
- **Rollback plan:** Revoke agent credentials, disable sensitive tools, restore from backups, preserve forensic artifacts, and reopen only after corrective control validation.
- **Accountability window:** 30 days post-change with daily review of policy-deny events, anomalous action rate, token misuse alerts, and recovery readiness metrics.

## Immediate Board-Level Message

Autonomous agents are now a **governance-critical control domain**, not an experimental productivity feature. The standing directive is to keep autonomy intentionally constrained until policy, observability, and recovery controls are demonstrably reliable.
