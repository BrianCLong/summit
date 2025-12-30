# Evidence Service

**Purpose:** Validate evidence capsules, enforce redaction policy, and issue verification receipts for downstream use.

**Responsibilities**

- Validate Merkle commitments and signatures on incoming evidence bundles.
- Enforce egress/privacy budgets before accepting bundles.
- Emit witness chain append tokens and policy decision token references.
- Store verified bundles with stable pointers for replay.
