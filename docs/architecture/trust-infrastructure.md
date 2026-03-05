# Trust Infrastructure for AI Agents

## Goal

"Trust infrastructure" wraps an agent with identity, policy, monitoring, and audit so *every* high-risk action is: **authorized → simulated → policy-checked → signed → executed → observed → audited**, with kill switches at multiple points.

## A) High-level architecture (control plane vs data plane)

```text
                        ┌───────────────────────────────────────────┐
                        │                CONTROL PLANE               │
                        │                                           │
Human/Org Admin  ─────► │  Policy Authoring UI  ─► Policy Store      │
                        │            │              (versioned)      │
                        │            ▼                               │
                        │  Policy Decision Point (PDP)               │
                        │   - OPA/Rego or Cedar                      │
                        │   - Spending limits, allowlists, roles     │
                        │   - Required approvals / dual-control      │
                        │                                           │
                        │  Identity & Credential Authority           │
                        │   - Agent DID / keys / VC issuance         │
                        │   - Revocation / rotation / kill switch    │
                        │                                           │
                        │  Risk Models / Rules Config                │
                        │   - anomaly thresholds, heuristics         │
                        └───────────────────────────────────────────┘

                        ┌───────────────────────────────────────────┐
                        │                 DATA PLANE                 │
                        │                                           │
Agent Core Logic ─────► │  Orchestrator / Runner                     │
(planner/tools)         │   - creates "Intent" objects               │
                        │   - state machine (draft→approved→exec)    │
                        │                 │                          │
                        │                 ▼                          │
                        │  Policy Enforcement Point (PEP)            │
                        │   - sits *between agent + execution*       │
                        │   - blocks / rate limits / requires human  │
                        │                 │                          │
                        │                 ▼                          │
                        │  Pre-Execution Simulator                   │
                        │   - dry run, gas/fee est, counterparty     │
                        │   - replay protection checks               │
                        │                 │                          │
                        │                 ▼                          │
                        │  Real-time Risk Monitor (inline)           │
                        │   - features from intent+context           │
                        │   - anomaly detection                      │
                        │   - circuit breaker trips                  │
                        │                 │                          │
                        │                 ▼                          │
                        │  Secure Signing Service (HSM/KMS/TEE)       │
                        │   - enforces identity + policy at sign time │
                        │   - never exposes private keys to agent     │
                        │                 │                          │
                        │                 ▼                          │
                        │  Execution Connector                        │
                        │   - chain RPC / bank API / payment rail     │
                        │                                           │
                        │  Async Audit & Evidence Pipeline           │
                        │   - immutable event log + SIEM + OL traces │
                        │   - attestations, receipts, reconciliation │
                        └───────────────────────────────────────────┘
```

## B) Where policy engines + circuit breakers sit relative to agent logic

* **Policy Decision Point (PDP)** lives in the **control plane** (central policy brain).
* **Policy Enforcement Point (PEP)** lives in the **data plane** *directly in front of execution*.
* **Circuit breakers** exist in *multiple layers*, but the **most important breaker** is:

  1. **PEP breaker**: blocks intent before signing
  2. **Signer breaker**: refuses to sign if policy/risk not satisfied
  3. **Connector breaker**: rate-limits / halts broadcasting if environment degrades

**Key rule:** the agent never "directly executes" transactions. It only emits **Intents**.

## C) How the identity layer integrates before a transaction is signed or broadcast

**Identity must gate the signer.** Flow:

1. Agent produces an **Intent** with:

   * `agent_id`
   * `intent_id`
   * `purpose`
   * `amount`
   * `destination`
   * `requested_capabilities`
2. PEP calls PDP: "Is agent X allowed to do Y under policy version P?"
3. **Signer** checks:

   * agent credential validity (VC / token / mTLS)
   * key binding to agent identity
   * revocation status / kill switch
   * policy decision + risk verdict
4. Only signer produces:

   * `signature`
   * `attestation` (policy version, decision hash, risk score)
5. Connector broadcasts with attached receipts.

**Do not store signing keys in agent runtime.** Put them behind:

* KMS/HSM, TEE enclave, or custodial signer service.

## D) Real-time risk monitoring vs asynchronous audit trails

**Real-time (inline / synchronous):**

* Runs *before signing* (and sometimes *before simulation*).
* Inputs: intent features + session context + historical reputation signal.
* Output: allow / step-up / block + reason codes.
* Must be **low latency** and designed to fail safe (block on error).

**Asynchronous (post-fact / forensic):**

* Immutable append-only event log (e.g., ledger, WORM storage, or signed log chain).
* OTEL traces + metrics (span attributes like `agent.id`, `policy.version`, `decision.hash`, `risk.score`, `intent.id`, `tx.hash`).
* Reconciliation jobs, compliance reporting, anomaly retrospectives.

## E) Concrete request lifecycle (the "intent → exec" state machine)

```text
DRAFT Intent
  → POLICY_CHECK (PDP)
    → SIMULATE
      → RISK_SCORE (inline)
        → APPROVAL? (optional step-up)
          → SIGN (Signer service)
            → BROADCAST (Connector)
              → CONFIRM/SETTLE
                → AUDIT/ATTEST (async)
```

## F) Minimal components list (implementation-friendly)

* **Agent Runtime** (your planner/tools)
* **Orchestrator** (creates intents; manages retries)
* **PEP** (API gateway / internal service that blocks execution)
* **PDP** (OPA/Cedar; versioned policies; reason codes)
* **Risk Engine** (inline scoring; anomaly detection; breaker)
* **Signer** (KMS/HSM-backed; policy-aware; attestation emitter)
* **Connector** (RPC/API; idempotent; reconciliation hooks)
* **Audit Log** (append-only + integrity proofs)
* **Observability** (OTEL traces + metrics + logs; SIEM export)

## G) Summit mapping suggestion (quick)

* Treat **Intent** as your deterministic "evidence-first" unit.
* Store:

  * `intent.json` (deterministic)
  * `decision.json` (policy hash, rule ids)
  * `risk.json` (score, features hash)
  * `receipt.json` (tx hash, confirmations)
  * `stamp.json` (runtime-only)

## Two key guardrails

1. **Signer is the ultimate enforcement point** (even if PEP fails, signer refuses).
2. **Policy versions are immutable + referenced everywhere** (audit trace is meaningless otherwise).
