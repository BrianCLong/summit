Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Refusal Matrix & Boundaries

**Mission:** Define explicit non-goals and prohibited uses for Summit capabilities.

## 1. Permanent Refusal Categories

The following uses are **strictly prohibited** and hard-coded as refusals in the system policy (`policy/stewardship.rego`):

| Category                                 | Definition                                                                                                             | Enforcement Mechanism                 |
| :--------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------ |
| **Coercive Population Control**          | Systems designed to suppress dissent, enforce arbitrary compliance, or violate fundamental human rights at scale.      | OPA Policy: `deny_population_control` |
| **Autonomous Lethal Decision**           | Systems that authorize or execute lethal force without meaningful, real-time human intervention.                       | OPA Policy: `deny_lethal_autonomy`    |
| **Covert Mass Persuasion**               | Undeclared, large-scale psychological operations intended to manipulate public opinion without attribution ("PsyOps"). | OPA Policy: `deny_covert_influence`   |
| **Unverifiable Intelligence Laundering** | Injecting false or misleading data into intelligence streams to deceive allies or the public.                          | OPA Policy: `deny_intel_laundering`   |

## 2. Conditional Refusals

Services may be refused based on:

- **Context:** High-risk environments where safeguards cannot be guaranteed.
- **Misuse:** Detected patterns of abuse or violation of Terms of Service.
- **Lack of Attribution:** Requests that refuse to identify the originating entity.

## 3. Public vs. Private Articulation

- **Public:** We publish our refusal categories transparently (this document).
- **Private:** Specific client refusals are handled via the Authority Escalation Flow to protect sensitive context while maintaining a firm "no".

## 4. Enforcement Implementation

Refusals are not just policy; they are code.

- **Configuration:** `server/src/config/stewardship.ts` defines the `RefusalMatrix`.
- **Logic:** OPA policies evaluate request context against this matrix.
- **Audit:** All refusals are logged to the `ProvenanceLedger` with a `REFUSAL_EVENT` tag.

---

_Maintained by: Refusal & Boundaries Agent_
