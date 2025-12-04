# Summit Governance Policies

This document explains each OPA policy package and how it is used.

---

## `summit.deploy`

**Purpose:** Gate production deploys.

**Key rules:**

- `allow` – permits deploy to `env == "prod"` only when:
  - `pr.approvals >= 2`
  - SBOM is present and `signed == true`
  - `security.failures` is empty

**Call site:**

- CI: `.github/workflows/governance.yml` → `policy-eval` job

---

## `summit.pr`

**Purpose:** Gate PR merges.

**Key rules:**

- `allow_merge` – permits merge when:
  - at least one approval
  - all required checks have not failed
  - label `governance-approved` **or** `security-reviewed` is present

**Inputs:**

- `input.pr.approvals`
- `input.pr.labels`
- `input.pr.checks[]`

---

## `summit.sbom`

**Purpose:** Ensure artifacts do not ship with critical vulnerabilities.

**Key rules:**

- `acceptable` – true when **no component** has a vulnerability with `severity == "CRITICAL"`.
- `deny` – provides a human-readable reason for rejections.

**Inputs:**

- `input.components[]` with `vulnerabilities[]`

---

## `summit.provenance`

**Purpose:** Enforce provenance invariants for sensitive actions.

**Key rules:**

- `valid` – requires:
  - required fields present (id, timestamp, actor, subject)
  - no orphan deploys (a deploy must have `context.commit`)

- `deny` – emits reasons such as:
  - "deploy provenance event missing commit context"

**Inputs:**

- A single provenance event, usually from `provenance-event.schema.json`

---

## `summit.access`

**Purpose:** Control who may perform governance actions.

**Key rules:**

- `allow` – true if:
  - `actor.type == "user"` and has role `governance-admin`, or
  - `actor.type == "service"` and has role `governance-bot`

**Use cases:**

- Controlling who can:
  - override policy
  - mark risk-accepted
  - re-run sensitive workflows

---

## Extending governance

To add a new policy:

1. Create a new `policy/<name>.rego` with a clear package, e.g. `package summit.invariants`.
2. Add tests in `policy/<name>_test.rego`.
3. Wire evaluation into `.github/workflows/governance.yml`.
4. Document it in this file.

All governance changes should go through code review just like application code.
